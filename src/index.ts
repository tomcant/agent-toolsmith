import { render } from "ink";
import { createElement } from "react";
import { App } from "./tui/App.tsx";

const { waitUntilExit } = render(createElement(App));
await waitUntilExit();
