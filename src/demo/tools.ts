import type { Tool } from "#/agent/tools/types.ts";

export function demoTools(): Tool[] {
  return [echo, error, now, search, shell, weather];
}

const echo: Tool = {
  name: "echo",
  description: "Returns the given text.",
  inputSchema: {
    type: "object",
    properties: {
      text: { type: "string" },
    },
    required: ["text"],
  },
  outputFormat: "text",
  execute: async (input) => (input as { text: string }).text,
};

const error: Tool = {
  name: "error",
  description: "Always throws.",
  inputSchema: { type: "object" },
  outputFormat: "text",
  execute: async () => {
    throw new Error("ENOENT: simulated tool error");
  },
};

const now: Tool = {
  name: "now",
  description: "Returns the current ISO timestamp.",
  inputSchema: { type: "object" },
  outputFormat: "text",
  execute: async () => new Date().toISOString(),
};

const search: Tool = {
  name: "search",
  description: "Pretends to search.",
  inputSchema: {
    type: "object",
    properties: {
      term: { type: "string" },
    },
    required: ["term"],
  },
  outputFormat: "text",
  execute: async (input) => `found 1 match for "${(input as { term: string }).term}"`,
};

const weather: Tool = {
  name: "weather",
  description: "Pretends to report the weather as a markdown table.",
  inputSchema: {
    type: "object",
    properties: {
      city: { type: "string" },
    },
    required: ["city"],
  },
  outputFormat: "markdown",
  execute: async (input) =>
    [
      `### Weather for ${(input as { city: string }).city}`,
      "",
      "| Attribute | Value |",
      "| --------- | ----- |",
      "| Condition | Partly cloudy |",
      "| Temperature | 18°C |",
      "| Humidity | 64% |",
      "| Wind | 12 km/h SW |",
    ].join("\n"),
};

const shell: Tool = {
  name: "shell",
  description: "Pretends to run a command.",
  inputSchema: {
    type: "object",
    properties: {
      command: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["command"],
  },
  outputFormat: "text",
  execute: async (input) => `ran \`${(input as { command: string[] }).command.join(" ")}\``,
};
