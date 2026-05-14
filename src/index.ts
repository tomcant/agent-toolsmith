import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { render } from "ink";
import { createElement } from "react";
import { AnthropicLlmClient } from "./adapters/llm/anthropic.ts";
import { createAgent } from "./agent";
import { App } from "./tui/App.tsx";

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("Error: ANTHROPIC_API_KEY environment variable is not set");
  process.exit(1);
}

console.log("Self-Evolving Agent");

const model = process.env.MODEL ?? "claude-sonnet-4-6";
const systemPrompt = await Bun.file(join(import.meta.dir, "../PROMPT.md")).text();
const llmClient = new AnthropicLlmClient(new Anthropic(), model, systemPrompt);

const agent = await createAgent(llmClient);

const { waitUntilExit } = render(createElement(App, { agent }));
await waitUntilExit();
