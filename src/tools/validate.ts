import type { Tool, ToolMetadata } from "./types.ts";

const NAME_PATTERN = /^[a-z0-9-]{1,64}$/;

export function validateMetadata(input: unknown): asserts input is ToolMetadata {
  if (!isObject(input)) {
    throw new Error("tool must be an object");
  }

  const { name, description, input_schema } = input;

  if (typeof name !== "string" || !NAME_PATTERN.test(name)) {
    throw new Error("tool name must match ^[a-z0-9-]{1,64}$");
  }

  if (typeof description !== "string" || description.length === 0) {
    throw new Error("tool description must be a non-empty string");
  }

  if (!isObject(input_schema) || (input_schema as { type?: unknown }).type !== "object") {
    throw new Error("tool input_schema must be an object schema (type: 'object')");
  }
}

export function validateTool(input: unknown): asserts input is Tool {
  validateMetadata(input);

  if (typeof (input as { execute?: unknown }).execute !== "function") {
    throw new Error("tool execute must be a function");
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
