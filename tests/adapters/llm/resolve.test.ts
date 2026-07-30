import { describe, expect, test } from "bun:test";
import { resolveLlmClient } from "#/adapters/llm/index.ts";

describe("LLM client resolution", () => {
  test("returns an Anthropic client when ANTHROPIC_API_KEY is set", () => {
    const client = resolveLlmClient(undefined, { ANTHROPIC_API_KEY: "sk-ant-test" });

    expect(client?.provider).toBe("anthropic");
    expect(client?.model).toBe("claude-sonnet-4-6");
  });

  test("honours the MODEL override", () => {
    const client = resolveLlmClient(undefined, {
      ANTHROPIC_API_KEY: "sk-ant-test",
      MODEL: "claude-opus-4-8",
    });

    expect(client?.model).toBe("claude-opus-4-8");
  });

  test("returns null when no provider is configured", () => {
    expect(resolveLlmClient(undefined, {})).toBeNull();
  });

  test("returns null for a key that is not an Anthropic key", () => {
    expect(resolveLlmClient(undefined, { ANTHROPIC_API_KEY: "not-a-key" })).toBeNull();
  });

  test("accepts an unprefixed key when a custom base URL is set", () => {
    const client = resolveLlmClient(undefined, {
      ANTHROPIC_API_KEY: "gateway-token",
      ANTHROPIC_BASE_URL: "https://gateway.internal/v1",
    });

    expect(client?.provider).toBe("anthropic");
  });
});
