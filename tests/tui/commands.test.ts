import { describe, expect, test } from "bun:test";
import { formatToolList, parseCommand } from "#/tui/commands.ts";
import { makeTool } from "../helpers.ts";

describe("slash commands", () => {
  test("/exit and /quit signal that the user wants to leave", () => {
    expect(parseCommand("/exit")).toEqual({ kind: "exit" });
    expect(parseCommand("/quit")).toEqual({ kind: "exit" });
  });

  test("surrounding whitespace is ignored", () => {
    expect(parseCommand("  /exit\n")).toEqual({ kind: "exit" });
  });

  test("/tools asks for the current tool inventory", () => {
    expect(parseCommand("/tools")).toEqual({ kind: "tools_list" });
  });

  test("/tools remove targets a specific tool by name", () => {
    expect(parseCommand("/tools remove some-tool")).toEqual({
      kind: "tools_remove",
      name: "some-tool",
    });
  });

  test("a malformed /tools invocation surfaces usage to the user", () => {
    const cases = ["/tools remove", "/tools remove a b", "/tools unknown-command"];

    for (const input of cases) {
      expect(() => parseCommand(input)).toThrow(/usage/i);
    }
  });

  test("an unrecognised slash command is reported back to the user", () => {
    expect(() => parseCommand("/unknown-command")).toThrow("Unknown command: /unknown-command");
  });

  test("ordinary messages are not treated as commands", () => {
    const messages = ["", "hello", "exit", "please /exit"];

    const results = messages.map(parseCommand);

    expect(results).toEqual([null, null, null, null]);
  });
});

describe("rendering the tool list", () => {
  test("descriptions are aligned in a column regardless of tool name length", () => {
    const availableWidth = 80;

    const result = formatToolList(
      [
        makeTool("tool-name", { description: "a tool" }),
        makeTool("really-long-tool-name", { description: "another tool" }),
      ],
      availableWidth,
    );

    expect(result).toBe("really-long-tool-name  another tool\ntool-name              a tool");
  });

  test("tools are displayed in alphabetical order", () => {
    const availableWidth = 80;

    const result = formatToolList(
      [
        makeTool("b-tool", { description: "comes second" }),
        makeTool("a-tool", { description: "comes first" }),
      ],
      availableWidth,
    );

    expect(result).toBe("a-tool  comes first\nb-tool  comes second");
  });

  test("a line wider than the available width is truncated with an ellipsis", () => {
    const availableWidth = 10;

    const result = formatToolList(
      [makeTool("tool", { description: "a long description" })],
      availableWidth,
    );

    expect(result).toBe("tool  a l…");
  });

  test("an empty tool inventory is reported in human-readable form", () => {
    const availableWidth = 80;

    const result = formatToolList([], availableWidth);

    expect(result).toBe("No tools available.");
  });
});
