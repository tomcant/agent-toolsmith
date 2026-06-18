import { describe, expect, test } from "bun:test";
import { parseCommand, toolListRows } from "#/tui/commands.ts";
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

describe("preparing the tool list for display", () => {
  test("names are padded to a common width", () => {
    const rows = toolListRows([
      makeTool("tool-name", { description: "a tool" }),
      makeTool("really-long-tool-name", { description: "another tool" }),
    ]);

    expect(rows).toEqual([
      { name: "really-long-tool-name", description: "another tool" },
      { name: "tool-name            ", description: "a tool" },
    ]);
  });

  test("tools are ordered alphabetically by name", () => {
    const rows = toolListRows([
      makeTool("b-tool", { description: "comes second" }),
      makeTool("a-tool", { description: "comes first" }),
    ]);

    expect(rows.map((row) => row.name)).toEqual(["a-tool", "b-tool"]);
  });

  test("an empty tool list produces no rows", () => {
    expect(toolListRows([])).toEqual([]);
  });
});
