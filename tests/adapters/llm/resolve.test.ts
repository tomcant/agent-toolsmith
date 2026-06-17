import { describe, expect, test } from "bun:test";
import { resolveLlmClient } from "#/adapters/llm/index.ts";

describe("LLM client resolution", () => {
  test("returns an Anthropic client when ANTHROPIC_API_KEY is set", () => {
    const client = resolveLlmClient(undefined, { ANTHROPIC_API_KEY: "test-key" });

    expect(client.provider).toBe("anthropic");
    expect(client.model).toBe("claude-sonnet-4-6");
  });

  test("honours the MODEL override", () => {
    const client = resolveLlmClient(undefined, {
      ANTHROPIC_API_KEY: "test-key",
      MODEL: "claude-opus-4-8",
    });

    expect(client.model).toBe("claude-opus-4-8");
  });

  test("throws an error when no provider is configured", () => {
    expect(() => resolveLlmClient(undefined, {})).toThrow("No LLM provider configured");
  });
});
