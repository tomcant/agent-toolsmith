import { describe, expect, test } from "bun:test";
import { resolveLlmClientFromApiKey, resolveLlmClientFromEnv } from "#/adapters/llm/index.ts";

describe("LLM client resolution", () => {
  test("returns an Anthropic client when ANTHROPIC_API_KEY is set", () => {
    const client = resolveLlmClientFromEnv(undefined, { ANTHROPIC_API_KEY: "sk-ant-test" });

    expect(client?.provider).toBe("anthropic");
    expect(client?.model).toBe("claude-sonnet-4-6");
  });

  test("returns an OpenAI client when OPENAI_API_KEY is set", () => {
    const client = resolveLlmClientFromEnv(undefined, { OPENAI_API_KEY: "sk-proj-test" });

    expect(client?.provider).toBe("openai");
    expect(client?.model).toBe("gpt-5-mini");
  });

  test("honours the MODEL override", () => {
    const client = resolveLlmClientFromEnv(undefined, {
      ANTHROPIC_API_KEY: "sk-ant-test",
      MODEL: "claude-opus-4-8",
    });

    expect(client?.model).toBe("claude-opus-4-8");
  });

  test("returns null when no provider is configured", () => {
    expect(resolveLlmClientFromEnv(undefined, {})).toBeNull();
  });

  test("returns null for a key that is not an Anthropic key", () => {
    expect(resolveLlmClientFromEnv(undefined, { ANTHROPIC_API_KEY: "not-a-key" })).toBeNull();
  });

  test("returns null for a key that is not an OpenAI key", () => {
    expect(resolveLlmClientFromEnv(undefined, { OPENAI_API_KEY: "not-a-key" })).toBeNull();
  });

  test("accepts an unprefixed Anthropic key when a custom base URL is set", () => {
    const client = resolveLlmClientFromEnv(undefined, {
      ANTHROPIC_API_KEY: "gateway-token",
      ANTHROPIC_BASE_URL: "https://gateway.internal/v1",
    });

    expect(client?.provider).toBe("anthropic");
  });

  test("accepts an unprefixed OpenAI key when a custom base URL is set", () => {
    const client = resolveLlmClientFromEnv(undefined, {
      OPENAI_API_KEY: "gateway-token",
      OPENAI_BASE_URL: "https://gateway.internal/v1",
    });

    expect(client?.provider).toBe("openai");
  });
});

describe("LLM client resolution from a raw API key", () => {
  test("routes an Anthropic key to the Anthropic client", () => {
    const client = resolveLlmClientFromApiKey("sk-ant-test", undefined, {});

    expect(client?.provider).toBe("anthropic");
  });

  test("routes an OpenAI key to the OpenAI client", () => {
    const client = resolveLlmClientFromApiKey("sk-proj-test", undefined, {});

    expect(client?.provider).toBe("openai");
  });

  test("routes by key format rather than by what the environment already holds", () => {
    const client = resolveLlmClientFromApiKey("sk-proj-test", undefined, {
      ANTHROPIC_API_KEY: "sk-ant-test",
    });

    expect(client?.provider).toBe("openai");
  });

  test("returns null for a key matching no provider's format", () => {
    expect(resolveLlmClientFromApiKey("not-a-key", undefined, {})).toBeNull();
  });
});
