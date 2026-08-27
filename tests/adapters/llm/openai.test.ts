import { describe, expect, test } from "bun:test";
import OpenAI from "openai";
import { OpenAiLlmClient } from "#/adapters/llm/openai.ts";
import { sseFetchSpy } from "../../doubles/sse-fetch-spy.ts";
import { collect, makeTool } from "../../helpers.ts";

const message = (text: string) => ({
  type: "message",
  id: "msg_1",
  role: "assistant",
  status: "completed",
  content: [{ type: "output_text", text, annotations: [] }],
});

const functionCall = (args: string) => ({
  type: "function_call",
  id: "fc_1",
  call_id: "t1",
  name: "tool-name",
  arguments: args,
  status: "completed",
});

const completed = (output: unknown[]) => ({
  event: "response.completed",
  data: {
    type: "response.completed",
    sequence_number: 99,
    response: {
      id: "resp_1",
      object: "response",
      status: "completed",
      model: "model",
      output,
    },
  },
});

describe("OpenAI LLM client", () => {
  test("streams text deltas and tool calls, then emits the assembled response", async () => {
    const fetch = sseFetchSpy([
      [
        {
          event: "response.output_item.added",
          data: {
            type: "response.output_item.added",
            output_index: 0,
            item: { ...message(""), content: [] },
          },
        },
        {
          event: "response.output_text.delta",
          data: {
            type: "response.output_text.delta",
            output_index: 0,
            content_index: 0,
            item_id: "msg_1",
            delta: "Hello",
          },
        },
        {
          event: "response.output_text.delta",
          data: {
            type: "response.output_text.delta",
            output_index: 0,
            content_index: 0,
            item_id: "msg_1",
            delta: ", ",
          },
        },
        {
          event: "response.output_item.done",
          data: {
            type: "response.output_item.done",
            output_index: 0,
            item: message("Hello, "),
          },
        },
        {
          event: "response.output_item.added",
          data: {
            type: "response.output_item.added",
            output_index: 1,
            item: functionCall(""),
          },
        },
        {
          event: "response.function_call_arguments.delta",
          data: {
            type: "response.function_call_arguments.delta",
            output_index: 1,
            item_id: "fc_1",
            delta: '{"key":',
          },
        },
        {
          event: "response.function_call_arguments.delta",
          data: {
            type: "response.function_call_arguments.delta",
            output_index: 1,
            item_id: "fc_1",
            delta: '"value"}',
          },
        },
        {
          event: "response.output_item.done",
          data: {
            type: "response.output_item.done",
            output_index: 1,
            item: functionCall('{"key":"value"}'),
          },
        },
        {
          event: "response.output_item.added",
          data: {
            type: "response.output_item.added",
            output_index: 2,
            item: { ...message(""), id: "msg_2", content: [] },
          },
        },
        {
          event: "response.output_text.delta",
          data: {
            type: "response.output_text.delta",
            output_index: 2,
            content_index: 0,
            item_id: "msg_2",
            delta: "Tom.",
          },
        },
        {
          event: "response.output_item.done",
          data: {
            type: "response.output_item.done",
            output_index: 2,
            item: { ...message("Tom."), id: "msg_2" },
          },
        },
        completed([message("Hello, "), functionCall('{"key":"value"}'), message("Tom.")]),
      ],
    ]);
    const sdk = new OpenAI({ apiKey: "key", fetch });
    const client = new OpenAiLlmClient(sdk, "model");

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
    const fetch = sseFetchSpy([[completed([message("Hello")])]]);
    const sdk = new OpenAI({ apiKey: "key", fetch });
    const client = new OpenAiLlmClient(sdk, "gpt-test-model", "System prompt");
    const tools = [makeTool("tool-name")];

    await collect(
      client.send([{ role: "user", content: [{ type: "text", text: "User message" }] }], tools),
    );

    const body = fetch.calls[0]?.body as Record<string, unknown>;
    expect(body?.model).toBe("gpt-test-model");
    expect(body?.stream).toBe(true);
    expect(body?.instructions).toBe("System prompt");
    expect(body?.input).toEqual([{ role: "user", content: "User message" }]);
    expect(body?.tools).toEqual([
      {
        type: "function",
        name: "tool-name",
        description: "description",
        parameters: { type: "object" },
        strict: false,
      },
    ]);
  });

  test("translates message content parts to the SDK's wire format", async () => {
    const fetch = sseFetchSpy([[completed([message("Hello")])]]);
    const sdk = new OpenAI({ apiKey: "key", fetch });
    const client = new OpenAiLlmClient(sdk, "gpt-test-model");

    await collect(
      client.send([
        { role: "user", content: [{ type: "text", text: "User message" }] },
        {
          role: "assistant",
          content: [{ type: "tool_call", id: "t1", name: "tool-name", input: { key: "value" } }],
        },
        {
          role: "user",
          content: [{ type: "tool_result", toolCallId: "t1", content: "result", isError: true }],
        },
      ]),
    );

    const body = fetch.calls[0]?.body as Record<string, unknown>;
    expect(body?.input).toEqual([
      { role: "user", content: "User message" },
      {
        type: "function_call",
        call_id: "t1",
        name: "tool-name",
        arguments: '{"key":"value"}',
      },
      { type: "function_call_output", call_id: "t1", output: "result" },
    ]);
  });

  test("raises the API's error message when the response fails", async () => {
    const fetch = sseFetchSpy([
      [
        {
          event: "response.failed",
          data: {
            type: "response.failed",
            sequence_number: 1,
            response: {
              id: "resp_1",
              object: "response",
              status: "failed",
              model: "model",
              output: [],
              error: { code: "server_error", message: "Something went wrong" },
            },
          },
        },
      ],
    ]);
    const sdk = new OpenAI({ apiKey: "key", fetch });
    const client = new OpenAiLlmClient(sdk, "model");

    const send = collect(
      client.send([{ role: "user", content: [{ type: "text", text: "User message" }] }]),
    );

    expect(send).rejects.toThrow("Something went wrong");
  });
});
