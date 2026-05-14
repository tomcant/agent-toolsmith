import { describe, expect, test } from "bun:test";
import { validateMetadata, validateTool } from "#/agent/tools/validate.ts";

const validMetadata = {
  name: "tool-name",
  description: "description",
  parameters: { type: "object" },
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

  test("a parameters field that is not an object schema is rejected", () => {
    expect(() => validateMetadata({ ...validMetadata, parameters: { type: "string" } })).toThrow(
      "parameters",
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
