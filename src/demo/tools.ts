import type { Tool } from "#/agent/tools/types.ts";

export function demoTools(): Tool[] {
  return [echo, error, now, run, search];
}

const echo: Tool = {
  name: "echo",
  description: "Returns the given text.",
  parameters: {
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
  parameters: { type: "object" },
  execute: async () => {
    throw new Error("ENOENT: simulated tool error");
  },
};

const now: Tool = {
  name: "now",
  description: "Returns the current ISO timestamp.",
  parameters: { type: "object" },
  execute: async () => new Date().toISOString(),
};

const run: Tool = {
  name: "run",
  description: "Pretends to run a command.",
  parameters: {
    type: "object",
    properties: {
      argv: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["argv"],
  },
  execute: async (input) => `ran: ${(input as { argv: string[] }).argv.join(" ")}`,
};

const search: Tool = {
  name: "search",
  description: "Pretends to search.",
  parameters: {
    type: "object",
    properties: {
      term: { type: "string" },
    },
    required: ["term"],
  },
  execute: async (input) => `found 1 match for "${(input as { term: string }).term}"`,
};
