import { describe, expect, test } from "bun:test";
import { validateMetadata, validateTool } from "#/tools/validate.ts";

const validMetadata = {
  name: "tool-name",
  description: "description",
  input_schema: { type: "object" },
};

const validTool = {
  ...validMetadata,
  execute: async () => "",
};

describe("tool metadata rules", () => {
  test("valid metadata is accepted", () => {
    expect(() => validateMetadata(validMetadata)).not.toThrow();
  });

  test("a non-object is rejected", () => {
    expect(() => validateMetadata(null)).toThrow("object");
    expect(() => validateMetadata("not a tool")).toThrow("object");
  });

  test("a name that doesn't match the allowed pattern is rejected", () => {
    expect(() => validateMetadata({ ...validMetadata, name: "has space" })).toThrow("name");
  });

  test("an empty description is rejected", () => {
    expect(() => validateMetadata({ ...validMetadata, description: "" })).toThrow("description");
  });

  test("an input_schema that is not an object schema is rejected", () => {
    expect(() => validateMetadata({ ...validMetadata, input_schema: { type: "string" } })).toThrow(
      "input_schema",
    );
  });
});

describe("loaded tool rules", () => {
  test("a valid tool is accepted", () => {
    expect(() => validateTool(validTool)).not.toThrow();
  });

  test("a missing execute is rejected", () => {
    expect(() => validateTool(validMetadata)).toThrow("execute");
  });

  test("a non-callable execute is rejected", () => {
    expect(() => validateTool({ ...validTool, execute: "not a function" })).toThrow("execute");
  });
});
