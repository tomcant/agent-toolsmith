import { writeSync } from "node:fs";
import { render } from "ink";
import { createElement } from "react";
import { resolveLlmClient } from "./adapters/llm";
import { createAgent } from "./agent";
import { createDemoAgent } from "./demo";
import systemPrompt from "./prompt.md";
import { App } from "./tui/App.tsx";
import { initColorScheme } from "./tui/color-scheme.ts";
import { ApiKeyPrompt } from "./tui/components/ApiKeyPrompt.tsx";

await initColorScheme();

let altScreenActive = false;
process.on("exit", leaveAltScreen);
enterAltScreen();

// Signals terminate without emitting "exit" so redirect them through it to
// guarantee the alt screen is left behind.
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => process.exit(0));
}

const agent =
  process.env.DEMO === "1"
    ? await createDemoAgent()
    : await createAgent(await resolveLlmClientInteractive());

const { waitUntilExit } = render(createElement(App, { agent }), { exitOnCtrlC: true });
try {
  await waitUntilExit();
} finally {
  leaveAltScreen();
}

async function resolveLlmClientInteractive() {
  const configured = resolveLlmClient(systemPrompt);
  if (configured) return configured;

  const key = await promptForApiKey("ANTHROPIC_API_KEY");
  process.env.ANTHROPIC_API_KEY = key;

  clearScreen();

  const client = resolveLlmClient(systemPrompt);
  if (client) return client;

  leaveAltScreen();
  console.error("Error: could not initialise an LLM client from the provided key.");
  process.exit(1);
}

function promptForApiKey(envVarName: string): Promise<string> {
  return new Promise((resolve) => {
    let submitted = false;
    const { unmount, waitUntilExit } = render(
      createElement(ApiKeyPrompt, {
        envVarName,
        onSubmit: (key: string) => {
          submitted = true;
          unmount();
          resolve(key);
        },
      }),
      { exitOnCtrlC: true },
    );
    void waitUntilExit().then(() => {
      if (!submitted) {
        leaveAltScreen();
        process.exit(0);
      }
    });
  });
}

function enterAltScreen() {
  if (!process.stdout.isTTY) return;
  writeSync(process.stdout.fd, "\x1b[?1049h");
  altScreenActive = true;
  clearScreen();
}

function leaveAltScreen() {
  if (!altScreenActive) return;
  writeSync(process.stdout.fd, "\x1b[?1049l\x1b[?25h");
  altScreenActive = false;
}

function clearScreen() {
  if (!process.stdout.isTTY) return;
  writeSync(process.stdout.fd, "\x1b[2J\x1b[H");
}
