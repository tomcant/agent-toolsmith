import type { LlmClient } from "#/agent/types.ts";
import { anthropicFromEnv } from "./anthropic.ts";

type Env = Record<string, string | undefined>;
type LlmFromEnv = (env: Env, systemPrompt?: string) => LlmClient | null;

const adapters: LlmFromEnv[] = [anthropicFromEnv];

export function resolveLlmClient(systemPrompt?: string, env: Env = process.env): LlmClient {
  for (const fromEnv of adapters) {
    const client = fromEnv(env, systemPrompt);
    if (client) return client;
  }
  throw new Error("No LLM provider configured. Hint: set `ANTHROPIC_API_KEY`");
}
