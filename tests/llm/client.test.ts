import { describe, expect, test } from "bun:test";
import { LlmClient } from "#/llm/client.ts";
import { AnthropicSpy } from "../doubles/anthropic-spy.ts";

describe("LlmClient", () => {
  test("returns the assistant's reply as a message", async () => {
    const anthropic = new AnthropicSpy([
      [
        { type: "text", text: "Hello, " },
        { type: "text", text: "Tom." },
      ],
    ]);
    const client = new LlmClient(anthropic.sdk, "model");

    const reply = await client.send([{ role: "user", content: [{ type: "text", text: "Hello" }] }]);

    expect(reply).toEqual({
      role: "assistant",
      content: [
        { type: "text", text: "Hello, " },
        { type: "text", text: "Tom." },
      ],
    });
  });

  test("propagates errors to the caller", async () => {
    const anthropic = new AnthropicSpy([new Error("error")]);
    const client = new LlmClient(anthropic.sdk, "model");

    const attempt = client.send([{ role: "user", content: [{ type: "text", text: "Hello" }] }]);

    await expect(attempt).rejects.toThrow("error");
  });

  test("sends the configured model, token cap, and messages to the SDK", async () => {
    const anthropic = new AnthropicSpy(["ok"]);
    const client = new LlmClient(anthropic.sdk, "claude-test-model");

    await client.send([{ role: "user", content: [{ type: "text", text: "Hello" }] }]);

    expect(anthropic.calls).toEqual([
      {
        model: "claude-test-model",
        max_tokens: 8192,
        messages: [{ role: "user", content: [{ type: "text", text: "Hello" }] }],
      },
    ]);
  });
});
