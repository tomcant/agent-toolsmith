import type { LlmClient } from "#/agent/types.ts";

export type Env = Record<string, string | undefined>;

export type LlmAdapter = {
  matchesApiKey(apiKey: string): boolean;
  fromApiKey(apiKey: string, systemPrompt?: string, model?: string): LlmClient;
  tryFromEnv(env: Env, systemPrompt?: string): LlmClient | null;
};
