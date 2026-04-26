export type Tool = ToolMetadata & {
  execute: (input: unknown) => Promise<string>;
};

export type ToolMetadata = {
  name: string;
  description: string;
  input_schema: ToolInputSchema;
};

export type ToolInputSchema = {
  type: "object";
  properties?: Record<string, unknown>;
  required?: string[];
};
