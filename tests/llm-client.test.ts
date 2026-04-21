import { describe, expect, test } from "bun:test";
import { LlmClient } from "#/llm/client.ts";
import { AnthropicSpy } from "./doubles/anthropic-spy.ts";

describe("LlmClient", () => {
  test("concatenates text blocks in the response into a single reply", async () => {
    const anthropic = new AnthropicSpy([
      [
        { type: "text", text: "Hello, " },
        { type: "text", text: "Tom." },
      ],
    ]);
    const client = new LlmClient(anthropic.sdk, "model");

    const reply = await client.send([{ role: "user", content: "hi" }]);

    expect(reply).toBe("Hello, Tom.");
  });

  test("ignores non-text blocks when extracting the reply", async () => {
    const anthropic = new AnthropicSpy([
      [
        { type: "thinking", thinking: "reasoning..." },
        { type: "text", text: "the answer" },
        { type: "tool_use", id: "t1", name: "noop", input: {} },
      ],
    ]);
    const client = new LlmClient(anthropic.sdk, "model");

    const reply = await client.send([{ role: "user", content: "hi" }]);

    expect(reply).toBe("the answer");
  });

  test("propagates errors to the caller", async () => {
    const anthropic = new AnthropicSpy([new Error("error")]);
    const client = new LlmClient(anthropic.sdk, "model");

    const attempt = client.send([{ role: "user", content: "hi" }]);

    await expect(attempt).rejects.toThrow("error");
  });

  test("sends the configured model, token cap, and messages to the SDK", async () => {
    const anthropic = new AnthropicSpy(["ok"]);
    const client = new LlmClient(anthropic.sdk, "claude-test-model");

    await client.send([{ role: "user", content: "hello" }]);

    expect(anthropic.calls).toEqual([
      {
        model: "claude-test-model",
        max_tokens: 8192,
        messages: [{ role: "user", content: "hello" }],
      },
    ]);
  });
});
