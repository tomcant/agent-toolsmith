import Anthropic from "@anthropic-ai/sdk";
import { render } from "ink";
import { createElement } from "react";
import { AnthropicLlmClient } from "./adapters/llm/anthropic.ts";
import type { Agent } from "./agent";
import { createAgent } from "./agent";
import { createDemoAgent } from "./demo";
import systemPrompt from "./prompt.md";
import { App } from "./tui/App.tsx";

console.log("Self-Evolving Agent");

const agent = await (process.env.DEMO === "1" ? createDemoAgent() : createProdAgent());

const { waitUntilExit } = render(createElement(App, { agent }), { exitOnCtrlC: true });
await waitUntilExit();

async function createProdAgent(): Promise<Agent> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Error: ANTHROPIC_API_KEY environment variable is not set");
    process.exit(1);
  }
  const model = process.env.MODEL ?? "claude-sonnet-4-6";
  return createAgent(new AnthropicLlmClient(new Anthropic(), model, systemPrompt));
}
