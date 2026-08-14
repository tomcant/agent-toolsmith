import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { createElement } from "react";
import { resolveLlmClient } from "./adapters/llm";
import { createAgent } from "./agent";
import { createDemoAgent } from "./demo";
import systemPrompt from "./prompt.md";
import { App } from "./tui/App.tsx";

const agent =
  process.env.DEMO === "1"
    ? await createDemoAgent()
    : await createAgent(resolveLlmClient(systemPrompt));

const renderer = await createCliRenderer();

const themeMode = (await renderer.waitForThemeMode(200)) ?? "dark";

createRoot(renderer).render(createElement(App, { agent, attachApiKey, themeMode }));

function attachApiKey(apiKey: string) {
  const client = resolveLlmClient(systemPrompt, { ...process.env, ANTHROPIC_API_KEY: apiKey });
  if (!client) return null;
  agent.setClient(client);
  return agent.modelInfo();
}
