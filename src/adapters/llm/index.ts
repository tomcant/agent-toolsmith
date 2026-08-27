import type { LlmClient } from "#/agent/types.ts";
import { anthropicAdapter } from "./anthropic.ts";
import { openaiAdapter } from "./openai.ts";
import type { Env, LlmAdapter } from "./types.ts";

const adapters: LlmAdapter[] = [anthropicAdapter, openaiAdapter];

// Returns the first provider whose keys are present in the environment.
export function resolveLlmClientFromEnv(
  systemPrompt?: string,
  env: Env = process.env,
): LlmClient | null {
  for (const adapter of adapters) {
    const client = adapter.tryFromEnv(env, systemPrompt);
    if (client) return client;
  }
  return null;
}

export function resolveLlmClientFromApiKey(
  apiKey: string,
  systemPrompt?: string,
  env: Env = process.env,
): LlmClient | null {
  const adapter = adapters.find((candidate) => candidate.matchesApiKey(apiKey));
  return adapter?.fromApiKey(apiKey, systemPrompt, env.MODEL) ?? null;
}
