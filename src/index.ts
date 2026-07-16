import { writeSync } from "node:fs";
import { render } from "ink";
import { createElement } from "react";
import { resolveLlmClient } from "./adapters/llm";
import { createAgent } from "./agent";
import { createDemoAgent } from "./demo";
import systemPrompt from "./prompt.md";
import { App } from "./tui/App.tsx";

let altScreenActive = false;
process.on("exit", leaveAltScreen);
enterAltScreen();

// Signals terminate without emitting "exit" so redirect them through it to
// guarantee the alt screen is left behind.
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => process.exit(0));
}

const agent =
  process.env.DEMO === "1" ? await createDemoAgent() : await createAgent(resolveLlmClientOrExit());

const { waitUntilExit } = render(createElement(App, { agent }), { exitOnCtrlC: true });
try {
  await waitUntilExit();
} finally {
  leaveAltScreen();
}

function resolveLlmClientOrExit() {
  try {
    return resolveLlmClient(systemPrompt);
  } catch (error) {
    leaveAltScreen();
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

function enterAltScreen() {
  if (!process.stdout.isTTY) return;
  writeSync(process.stdout.fd, "\x1b[?1049h\x1b[2J\x1b[H");
  altScreenActive = true;
}

function leaveAltScreen() {
  if (!altScreenActive) return;
  writeSync(process.stdout.fd, "\x1b[?1049l\x1b[?25h");
  altScreenActive = false;
}
