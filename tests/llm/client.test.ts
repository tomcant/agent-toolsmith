import { describe, expect, test } from "bun:test";
import { LlmClient } from "#/llm/client.ts";
import { AnthropicSpy } from "../doubles/anthropic-spy.ts";
import { makeTool } from "../helpers.ts";

describe("LlmClient", () => {
  test("translates the SDK response into a message with a stop reason", async () => {
    const anthropic = new AnthropicSpy([
      {
        content: [
          { type: "text", text: "Hello, " },
          { type: "thinking", thinking: "Reasoning..." },
          { type: "tool_use", id: "t1", name: "tool-name", input: {} },
          { type: "text", text: "Tom." },
        ],
        stop_reason: "tool_use",
      },
    ]);
    const client = new LlmClient(anthropic.sdk, "model");

    const reply = await client.send([
      { role: "user", content: [{ type: "text", text: "User message" }] },
    ]);

    expect(reply).toEqual({
      message: {
        role: "assistant",
        content: [
          { type: "text", text: "Hello, " },
          { type: "tool_use", id: "t1", name: "tool-name", input: {} },
          { type: "text", text: "Tom." },
        ],
      },
      stop_reason: "tool_use",
    });
  });

  test("propagates errors to the caller", async () => {
    const anthropic = new AnthropicSpy([new Error("error")]);
    const client = new LlmClient(anthropic.sdk, "model");

    const attempt = client.send([
      { role: "user", content: [{ type: "text", text: "User message" }] },
    ]);

    await expect(attempt).rejects.toThrow("error");
  });

  test("forwards the model, messages, and tools to the SDK", async () => {
    const anthropic = new AnthropicSpy();
    const client = new LlmClient(anthropic.sdk, "claude-test-model", "System prompt");
    const tools = [makeTool("tool-name")];

    await client.send([{ role: "user", content: [{ type: "text", text: "User message" }] }], tools);

    expect(anthropic.calls[0]?.model).toBe("claude-test-model");
    expect(anthropic.calls[0]?.system).toBe("System prompt");
    expect(anthropic.calls[0]?.messages).toEqual([
      { role: "user", content: [{ type: "text", text: "User message" }] },
    ]);
    expect(anthropic.calls[0]?.tools).toEqual([
      { name: "tool-name", description: "description", input_schema: { type: "object" } },
    ]);
  });
});
