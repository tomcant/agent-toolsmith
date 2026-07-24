import type { LlmEvent, MessagePart } from "#/agent/types.ts";

const TEXT_DELAY_MS = 30;
const EVENT_DELAY_MS = 300;

export function runScenario(name: string): AsyncGenerator<LlmEvent> {
  return scenarios[name] ? scenarios[name]() : unknownScenario(name);
}

const scenarios: Record<string, () => AsyncGenerator<LlmEvent>> = {
  text: textScenario,
  "long-text": longTextScenario,
  markdown: markdownScenario,
  tool: toolScenario,
  "multi-tool": multiToolScenario,
  "tool-error": toolErrorScenario,
  error: errorScenario,
};

async function* textScenario(): AsyncGenerator<LlmEvent> {
  yield* streamTextAndComplete("Lorem ipsum dolor sit amet, consectetur adipiscing elit.");
}

async function* longTextScenario(): AsyncGenerator<LlmEvent> {
  const paragraphs = [
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum leo ex, aliquet pellentesque nulla ut, fermentum vestibulum urna. Fusce nisi ante, eleifend non enim et, aliquet elementum arcu.",
    "Aenean sit amet velit libero. Suspendisse id vehicula leo. Vestibulum ultricies semper libero, in tincidunt nunc faucibus sed. Duis vulputate augue eget tortor tempus, at accumsan augue laoreet.",
    "Proin finibus ante in pretium dictum. Cras tempus tempor posuere. Donec sodales eget justo a cursus. Suspendisse sollicitudin sit amet turpis eget fermentum.",
  ];
  yield* streamTextAndComplete(paragraphs.join("\n\n"));
}

async function* markdownScenario(): AsyncGenerator<LlmEvent> {
  const markdown = [
    "# Markdown showcase",
    "Plain text with **bold**, _italic_, and ~~strike-through~~ words, plus an `inline code` span.",
    "## Unordered list",
    "- First item\n- Second item\n  - Nested item\n- Third item with **bold** text",
    "## Ordered list",
    "1. First step\n2. Second step\n  i. Nested step\n3. Third step with _italic_ text",
    "## Table",
    "| Tool | Purpose | Built-in |\n| ---- | ------- | :------: |\n| echo | Repeat input | yes |\n| search | Find things | yes |\n| shell | Execute a command | yes |\n| now | Print the current time | yes |",
    "## Code fence",
    // biome-ignore lint/suspicious/noTemplateCurlyInString: not real code
    "```typescript\nexport function greet(name: string): string {\n  return `Hello, ${name}!`;\n}\n```",
    "## Blockquote",
    "> Then you'll see that it is not the spoon that bends. It is only yourself.",
    "## Horizontal rule",
    "---",
    "And a [link](https://example.com) to round things off.",
  ].join("\n\n");
  yield* streamTextAndComplete(markdown);
}

async function* toolScenario(): AsyncGenerator<LlmEvent> {
  const call = {
    id: nextCallId("tool"),
    name: "echo",
    input: { text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit" },
  };
  await sleep(EVENT_DELAY_MS);
  yield { type: "tool_call", ...call };
  yield complete([{ type: "tool_call", ...call }]);
}

async function* multiToolScenario(): AsyncGenerator<LlmEvent> {
  const calls = [
    {
      id: nextCallId("multi-tool"),
      name: "search",
      input: { term: "foo" },
    },
    {
      id: nextCallId("multi-tool"),
      name: "shell",
      input: { command: ["ls", "-la"] },
    },
    {
      id: nextCallId("multi-tool"),
      name: "now",
      input: {},
    },
  ];
  const parts: MessagePart[] = [];
  for (const call of calls) {
    await sleep(EVENT_DELAY_MS);
    yield { type: "tool_call", ...call };
    parts.push({ type: "tool_call", ...call });
  }
  yield complete(parts);
}

async function* toolErrorScenario(): AsyncGenerator<LlmEvent> {
  const call = {
    id: nextCallId("tool-error"),
    name: "error",
    input: {},
  };
  await sleep(EVENT_DELAY_MS);
  yield { type: "tool_call", ...call };
  yield complete([{ type: "tool_call", ...call }]);
}

async function* errorScenario(): AsyncGenerator<LlmEvent> {
  await sleep(EVENT_DELAY_MS);
  yield* streamText("Lorem ipsum dolor sit amet, consectetur adipiscing elit.");
  throw new Error("Simulated LLM failure mid-stream");
}

async function* unknownScenario(scenario: string): AsyncGenerator<LlmEvent> {
  const list = Object.keys(scenarios).join(", ");
  yield* streamTextAndComplete(
    scenario
      ? `Unknown scenario "${scenario}". Try: ${list}.`
      : `Type a scenario keyword: ${list}.`,
  );
}

async function* streamTextAndComplete(text: string): AsyncGenerator<LlmEvent> {
  yield* streamText(text);
  yield complete([{ type: "text", text }]);
}

async function* streamText(text: string): AsyncGenerator<LlmEvent> {
  for (const delta of text.split(/(?<=\s)/)) {
    yield { type: "text_delta", text: delta };
    await sleep(TEXT_DELAY_MS);
  }
}

function complete(response: MessagePart[]): LlmEvent {
  return { type: "complete", response };
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

let callCounter = 0;
const nextCallId = (prefix: string) => `${prefix}-${++callCounter}`;
