import type { LlmClient } from "#/agent/types.ts";
import { anthropicFromEnv } from "./anthropic.ts";

type Env = Record<string, string | undefined>;
type LlmFromEnv = (env: Env, systemPrompt?: string) => LlmClient | null;

const adapters: LlmFromEnv[] = [anthropicFromEnv];

// Returns the first provider whose keys are present in the environment.
export function resolveLlmClient(systemPrompt?: string, env: Env = process.env): LlmClient | null {
  for (const fromEnv of adapters) {
    const client = fromEnv(env, systemPrompt);
    if (client) return client;
  }
  return null;
}
