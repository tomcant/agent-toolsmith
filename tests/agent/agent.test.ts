import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, test } from "bun:test";
import { Agent } from "#/agent/agent.ts";
import { LlmClient } from "#/llm/client.ts";
import { ToolRegistry } from "#/tools/registry.ts";
import { AnthropicSpy } from "../doubles/anthropic-spy.ts";

async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const items: T[] = [];
  for await (const item of iterable) items.push(item);
  return items;
}

describe("Agent", () => {
  test("runs tool calls and feeds their results back until the model ends its turn", async () => {
    const anthropic = new AnthropicSpy([
      {
        content: [
          { type: "text", text: "Reply 1" },
          { type: "tool_use", id: "t1", name: "tool-name", input: { key: "value" } },
        ],
        stop_reason: "tool_use",
      },
      {
        content: [{ type: "text", text: "Reply 2" }],
        stop_reason: "end_turn",
      },
    ]);
    const registry = new ToolRegistry();
    const inputsReceivedByTool: unknown[] = [];
    registry.register({
      name: "tool-name",
      description: "description",
      input_schema: { type: "object" },
      execute: async (input) => {
        inputsReceivedByTool.push(input);
        return "result";
      },
    });
    const agent = new Agent(new LlmClient(anthropic.sdk, "model"), registry);

    const events = await collect(agent.turn("User message"));

    expect(events).toEqual([
      { type: "text", text: "Reply 1" },
      { type: "tool_call", id: "t1", name: "tool-name", input: { key: "value" } },
      { type: "tool_result", id: "t1", content: "result", is_error: false },
      { type: "text", text: "Reply 2" },
    ]);
    expect(inputsReceivedByTool).toEqual([{ key: "value" }]);
    const registeredTools: Anthropic.Tool[] = [
      { name: "tool-name", description: "description", input_schema: { type: "object" } },
    ];
    expect(anthropic.calls[0]?.tools).toEqual(registeredTools);
    expect(anthropic.calls[1]?.tools).toEqual(registeredTools);
    expect(anthropic.calls[1]?.messages).toEqual([
      {
        role: "user",
        content: [{ type: "text", text: "User message" }],
      },
      {
        role: "assistant",
        content: [
          { type: "text", text: "Reply 1" },
          { type: "tool_use", id: "t1", name: "tool-name", input: { key: "value" } },
        ],
      },
      {
        role: "user",
        content: [{ type: "tool_result", tool_use_id: "t1", content: "result", is_error: false }],
      },
    ]);
  });

  test("reports failing tools to the caller and keeps going until the model ends its turn", async () => {
    const anthropic = new AnthropicSpy([
      {
        content: [
          { type: "tool_use", id: "t1", name: "tool-name", input: {} },
          { type: "tool_use", id: "t2", name: "missing-tool", input: {} },
        ],
        stop_reason: "tool_use",
      },
      {
        content: [{ type: "text", text: "Reply" }],
        stop_reason: "end_turn",
      },
    ]);
    const registry = new ToolRegistry();
    registry.register({
      name: "tool-name",
      description: "description",
      input_schema: { type: "object" },
      execute: async () => {
        throw new Error("error");
      },
    });
    const agent = new Agent(new LlmClient(anthropic.sdk, "model"), registry);

    const events = await collect(agent.turn("User message"));

    expect(events).toEqual([
      { type: "tool_call", id: "t1", name: "tool-name", input: {} },
      { type: "tool_call", id: "t2", name: "missing-tool", input: {} },
      { type: "tool_result", id: "t1", content: "error", is_error: true },
      { type: "tool_result", id: "t2", content: "Unknown tool: missing-tool", is_error: true },
      { type: "text", text: "Reply" },
    ]);
  });

  test("a failed turn does not appear in the conversation", async () => {
    const anthropic = new AnthropicSpy(["Reply", new Error("error")]);
    const agent = new Agent(new LlmClient(anthropic.sdk, "model"), new ToolRegistry());

    await collect(agent.turn("User message 1"));
    await expect(collect(agent.turn("User message 2"))).rejects.toThrow("error");
    await collect(agent.turn("User message 3"));

    expect(anthropic.calls[2]?.messages).toEqual([
      { role: "user", content: [{ type: "text", text: "User message 1" }] },
      { role: "assistant", content: [{ type: "text", text: "Reply" }] },
      { role: "user", content: [{ type: "text", text: "User message 3" }] },
    ]);
  });
});
