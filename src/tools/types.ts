export type Tool = {
  name: string;
  description: string;
  input_schema: ToolInputSchema;
  execute: (input: unknown) => Promise<string>;
};

export type ToolInputSchema = {
  type: "object";
  properties?: Record<string, unknown>;
  required?: string[];
};
