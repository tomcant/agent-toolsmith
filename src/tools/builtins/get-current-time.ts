import type { Tool } from "../types.ts";

export const getCurrentTime: Tool = {
  name: "get-current-time",
  description: "Returns the current date and time as an ISO 8601 string.",
  input_schema: { type: "object", properties: {}, required: [] },
  execute: async () => new Date().toISOString(),
};
