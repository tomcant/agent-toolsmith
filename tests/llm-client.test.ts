import { expect, test } from "bun:test";
import type Anthropic from "@anthropic-ai/sdk";
import { LlmClient, type Message } from "../src/llm/client.ts";

type CreateArgs = {
  model: string;
  max_tokens: number;
  messages: Message[];
};

function sdkSpy(handler: (body: CreateArgs) => unknown, calls?: CreateArgs[]): Anthropic {
  return {
    messages: {
      create: (body: CreateArgs) => {
        calls?.push(body);
        return Promise.resolve(handler(body));
      },
    },
  } as unknown as Anthropic;
}

test("sends the configured model, token cap, and messages to the SDK", async () => {
  const calls: CreateArgs[] = [];
  const sdk = sdkSpy(() => ({ content: [{ type: "text", text: "ok" }] }), calls);
  const client = new LlmClient(sdk, "claude-test-model");

  await client.send([{ role: "user", content: "hello" }]);

  expect(calls).toEqual([
    {
      model: "claude-test-model",
      max_tokens: 8192,
      messages: [{ role: "user", content: "hello" }],
    },
  ]);
});

test("concatenates all text blocks in the response into a single reply", async () => {
  const sdk = sdkSpy(() => ({
    content: [
      { type: "text", text: "Hello, " },
      { type: "text", text: "Tom." },
    ],
  }));
  const client = new LlmClient(sdk, "model");

  const reply = await client.send([{ role: "user", content: "hi" }]);

  expect(reply).toBe("Hello, Tom.");
});

test("ignores non-text content blocks when extracting the reply", async () => {
  const sdk = sdkSpy(() => ({
    content: [
      { type: "thinking", thinking: "reasoning..." },
      { type: "text", text: "the answer" },
      { type: "tool_use", id: "t1", name: "noop", input: {} },
    ],
  }));
  const client = new LlmClient(sdk, "model");

  const reply = await client.send([{ role: "user", content: "hi" }]);

  expect(reply).toBe("the answer");
});

test("propagates SDK errors to the caller", async () => {
  const sdk = sdkSpy(() => {
    throw new Error("something went wrong");
  });
  const client = new LlmClient(sdk, "model");

  const attempt = client.send([{ role: "user", content: "hi" }]);

  await expect(attempt).rejects.toThrow("something went wrong");
});
