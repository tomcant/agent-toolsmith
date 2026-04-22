import { describe, expect, test } from "bun:test";
import { Agent } from "#/agent/agent.ts";
import { LlmClient } from "#/llm/client.ts";
import { AnthropicSpy } from "../doubles/anthropic-spy.ts";

describe("Agent", () => {
  test("each turn sends the accumulated conversation to the LLM", async () => {
    const anthropic = new AnthropicSpy(["Hello, Tom"]);
    const agent = new Agent(new LlmClient(anthropic.sdk, "model"));

    await agent.turn("My name is Tom");
    await agent.turn("What's my name?");

    expect(anthropic.calls[1]?.messages).toEqual([
      { role: "user", content: [{ type: "text", text: "My name is Tom" }] },
      { role: "assistant", content: [{ type: "text", text: "Hello, Tom" }] },
      { role: "user", content: [{ type: "text", text: "What's my name?" }] },
    ]);
  });

  test("concatenates text blocks in the response into a single reply", async () => {
    const anthropic = new AnthropicSpy([
      {
        content: [
          { type: "thinking", thinking: "Reasoning..." },
          { type: "text", text: "Hello, " },
          { type: "tool_use", id: "t1", name: "tool-name", input: {} },
          { type: "text", text: "Tom." },
        ],
        stop_reason: "end_turn",
      },
    ]);
    const agent = new Agent(new LlmClient(anthropic.sdk, "model"));

    const reply = await agent.turn("Hello");

    expect(reply).toBe("Hello, Tom.");
  });

  test("a failed turn does not appear in the conversation", async () => {
    const anthropic = new AnthropicSpy(["first reply", new Error("error")]);
    const agent = new Agent(new LlmClient(anthropic.sdk, "model"));

    await agent.turn("first");
    await expect(agent.turn("second")).rejects.toThrow("error");
    await agent.turn("third");

    expect(anthropic.calls[2]?.messages).toEqual([
      { role: "user", content: [{ type: "text", text: "first" }] },
      { role: "assistant", content: [{ type: "text", text: "first reply" }] },
      { role: "user", content: [{ type: "text", text: "third" }] },
    ]);
  });
});
