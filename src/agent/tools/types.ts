export type Tool = ToolMetadata & {
  execute: (input: ToolInput) => Promise<string>;
};

export type ToolMetadata = {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
};

type ToolInputSchema = {
  type: "object";
  properties?: Record<string, unknown>;
  required?: string[];
};

export type ToolInput = Record<string, unknown>;
