export type Tool = {
  name: string;
  description: string;
  input_schema: object;
  execute: (input: unknown) => Promise<string>;
};
