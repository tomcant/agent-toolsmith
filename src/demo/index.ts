import type { Agent } from "#/agent";
import { createAgent } from "#/agent";
import { DemoLlmClient } from "./llm-client.ts";
import { demoTools } from "./tools.ts";

export async function createDemoAgent(): Promise<Agent> {
  return createAgent(new DemoLlmClient(), demoTools());
}
