import type { Tool } from "#/agent/tools/types.ts";

export function demoTools(): Tool[] {
  return [echo, error, now, search, shell];
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
  execute: async (input) => (input as { text: string }).text,
};

const error: Tool = {
  name: "error",
  description: "Always throws.",
  inputSchema: { type: "object" },
  execute: async () => {
    throw new Error("ENOENT: simulated tool error");
  },
};

const now: Tool = {
  name: "now",
  description: "Returns the current ISO timestamp.",
  inputSchema: { type: "object" },
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
  execute: async (input) => `found 1 match for "${(input as { term: string }).term}"`,
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
  execute: async (input) => `ran \`${(input as { command: string[] }).command.join(" ")}\``,
};
