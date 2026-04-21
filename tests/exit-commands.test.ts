import { describe, expect, test } from "bun:test";
import { isExitCommand } from "#/tui/commands.ts";

describe("exit slash-commands", () => {
  test("/exit and /quit signal that the user wants to leave", () => {
    const exitResult = isExitCommand("/exit");
    const quitResult = isExitCommand("/quit");

    expect(exitResult).toBe(true);
    expect(quitResult).toBe(true);
  });

  test("surrounding whitespace does not hide an exit command", () => {
    const padded = isExitCommand("  /exit\n");

    expect(padded).toBe(true);
  });

  test("ordinary messages are not treated as exit commands", () => {
    const messages = ["", "hello", "exit", "/exitnow", "please /exit"];

    const results = messages.map(isExitCommand);

    expect(results).toEqual([false, false, false, false, false]);
  });
});
