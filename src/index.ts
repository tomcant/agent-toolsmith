import Anthropic from "@anthropic-ai/sdk";
import { render } from "ink";
import { createElement } from "react";
import { Agent } from "./agent/agent.ts";
import { LlmClient } from "./llm/client.ts";
import { SessionLog } from "./session/log.ts";
import { createSessionDir } from "./session/session.ts";
import { addTool } from "./tools/builtins/add-tool.ts";
import { createToolsDir } from "./tools/dir.ts";
import { createToolRegistry } from "./tools/discovery.ts";
import { App } from "./tui/App.tsx";
import { join } from "node:path";

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("Error: ANTHROPIC_API_KEY environment variable is not set");
  process.exit(1);
}

console.log("Self-Evolving Agent");

const model = process.env.MODEL ?? "claude-sonnet-4-6";
const systemPrompt = await Bun.file(join(import.meta.dir, "../PROMPT.md")).text();
const llmClient = new LlmClient(new Anthropic(), model, systemPrompt);

const toolsDir = await createToolsDir();
const toolRegistry = await createToolRegistry(toolsDir);
toolRegistry.register(addTool(toolsDir, toolRegistry));

const sessionDir = await createSessionDir();
const sessionLog = new SessionLog(sessionDir);

const agent = new Agent(llmClient, toolRegistry, sessionLog);

const { waitUntilExit } = render(createElement(App, { agent }));
await waitUntilExit();
