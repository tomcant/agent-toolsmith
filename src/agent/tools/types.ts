export type Tool = ToolMetadata & {
  execute: (input: unknown) => Promise<string>;
};

export type ToolMetadata = {
  name: string;
  description: string;
  parameters: ToolParameters;
};

type ToolParameters = {
  type: "object";
  properties?: Record<string, unknown>;
  required?: string[];
};
