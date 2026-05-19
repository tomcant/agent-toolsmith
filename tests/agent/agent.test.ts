import { afterEach, beforeEach, describe, expect, setSystemTime, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Agent } from "#/agent";
import { SessionLog } from "#/agent/session/log.ts";
import { ToolRegistry } from "#/agent/tools/registry.ts";
import { LlmClientSpy } from "../doubles/llm-client-spy.ts";
import { collect, makeTool } from "../helpers.ts";

describe("Agent", () => {
  let sessionDir: string;
  let sessionLog: SessionLog;

  beforeEach(async () => {
    sessionDir = await mkdtemp(join(tmpdir(), "session-"));
    sessionLog = new SessionLog(sessionDir);
  });

  afterEach(async () => {
    await rm(sessionDir, { recursive: true, force: true });
    setSystemTime();
  });

  test("runs tool calls and feeds their results back until the model ends its turn", async () => {
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
    const registry = new ToolRegistry();
    const inputsReceivedByTool: unknown[] = [];
    registry.register(
      makeTool("tool-name", {
        execute: async (input) => {
          inputsReceivedByTool.push(input);
          return "result";
        },
      }),
    );
    const agent = new Agent(llm, registry, sessionLog);

    const events = await collect(agent.turn("User message"));

    expect(events).toEqual([
      { type: "text", text: "Reply 1" },
      { type: "tool_call", id: "t1", name: "tool-name", input: { key: "value" } },
      { type: "tool_result", tool_call_id: "t1", content: "result", is_error: false },
      { type: "text", text: "Reply 2" },
    ]);
    expect(inputsReceivedByTool).toEqual([{ key: "value" }]);
    expect(llm.calls[0]?.tools).toMatchObject([
      { name: "tool-name", description: "description", inputSchema: { type: "object" } },
    ]);
    expect(llm.calls[1]?.tools).toMatchObject([
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
        content: [{ type: "tool_result", tool_call_id: "t1", content: "result", is_error: false }],
      },
    ]);
  });

  test("reports failing tools to the caller and keeps going until the model ends its turn", async () => {
    const llm = new LlmClientSpy([
      [
        { type: "tool_call", id: "t1", name: "tool-name", input: {} },
        { type: "tool_call", id: "t2", name: "missing", input: {} },
        {
          type: "complete",
          response: [
            { type: "tool_call", id: "t1", name: "tool-name", input: {} },
            { type: "tool_call", id: "t2", name: "missing", input: {} },
          ],
        },
      ],
      [
        { type: "text_delta", text: "Reply" },
        { type: "complete", response: [{ type: "text", text: "Reply" }] },
      ],
    ]);
    const registry = new ToolRegistry();
    registry.register(
      makeTool("tool-name", {
        execute: async () => {
          throw new Error("error");
        },
      }),
    );
    const agent = new Agent(llm, registry, sessionLog);

    const events = await collect(agent.turn("User message"));

    expect(events).toEqual([
      { type: "tool_call", id: "t1", name: "tool-name", input: {} },
      { type: "tool_call", id: "t2", name: "missing", input: {} },
      { type: "tool_result", tool_call_id: "t1", content: "error", is_error: true },
      {
        type: "tool_result",
        tool_call_id: "t2",
        content: "Unknown tool: missing",
        is_error: true,
      },
      { type: "text", text: "Reply" },
    ]);
  });

  test("streams assistant text through the turn events", async () => {
    const llm = new LlmClientSpy([
      [
        { type: "text_delta", text: "Re" },
        { type: "text_delta", text: "ply" },
        { type: "complete", response: [{ type: "text", text: "Reply" }] },
      ],
    ]);
    const agent = new Agent(llm, new ToolRegistry(), sessionLog);
    setSystemTime(new Date("2026-04-22T12:00:00.000Z"));

    const events = await collect(agent.turn("User message"));

    expect(events).toEqual([
      { type: "text", text: "Re" },
      { type: "text", text: "ply" },
    ]);
  });

  test("tools registered during a turn are immediately available", async () => {
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
    const registry = new ToolRegistry();
    registry.register(
      makeTool("register-tool", {
        execute: async () => {
          registry.register(makeTool("new-tool"));
          return "";
        },
      }),
    );
    const agent = new Agent(llm, registry, sessionLog);

    await collect(agent.turn("User message"));

    expect(llm.calls[0]?.tools?.map((t) => t.name)).toEqual(["register-tool"]);
    expect(llm.calls[1]?.tools?.map((t) => t.name)).toEqual(["register-tool", "new-tool"]);
  });

  test("agent activities are recorded in the session log", async () => {
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
    const registry = new ToolRegistry();
    registry.register(makeTool("tool-name", { execute: async () => "result" }));
    const agent = new Agent(llm, registry, sessionLog);
    setSystemTime(new Date("2026-04-22T12:00:00.000Z"));

    await collect(agent.turn("User message"));

    expect(await readSessionLog(sessionDir)).toEqual([
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
        content: [{ type: "tool_result", tool_call_id: "t1", content: "result", is_error: false }],
      },
      {
        time: "2026-04-22T12:00:00.000Z",
        role: "assistant",
        content: [{ type: "text", text: "Reply 2" }],
      },
    ]);
  });

  test("a failed turn does not appear in the conversation", async () => {
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
    const agent = new Agent(llm, new ToolRegistry(), sessionLog);

    await collect(agent.turn("User message 1"));
    await expect(collect(agent.turn("User message 2"))).rejects.toThrow("error");
    await collect(agent.turn("User message 3"));

    expect(llm.calls[2]?.messages).toEqual([
      { role: "user", content: [{ type: "text", text: "User message 1" }] },
      { role: "assistant", content: [{ type: "text", text: "Reply" }] },
      { role: "user", content: [{ type: "text", text: "User message 3" }] },
    ]);
  });

  test("an error during a turn is recorded in the session log", async () => {
    const llm = new LlmClientSpy([new Error("error")]);
    const agent = new Agent(llm, new ToolRegistry(), sessionLog);
    setSystemTime(new Date("2026-04-22T12:00:00.000Z"));

    await expect(collect(agent.turn("User message"))).rejects.toThrow("error");

    expect(await readSessionLog(sessionDir)).toEqual([
      {
        time: "2026-04-22T12:00:00.000Z",
        role: "user",
        content: [{ type: "text", text: "User message" }],
      },
      { time: "2026-04-22T12:00:00.000Z", kind: "error", message: "error" },
    ]);
  });
});

async function readSessionLog(sessionDir: string): Promise<unknown[]> {
  const contents = await Bun.file(join(sessionDir, "session.jsonl")).text();
  return contents
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l));
}
