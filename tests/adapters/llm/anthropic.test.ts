import { describe, expect, test } from "bun:test";
import Anthropic from "@anthropic-ai/sdk";
import { AnthropicLlmClient } from "#/adapters/llm/anthropic.ts";
import { sseFetchSpy } from "../../doubles/sse-fetch-spy.ts";
import { collect, makeTool } from "../../helpers.ts";

describe("AnthropicLlmClient", () => {
  test("streams text deltas and tool calls, then emits the assembled response", async () => {
    const fetch = sseFetchSpy([
      [
        {
          event: "message_start",
          data: {
            type: "message_start",
            message: {
              id: "msg_1",
              type: "message",
              role: "assistant",
              model: "model",
              content: [],
              stop_reason: null,
              stop_sequence: null,
              usage: { input_tokens: 1, output_tokens: 1 },
            },
          },
        },
        {
          event: "content_block_start",
          data: {
            type: "content_block_start",
            index: 0,
            content_block: { type: "text", text: "" },
          },
        },
        {
          event: "content_block_delta",
          data: {
            type: "content_block_delta",
            index: 0,
            delta: { type: "text_delta", text: "Hello" },
          },
        },
        {
          event: "content_block_delta",
          data: {
            type: "content_block_delta",
            index: 0,
            delta: { type: "text_delta", text: ", " },
          },
        },
        {
          event: "content_block_stop",
          data: { type: "content_block_stop", index: 0 },
        },
        {
          event: "content_block_start",
          data: {
            type: "content_block_start",
            index: 1,
            content_block: { type: "tool_use", id: "t1", name: "tool-name", input: {} },
          },
        },
        {
          event: "content_block_delta",
          data: {
            type: "content_block_delta",
            index: 1,
            delta: { type: "input_json_delta", partial_json: '{"key":' },
          },
        },
        {
          event: "content_block_delta",
          data: {
            type: "content_block_delta",
            index: 1,
            delta: { type: "input_json_delta", partial_json: '"value"}' },
          },
        },
        {
          event: "content_block_stop",
          data: { type: "content_block_stop", index: 1 },
        },
        {
          event: "content_block_start",
          data: {
            type: "content_block_start",
            index: 2,
            content_block: { type: "text", text: "" },
          },
        },
        {
          event: "content_block_delta",
          data: {
            type: "content_block_delta",
            index: 2,
            delta: { type: "text_delta", text: "Tom." },
          },
        },
        {
          event: "content_block_stop",
          data: { type: "content_block_stop", index: 2 },
        },
        {
          event: "message_delta",
          data: {
            type: "message_delta",
            delta: { stop_reason: "tool_use", stop_sequence: null },
            usage: { output_tokens: 5 },
          },
        },
        {
          event: "message_stop",
          data: { type: "message_stop" },
        },
      ],
    ]);
    const sdk = new Anthropic({ apiKey: "key", fetch });
    const client = new AnthropicLlmClient(sdk, "model");

    const events = await collect(
      client.send([{ role: "user", content: [{ type: "text", text: "User message" }] }]),
    );

    expect(events).toEqual([
      { type: "text_delta", text: "Hello" },
      { type: "text_delta", text: ", " },
      { type: "tool_call", id: "t1", name: "tool-name", input: { key: "value" } },
      { type: "text_delta", text: "Tom." },
      {
        type: "complete",
        response: [
          { type: "text", text: "Hello, " },
          { type: "tool_call", id: "t1", name: "tool-name", input: { key: "value" } },
          { type: "text", text: "Tom." },
        ],
      },
    ]);
  });

  test("forwards the model, messages, and tools to the SDK", async () => {
    const fetch = sseFetchSpy([
      [
        {
          event: "message_start",
          data: {
            type: "message_start",
            message: {
              id: "msg_1",
              type: "message",
              role: "assistant",
              model: "claude-test-model",
              content: [],
              stop_reason: null,
              stop_sequence: null,
              usage: { input_tokens: 1, output_tokens: 1 },
            },
          },
        },
        {
          event: "content_block_start",
          data: {
            type: "content_block_start",
            index: 0,
            content_block: { type: "text", text: "" },
          },
        },
        {
          event: "content_block_stop",
          data: { type: "content_block_stop", index: 0 },
        },
        {
          event: "message_delta",
          data: {
            type: "message_delta",
            delta: { stop_reason: "end_turn", stop_sequence: null },
            usage: { output_tokens: 1 },
          },
        },
        {
          event: "message_stop",
          data: { type: "message_stop" },
        },
      ],
    ]);
    const sdk = new Anthropic({ apiKey: "key", fetch });
    const client = new AnthropicLlmClient(sdk, "claude-test-model", "System prompt");
    const tools = [makeTool("tool-name")];

    await collect(
      client.send([{ role: "user", content: [{ type: "text", text: "User message" }] }], tools),
    );

    const body = fetch.calls[0]?.body as Record<string, unknown>;
    expect(body?.model).toBe("claude-test-model");
    expect(body?.system).toBe("System prompt");
    expect(body?.messages).toEqual([
      { role: "user", content: [{ type: "text", text: "User message" }] },
    ]);
    expect(body?.tools).toEqual([
      { name: "tool-name", description: "description", input_schema: { type: "object" } },
    ]);
  });
});
