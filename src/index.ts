import { render } from "ink";
import { createElement } from "react";
import { App } from "./tui/App.tsx";

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("Error: ANTHROPIC_API_KEY environment variable is not set");
  process.exit(1);
}

const { waitUntilExit } = render(createElement(App));
await waitUntilExit();
