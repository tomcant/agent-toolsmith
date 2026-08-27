import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { createElement } from "react";
import { resolveLlmClientFromApiKey, resolveLlmClientFromEnv } from "./adapters/llm";
import { createAgent } from "./agent";
import { createDemoAgent } from "./demo";
import systemPrompt from "./prompt.md";
import { App } from "./tui/App.tsx";

const agent =
  process.env.DEMO === "1"
    ? await createDemoAgent()
    : await createAgent(resolveLlmClientFromEnv(systemPrompt));

const renderer = await createCliRenderer();

const themeMode = (await renderer.waitForThemeMode(200)) ?? "dark";

createRoot(renderer).render(createElement(App, { agent, attachApiKey, themeMode }));

function attachApiKey(apiKey: string) {
  const client = resolveLlmClientFromApiKey(apiKey, systemPrompt);
  if (!client) return null;
  agent.setClient(client);
  return agent.modelInfo();
}
