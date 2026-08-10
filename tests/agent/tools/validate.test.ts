import { describe, expect, test } from "bun:test";
import { validateMetadata, validateTool } from "#/agent/tools/validate.ts";

const validMetadata = {
  name: "tool-name",
  description: "description",
  inputSchema: { type: "object" },
  outputFormat: "text",
};

const validTool = {
  ...validMetadata,
  execute: async () => "",
};

describe("validating tool metadata", () => {
  test("valid metadata is accepted", () => {
    expect(() => validateMetadata(validMetadata)).not.toThrow();
  });

  test("a non-object is rejected", () => {
    expect(() => validateMetadata(null)).toThrow("object");
    expect(() => validateMetadata("not a tool")).toThrow("object");
  });

  test("a name that doesn't match the allowed pattern is rejected", () => {
    expect(() => validateMetadata({ ...validMetadata, name: "has space" })).toThrow("name");
    expect(() => validateMetadata({ ...validMetadata, name: "../escape" })).toThrow("name");
    expect(() => validateMetadata({ ...validMetadata, name: "a/b" })).toThrow("name");
  });

  test("an empty description is rejected", () => {
    expect(() => validateMetadata({ ...validMetadata, description: "" })).toThrow("description");
  });

  test("an inputSchema field that is not an object schema is rejected", () => {
    expect(() => validateMetadata({ ...validMetadata, inputSchema: { type: "string" } })).toThrow(
      "inputSchema",
    );
  });

  test("a known outputFormat is accepted", () => {
    expect(() => validateMetadata({ ...validMetadata, outputFormat: "text" })).not.toThrow();
    expect(() => validateMetadata({ ...validMetadata, outputFormat: "markdown" })).not.toThrow();
  });

  test("an unknown outputFormat is rejected", () => {
    expect(() => validateMetadata({ ...validMetadata, outputFormat: "html" })).toThrow(
      "outputFormat",
    );
    expect(() => validateMetadata({ ...validMetadata, outputFormat: 1 })).toThrow("outputFormat");
  });

  test("a missing outputFormat is rejected", () => {
    const { outputFormat, ...withoutFormat } = validMetadata;

    expect(() => validateMetadata(withoutFormat)).toThrow("outputFormat");
  });
});

describe("validating tools", () => {
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
