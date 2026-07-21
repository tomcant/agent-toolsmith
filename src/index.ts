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

const agent =
  process.env.DEMO === "1"
    ? await createDemoAgent()
    : await createAgent(await resolveLlmClientInteractive());

const { waitUntilExit } = renderFullscreen(createElement(App, { agent }));
await waitUntilExit();

async function resolveLlmClientInteractive() {
  const configured = resolveLlmClient(systemPrompt);
  if (configured) return configured;

  const key = await promptForApiKey();
  process.env.ANTHROPIC_API_KEY = key;

  const client = resolveLlmClient(systemPrompt);
  if (client) return client;

  console.error("Error: could not initialise an LLM client from the provided key.");
  process.exit(1);
}

function promptForApiKey(): Promise<string> {
  return new Promise((resolve) => {
    let submitted = false;
    const { unmount, waitUntilExit } = renderFullscreen(
      createElement(ApiKeyPrompt, {
        onSubmit: (key: string) => {
          submitted = true;
          unmount();
          resolve(key);
        },
      }),
    );
    void waitUntilExit().then(() => {
      if (!submitted) {
        process.exit(0);
      }
    });
  });
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
