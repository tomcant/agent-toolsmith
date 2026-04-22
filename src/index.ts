import Anthropic from "@anthropic-ai/sdk";
import { render } from "ink";
import { createElement } from "react";
import { Agent } from "./agent/agent.ts";
import { LlmClient } from "./llm/client.ts";
import { ToolRegistry } from "./tools/registry.ts";
import { App } from "./tui/App.tsx";

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("Error: ANTHROPIC_API_KEY environment variable is not set");
  process.exit(1);
}

const model = process.env.MODEL ?? "claude-sonnet-4-6";
const agent = new Agent(new LlmClient(new Anthropic(), model), new ToolRegistry());

const { waitUntilExit } = render(createElement(App, { agent }));
await waitUntilExit();
