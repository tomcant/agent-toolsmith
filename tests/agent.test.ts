import { describe, expect, test } from "bun:test";
import { Agent } from "#/agent/agent.ts";
import { LlmClientSpy } from "./doubles/llm-client-spy.ts";

describe("Agent", () => {
  test("each turn sends the accumulated conversation to the LLM", async () => {
    const llm = new LlmClientSpy(["hi Tom"]);
    const agent = new Agent(llm.client);

    await agent.turn("my name is Tom");
    await agent.turn("what's my name?");

    expect(llm.calls[1]).toEqual([
      { role: "user", content: "my name is Tom" },
      { role: "assistant", content: "hi Tom" },
      { role: "user", content: "what's my name?" },
    ]);
  });

  test("a failed turn does not appear in the conversation", async () => {
    const llm = new LlmClientSpy(["first reply", new Error("error")]);
    const agent = new Agent(llm.client);

    await agent.turn("first");
    await expect(agent.turn("second")).rejects.toThrow("error");
    await agent.turn("third");

    expect(llm.calls[2]).toEqual([
      { role: "user", content: "first" },
      { role: "assistant", content: "first reply" },
      { role: "user", content: "third" },
    ]);
  });
});
