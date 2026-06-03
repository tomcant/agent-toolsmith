import { isObject } from "#/utils.ts";
import type { Tool, ToolMetadata } from "./types.ts";

const NAME_PATTERN = /^[a-z0-9-]{1,64}$/;

export function validateTool(tool: unknown): asserts tool is Tool {
  validateMetadata(tool);

  if (typeof (tool as { execute?: unknown }).execute !== "function") {
    throw new Error("tool execute must be a function");
  }
}

export function validateMetadata(metadata: unknown): asserts metadata is ToolMetadata {
  if (!isObject(metadata)) {
    throw new Error("tool must be an object");
  }

  const { name, description, inputSchema } = metadata;

  if (typeof name !== "string" || !NAME_PATTERN.test(name)) {
    throw new Error("tool name must match ^[a-z0-9-]{1,64}$");
  }

  if (typeof description !== "string" || description.length === 0) {
    throw new Error("tool description must be a non-empty string");
  }

  if (!isObject(inputSchema) || inputSchema.type !== "object") {
    throw new Error("tool inputSchema must be an object schema (type: 'object')");
  }
}
