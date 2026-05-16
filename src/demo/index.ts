import type { Agent } from "#/agent";
import { createAgent } from "#/agent";
import { DemoLlmClient } from "./llm-client.ts";
import { scenarioNames } from "./scenarios.ts";
import { demoTools } from "./tools.ts";

export async function createDemoAgent(): Promise<Agent> {
  console.log(`Scenarios: ${scenarioNames.join(", ")}`);
  return createAgent(new DemoLlmClient(), demoTools());
}
