import { render } from "ink";
import { createElement } from "react";
import { resolveLlmClient } from "./adapters/llm";
import { createAgent } from "./agent";
import { createDemoAgent } from "./demo";
import systemPrompt from "./prompt.md";
import { App } from "./tui/App.tsx";
import { initColorScheme } from "./tui/color-scheme.ts";

await initColorScheme();

const agent =
  process.env.DEMO === "1"
    ? await createDemoAgent()
    : await createAgent(resolveLlmClient(systemPrompt));

const { waitUntilExit } = renderFullscreen(createElement(App, { agent, attachApiKey }));
await waitUntilExit();

function attachApiKey(apiKey: string) {
  const client = resolveLlmClient(systemPrompt, { ...process.env, ANTHROPIC_API_KEY: apiKey });
  if (!client) return null;
  agent.setClient(client);
  return agent.modelInfo();
}

/*
 * Render in the alternate screen with the first frame at the top.
 *
 * Ink's `alternateScreen` switches buffers (`\x1b[?1049h`) but doesn't clear or
 * home the cursor before the first paint, so the frame starts wherever the cursor
 * was previously. Ink writes that escape just before painting, so we intercept it
 * and splice in a clear+home.
 */
function renderFullscreen(node: ReturnType<typeof createElement>) {
  const options = { exitOnCtrlC: true, alternateScreen: true };
  if (!process.stdout.isTTY) return render(node, options);

  const stdout = process.stdout;
  const originalWrite = stdout.write.bind(stdout);
  const write = originalWrite as (...args: unknown[]) => boolean;

  stdout.write = (chunk: string | Uint8Array, ...args: unknown[]) => {
    const result = write(chunk, ...args);
    if (typeof chunk === "string" && chunk.includes("\x1b[?1049h")) {
      originalWrite("\x1b[2J\x1b[H"); // clear + home, before Ink's first paint
    }
    return result;
  };

  try {
    return render(node, options);
  } finally {
    stdout.write = originalWrite;
  }
}
