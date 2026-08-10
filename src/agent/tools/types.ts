export type Tool = ToolMetadata & {
  execute: (input: ToolInput) => Promise<string>;
};

export type ToolMetadata = {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
  outputFormat: OutputFormat;
};

type ToolInputSchema = {
  type: "object";
  properties?: Record<string, unknown>;
  required?: string[];
};

export type ToolInput = Record<string, unknown>;

export const OUTPUT_FORMATS = ["text", "markdown"] as const;

export type OutputFormat = (typeof OUTPUT_FORMATS)[number];
