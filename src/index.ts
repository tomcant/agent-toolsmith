import { render } from "ink";
import { createElement } from "react";
import { resolveLlmClient } from "./adapters/llm";
import { createAgent } from "./agent";
import { createDemoAgent } from "./demo";
import systemPrompt from "./prompt.md";
import { App } from "./tui/App.tsx";

const agent =
  process.env.DEMO === "1" ? await createDemoAgent() : await createAgent(resolveLlmClientOrExit());

const { waitUntilExit } = render(createElement(App, { agent }), { exitOnCtrlC: true });
await waitUntilExit();

function resolveLlmClientOrExit() {
  try {
    return resolveLlmClient(systemPrompt);
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
