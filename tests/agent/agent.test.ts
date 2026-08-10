import { afterEach, beforeEach, describe, expect, setSystemTime, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Agent } from "#/agent";
import { Session } from "#/agent/session.ts";
import { evolve } from "#/agent/tools/builtins/evolve.ts";
import { inspect } from "#/agent/tools/builtins/inspect.ts";
import { ToolRegistry } from "#/agent/tools/registry.ts";
import { ToolStore } from "#/agent/tools/store.ts";
import { LlmClientSpy } from "../doubles/llm-client-spy.ts";
import { collect, makeTool, readSessionLog } from "../helpers.ts";

describe("agent turns", () => {
  let toolDir: string;
  let registry: ToolRegistry;
  let sessionDir: string;
  let sessionPath: string;
  let session: Session;

  beforeEach(async () => {
    toolDir = await mkdtemp(join(tmpdir(), "tools-"));
    registry = new ToolRegistry(new ToolStore(toolDir));
    sessionDir = await mkdtemp(join(tmpdir(), "sessions-"));
    sessionPath = join(sessionDir, "session.jsonl");
    session = new Session(sessionPath);
  });

  afterEach(async () => {
    await rm(toolDir, { recursive: true, force: true });
    await rm(sessionDir, { recursive: true, force: true });
    setSystemTime();
  });

  test("assistant text is streamed", async () => {
    const llm = new LlmClientSpy([
      [
        { type: "text_delta", text: "Re" },
        { type: "text_delta", text: "ply" },
        { type: "complete", response: [{ type: "text", text: "Reply" }] },
      ],
    ]);
    const agent = new Agent(llm, registry, session);

    const events = await collect(agent.turn("User message"));

    expect(events).toEqual([
      { type: "text", text: "Re" },
      { type: "text", text: "ply" },
    ]);
  });

  test("tool calls are executed and their results are fed back to the model", async () => {
    const llm = new LlmClientSpy([
      [
        { type: "text_delta", text: "Reply 1" },
        { type: "tool_call", id: "t1", name: "tool-name", input: { key: "value" } },
        {
          type: "complete",
          response: [
            { type: "text", text: "Reply 1" },
            { type: "tool_call", id: "t1", name: "tool-name", input: { key: "value" } },
          ],
        },
      ],
      [
        { type: "text_delta", text: "Reply 2" },
        { type: "complete", response: [{ type: "text", text: "Reply 2" }] },
      ],
    ]);
    const inputsReceivedByTool: unknown[] = [];
    registry.register(
      makeTool("tool-name", {
        execute: async (input) => {
          inputsReceivedByTool.push(input);
          return "result";
        },
      }),
    );
    const agent = new Agent(llm, registry, session);

    const events = await collect(agent.turn("User message"));

    expect(events).toEqual([
      { type: "text", text: "Reply 1" },
      { type: "tool_call", id: "t1", name: "tool-name", input: { key: "value" } },
      {
        type: "tool_result",
        toolCallId: "t1",
        content: "result",
        isError: false,
        outputFormat: "text",
      },
      { type: "text", text: "Reply 2" },
    ]);
    expect(inputsReceivedByTool).toEqual([{ key: "value" }]);
    expect(llm.calls[0]?.tools).toMatchObject([
      { name: "tool-name", description: "description", inputSchema: { type: "object" } },
    ]);
    expect(llm.calls[1]?.messages).toEqual([
      {
        role: "user",
        content: [{ type: "text", text: "User message" }],
      },
      {
        role: "assistant",
        content: [
          { type: "text", text: "Reply 1" },
          { type: "tool_call", id: "t1", name: "tool-name", input: { key: "value" } },
        ],
      },
      {
        role: "user",
        content: [{ type: "tool_result", toolCallId: "t1", content: "result", isError: false }],
      },
    ]);
  });

  test("tool failures are reported and the turn continues", async () => {
    const llm = new LlmClientSpy([
      [
        { type: "tool_call", id: "t1", name: "throwing-tool", input: {} },
        { type: "tool_call", id: "t2", name: "missing", input: {} },
        {
          type: "complete",
          response: [
            { type: "tool_call", id: "t1", name: "throwing-tool", input: {} },
            { type: "tool_call", id: "t2", name: "missing", input: {} },
          ],
        },
      ],
      [
        { type: "text_delta", text: "Reply" },
        { type: "complete", response: [{ type: "text", text: "Reply" }] },
      ],
    ]);
    registry.register(
      makeTool("throwing-tool", {
        execute: async () => {
          throw new Error("error");
        },
      }),
    );
    const agent = new Agent(llm, registry, session);

    const events = await collect(agent.turn("User message"));

    expect(events).toEqual([
      { type: "tool_call", id: "t1", name: "throwing-tool", input: {} },
      { type: "tool_call", id: "t2", name: "missing", input: {} },
      {
        type: "tool_result",
        toolCallId: "t1",
        content: "error",
        isError: true,
        outputFormat: "text",
      },
      {
        type: "tool_result",
        toolCallId: "t2",
        content: "Unknown tool: missing",
        isError: true,
      },
      { type: "text", text: "Reply" },
    ]);
  });

  test("a tool's output format is emitted with its result but withheld from the model", async () => {
    const llm = new LlmClientSpy([
      [
        { type: "tool_call", id: "t1", name: "markdown-tool", input: {} },
        {
          type: "complete",
          response: [{ type: "tool_call", id: "t1", name: "markdown-tool", input: {} }],
        },
      ],
      [
        { type: "text_delta", text: "Reply" },
        { type: "complete", response: [{ type: "text", text: "Reply" }] },
      ],
    ]);
    registry.register(
      makeTool("markdown-tool", {
        outputFormat: "markdown",
        execute: async () => "| a | b |",
      }),
    );
    const agent = new Agent(llm, registry, session);

    const events = await collect(agent.turn("User message"));

    expect(events).toContainEqual({
      type: "tool_result",
      toolCallId: "t1",
      content: "| a | b |",
      isError: false,
      outputFormat: "markdown",
    });
    expect(llm.calls[1]?.messages.at(-1)).toEqual({
      role: "user",
      content: [{ type: "tool_result", toolCallId: "t1", content: "| a | b |", isError: false }],
    });
  });

  test("tools registered mid-turn are immediately available", async () => {
    const llm = new LlmClientSpy([
      [
        { type: "tool_call", id: "t1", name: "register-tool", input: {} },
        {
          type: "complete",
          response: [{ type: "tool_call", id: "t1", name: "register-tool", input: {} }],
        },
      ],
      [
        { type: "text_delta", text: "Reply" },
        { type: "complete", response: [{ type: "text", text: "Reply" }] },
      ],
    ]);
    registry.register(
      makeTool("register-tool", {
        execute: async () => {
          registry.register(makeTool("new-tool"));
          return "";
        },
      }),
    );
    const agent = new Agent(llm, registry, session);

    await collect(agent.turn("User message"));

    expect(llm.calls[0]?.tools?.map((t) => t.name)).toEqual(["register-tool"]);
    expect(llm.calls[1]?.tools?.map((t) => t.name)).toEqual(["register-tool", "new-tool"]);
  });

  test("turn activity is recorded in the session log", async () => {
    const llm = new LlmClientSpy([
      [
        { type: "text_delta", text: "Reply 1" },
        { type: "tool_call", id: "t1", name: "tool-name", input: { key: "value" } },
        {
          type: "complete",
          response: [
            { type: "text", text: "Reply 1" },
            { type: "tool_call", id: "t1", name: "tool-name", input: { key: "value" } },
          ],
        },
      ],
      [
        { type: "text_delta", text: "Reply 2" },
        { type: "complete", response: [{ type: "text", text: "Reply 2" }] },
      ],
    ]);
    registry.register(makeTool("tool-name", { execute: async () => "result" }));
    const agent = new Agent(llm, registry, session);
    setSystemTime(new Date("2026-04-22T12:00:00.000Z"));

    await collect(agent.turn("User message"));

    expect(await readSessionLog(sessionPath)).toEqual([
      {
        time: "2026-04-22T12:00:00.000Z",
        role: "user",
        content: [{ type: "text", text: "User message" }],
      },
      {
        time: "2026-04-22T12:00:00.000Z",
        role: "assistant",
        content: [
          { type: "text", text: "Reply 1" },
          { type: "tool_call", id: "t1", name: "tool-name", input: { key: "value" } },
        ],
      },
      {
        time: "2026-04-22T12:00:00.000Z",
        role: "user",
        content: [{ type: "tool_result", toolCallId: "t1", content: "result", isError: false }],
      },
      {
        time: "2026-04-22T12:00:00.000Z",
        role: "assistant",
        content: [{ type: "text", text: "Reply 2" }],
      },
    ]);
  });

  test("turn errors are recorded in the session log", async () => {
    const llm = new LlmClientSpy([new Error("error")]);
    const agent = new Agent(llm, registry, session);
    setSystemTime(new Date("2026-04-22T12:00:00.000Z"));

    await expect(collect(agent.turn("User message"))).rejects.toThrow("error");

    expect(await readSessionLog(sessionPath)).toEqual([
      {
        time: "2026-04-22T12:00:00.000Z",
        role: "user",
        content: [{ type: "text", text: "User message" }],
      },
      { time: "2026-04-22T12:00:00.000Z", kind: "error", message: "error" },
    ]);
  });

  test("a stream that ends without a response is reported as an error", async () => {
    const llm = new LlmClientSpy([[{ type: "text_delta", text: "Reply" }]]);
    const agent = new Agent(llm, registry, session);
    setSystemTime(new Date("2026-04-22T12:00:00.000Z"));

    await expect(collect(agent.turn("User message"))).rejects.toThrow(
      "LLM stream ended without a response",
    );

    expect(await readSessionLog(sessionPath)).toEqual([
      {
        time: "2026-04-22T12:00:00.000Z",
        role: "user",
        content: [{ type: "text", text: "User message" }],
      },
      {
        time: "2026-04-22T12:00:00.000Z",
        kind: "error",
        message: "LLM stream ended without a response",
      },
    ]);
  });

  test("failed turns are excluded from the conversation", async () => {
    const llm = new LlmClientSpy([
      [
        { type: "text_delta", text: "Reply" },
        { type: "complete", response: [{ type: "text", text: "Reply" }] },
      ],
      new Error("error"),
      [
        { type: "text_delta", text: "Reply 3" },
        { type: "complete", response: [{ type: "text", text: "Reply 3" }] },
      ],
    ]);
    const agent = new Agent(llm, registry, session);

    await collect(agent.turn("User message 1"));
    await expect(collect(agent.turn("User message 2"))).rejects.toThrow("error");
    await collect(agent.turn("User message 3"));

    expect(llm.calls[2]?.messages).toEqual([
      { role: "user", content: [{ type: "text", text: "User message 1" }] },
      { role: "assistant", content: [{ type: "text", text: "Reply" }] },
      { role: "user", content: [{ type: "text", text: "User message 3" }] },
    ]);
  });

  test("the abort signal is forwarded to the LLM client", async () => {
    const llm = new LlmClientSpy([
      [
        { type: "text_delta", text: "Reply" },
        { type: "complete", response: [{ type: "text", text: "Reply" }] },
      ],
    ]);
    const agent = new Agent(llm, registry, session);
    const controller = new AbortController();

    await collect(agent.turn("User message", controller.signal));

    expect(llm.calls[0]?.signal).toBe(controller.signal);
  });

  test("aborting mid-stream ends the turn gracefully", async () => {
    const llm = new LlmClientSpy([
      [
        { type: "text_delta", text: "Re" },
        { type: "text_delta", text: "ply" },
        { type: "complete", response: [{ type: "text", text: "Reply" }] },
      ],
    ]);
    const agent = new Agent(llm, registry, session);
    const controller = new AbortController();

    const turn = agent.turn("User message", controller.signal);
    const first = await turn.next();
    controller.abort();
    const rest = await collect(turn);

    expect(first.value).toEqual({ type: "text", text: "Re" });
    expect(rest).toEqual([]);
  });

  test("aborting stops pending tool calls without running them", async () => {
    const llm = new LlmClientSpy([
      [
        { type: "tool_call", id: "t1", name: "abort-tool", input: {} },
        { type: "tool_call", id: "t2", name: "other-tool", input: {} },
        {
          type: "complete",
          response: [
            { type: "tool_call", id: "t1", name: "abort-tool", input: {} },
            { type: "tool_call", id: "t2", name: "other-tool", input: {} },
          ],
        },
      ],
    ]);
    const controller = new AbortController();
    let otherToolRan = false;
    registry.register(
      makeTool("abort-tool", {
        execute: async () => {
          controller.abort();
          return "aborted";
        },
      }),
    );
    registry.register(
      makeTool("other-tool", {
        execute: async () => {
          otherToolRan = true;
          return "ran";
        },
      }),
    );
    const agent = new Agent(llm, registry, session);

    const events = await collect(agent.turn("User message", controller.signal));

    expect(events).toEqual([
      { type: "tool_call", id: "t1", name: "abort-tool", input: {} },
      { type: "tool_call", id: "t2", name: "other-tool", input: {} },
      {
        type: "tool_result",
        toolCallId: "t1",
        content: "aborted",
        isError: false,
        outputFormat: "text",
      },
    ]);
    expect(otherToolRan).toBe(false);
    expect(llm.calls).toHaveLength(1);
  });

  test("aborted turns are excluded from the conversation", async () => {
    const llm = new LlmClientSpy([
      [
        { type: "tool_call", id: "t1", name: "abort-tool", input: {} },
        {
          type: "complete",
          response: [{ type: "tool_call", id: "t1", name: "abort-tool", input: {} }],
        },
      ],
      [
        { type: "text_delta", text: "Reply" },
        { type: "complete", response: [{ type: "text", text: "Reply" }] },
      ],
    ]);
    const controller = new AbortController();
    registry.register(
      makeTool("abort-tool", {
        execute: async () => {
          controller.abort();
          return "done";
        },
      }),
    );
    const agent = new Agent(llm, registry, session);

    await collect(agent.turn("User message 1", controller.signal));
    await collect(agent.turn("User message 2"));

    expect(llm.calls[1]?.messages).toEqual([
      { role: "user", content: [{ type: "text", text: "User message 2" }] },
    ]);
  });

  test("aborted turns are recorded in the session log", async () => {
    const llm = new LlmClientSpy([
      [
        { type: "tool_call", id: "t1", name: "abort-tool", input: {} },
        {
          type: "complete",
          response: [{ type: "tool_call", id: "t1", name: "abort-tool", input: {} }],
        },
      ],
    ]);
    const controller = new AbortController();
    registry.register(
      makeTool("abort-tool", {
        execute: async () => {
          controller.abort();
          return "done";
        },
      }),
    );
    const agent = new Agent(llm, registry, session);
    setSystemTime(new Date("2026-04-22T12:00:00.000Z"));

    await collect(agent.turn("User message", controller.signal));

    expect(await readSessionLog(sessionPath)).toEqual([
      {
        time: "2026-04-22T12:00:00.000Z",
        role: "user",
        content: [{ type: "text", text: "User message" }],
      },
      {
        time: "2026-04-22T12:00:00.000Z",
        role: "assistant",
        content: [{ type: "tool_call", id: "t1", name: "abort-tool", input: {} }],
      },
      {
        time: "2026-04-22T12:00:00.000Z",
        role: "user",
        content: [{ type: "tool_result", toolCallId: "t1", content: "done", isError: false }],
      },
      { time: "2026-04-22T12:00:00.000Z", kind: "aborted" },
    ]);
  });

  test("clearing drops earlier turns from the conversation", async () => {
    const llm = new LlmClientSpy([
      [
        { type: "text_delta", text: "Reply 1" },
        { type: "complete", response: [{ type: "text", text: "Reply 1" }] },
      ],
      [
        { type: "text_delta", text: "Reply 2" },
        { type: "complete", response: [{ type: "text", text: "Reply 2" }] },
      ],
    ]);
    const agent = new Agent(llm, registry, session);

    await collect(agent.turn("User message 1"));
    await agent.clear();
    await collect(agent.turn("User message 2"));

    expect(llm.calls[1]?.messages).toEqual([
      { role: "user", content: [{ type: "text", text: "User message 2" }] },
    ]);
  });

  test("clearing is recorded in the session log", async () => {
    const agent = new Agent(new LlmClientSpy([]), registry, session);
    setSystemTime(new Date("2026-04-22T12:00:00.000Z"));

    await agent.clear();

    expect(await readSessionLog(sessionPath)).toEqual([
      { time: "2026-04-22T12:00:00.000Z", kind: "cleared" },
    ]);
  });

  test("registered tools are exposed as metadata", () => {
    registry.register(makeTool("t1", { description: "first" }));
    registry.register(makeTool("t2", { description: "second" }));
    const agent = new Agent(new LlmClientSpy([]), registry, session);

    const tools = agent.listTools();

    expect(tools).toEqual([
      { name: "t1", description: "first", inputSchema: { type: "object" }, outputFormat: "text" },
      { name: "t2", description: "second", inputSchema: { type: "object" }, outputFormat: "text" },
    ]);
  });

  test("builtin tools are hidden from the listed tools", () => {
    registry.register(evolve(registry), { builtin: true });
    registry.register(inspect(registry), { builtin: true });
    registry.register(makeTool("evolved-tool"));
    const agent = new Agent(new LlmClientSpy([]), registry, session);

    expect(agent.listTools().map((t) => t.name)).toEqual(["evolved-tool"]);
  });

  test("model info surfaces the client's provider and model", () => {
    const agent = new Agent(new LlmClientSpy([]), registry, session);

    expect(agent.modelInfo()).toEqual({ provider: "spy", model: "spy-model" });
  });
});
