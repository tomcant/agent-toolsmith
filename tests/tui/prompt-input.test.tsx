import { afterEach, describe, expect, test } from "bun:test";
import { testRender } from "@opentui/react/test-utils";
import { act } from "react";
import { PromptInput } from "#/tui/components/PromptInput.tsx";
import { createTheme, ThemeContext } from "#/tui/theme.ts";

type RenderOptions = {
  canSubmit?: boolean;
  kittyKeyboard?: boolean;
};

type Modifiers = { shift?: boolean; ctrl?: boolean; meta?: boolean; super?: boolean };

const terminalWidth = 40;
const wrappingPrompt = "a".repeat(terminalWidth * 2);

let renderer: { destroy: () => void } | undefined;

afterEach(async () => {
  await act(async () => {
    renderer?.destroy();
  });
  renderer = undefined;
});

async function renderPromptInput({ canSubmit = true, kittyKeyboard = false }: RenderOptions = {}) {
  const submitted: string[] = [];
  const onSubmit = (prompt: string) => submitted.push(prompt);

  const setup = await testRender(
    <ThemeContext value={createTheme("dark")}>
      <PromptInput canSubmit={canSubmit} onSubmit={onSubmit} />
    </ThemeContext>,
    { width: terminalWidth, height: 20, kittyKeyboard },
  );
  renderer = setup.renderer;

  const { mockInput, flush, captureCharFrame } = setup;

  const type = async (text: string) => {
    await mockInput.typeText(text);
    await flush();
  };
  const pressEnter = async (modifiers?: Modifiers) => {
    mockInput.pressEnter(modifiers);
    await flush();
  };
  const pressArrow = async (direction: "up" | "down", modifiers?: Modifiers) => {
    mockInput.pressArrow(direction, modifiers);
    await flush();
  };
  const seedHistory = async (...prompts: string[]) => {
    for (const prompt of prompts) {
      await type(prompt);
      await pressEnter();
    }
  };

  return {
    submitted,
    captureCharFrame,
    type,
    pressEnter,
    pressUp: (modifiers?: Modifiers) => pressArrow("up", modifiers),
    pressDown: (modifiers?: Modifiers) => pressArrow("down", modifiers),
    seedHistory,
  };
}

describe("prompt input", () => {
  test("submitting sends the prompt and empties the box", async () => {
    const { submitted, type, pressEnter } = await renderPromptInput();

    await type("a prompt");
    await pressEnter();
    await pressEnter(); // An empty box has nothing to send, so nothing arrives.

    expect(submitted).toEqual(["a prompt"]);
  });

  test("a prompt of only whitespace is not sent", async () => {
    const { submitted, type, pressEnter } = await renderPromptInput();

    await type("   ");
    await pressEnter();

    expect(submitted).toEqual([]);
  });

  test("a prompt is kept in the box when it cannot be submitted", async () => {
    const { submitted, captureCharFrame, type, pressEnter } = await renderPromptInput({
      canSubmit: false,
    });

    await type("refused");
    await pressEnter();

    expect(submitted).toEqual([]);
    expect(captureCharFrame()).toContain("refused");
  });

  test("shift+enter starts a new line instead of submitting", async () => {
    const { submitted, type, pressEnter } = await renderPromptInput({ kittyKeyboard: true });

    await type("top");
    await pressEnter({ shift: true });
    await type("bottom");
    await pressEnter();

    expect(submitted).toEqual(["top\nbottom"]);
  });

  test("pressing the up arrow walks back through history", async () => {
    const { submitted, seedHistory, pressEnter, pressUp } = await renderPromptInput();
    await seedHistory("first", "second");

    await pressUp();
    await pressUp();
    await pressEnter();

    expect(submitted).toEqual(["first", "second", "first"]);
  });

  test("pressing the down arrow walks forward through history", async () => {
    const { submitted, seedHistory, pressEnter, pressUp, pressDown } = await renderPromptInput();
    await seedHistory("first", "second");

    await pressUp();
    await pressUp();
    await pressDown();
    await pressEnter();

    expect(submitted).toEqual(["first", "second", "second"]);
  });

  test("the oldest prompt stays put when history runs out", async () => {
    const { submitted, seedHistory, pressEnter, pressUp } = await renderPromptInput();
    await seedHistory("history");

    await pressUp();
    await pressUp();
    await pressEnter();

    expect(submitted).toEqual(["history", "history"]);
  });

  test("returning to the newest entry restores the draft", async () => {
    const { submitted, captureCharFrame, seedHistory, type, pressEnter, pressUp, pressDown } =
      await renderPromptInput();
    await seedHistory("recalled");

    await type("draft");
    await pressUp();
    expect(captureCharFrame()).toContain("recalled");

    await pressDown();
    await pressEnter();

    expect(submitted).toEqual(["recalled", "draft"]);
  });

  test("pressing the down arrow leaves the draft alone", async () => {
    const { submitted, type, pressEnter, pressDown } = await renderPromptInput();

    await type("draft");
    await pressDown();
    await pressEnter();

    expect(submitted).toEqual(["draft"]);
  });

  test("a prompt submitted twice in a row is recalled as one entry", async () => {
    const { submitted, seedHistory, pressEnter, pressUp } = await renderPromptInput();
    await seedHistory("older", "same", "same");

    await pressUp();
    await pressUp();
    await pressEnter();

    expect(submitted).toEqual(["older", "same", "same", "older"]);
  });

  test("recall starts from the newest prompt again after a submit", async () => {
    const { submitted, seedHistory, type, pressEnter, pressUp } = await renderPromptInput();
    await seedHistory("a", "b", "c");

    await pressUp();
    await pressUp();
    await type("-edited");
    await pressEnter();

    await pressUp();
    await pressEnter();

    expect(submitted).toEqual(["a", "b", "c", "b-edited", "b-edited"]);
  });

  test("typing continues at the end of a recalled prompt", async () => {
    const { submitted, seedHistory, type, pressEnter, pressUp } = await renderPromptInput();
    await seedHistory("recalled");

    await pressUp();
    await type("!");
    await pressEnter();

    expect(submitted).toEqual(["recalled", "recalled!"]);
  });

  test("typing continues at the end of a recalled multi-line prompt", async () => {
    const { submitted, seedHistory, type, pressEnter, pressUp } = await renderPromptInput();
    await seedHistory("top\nbottom");

    await pressUp();
    await type("!");
    await pressEnter();

    expect(submitted).toEqual(["top\nbottom", "top\nbottom!"]);
  });

  test("pressing the up arrow moves the cursor within a multi-line prompt", async () => {
    const { submitted, seedHistory, type, pressEnter, pressUp } = await renderPromptInput();
    await seedHistory("history");

    await type("top\nbottom");
    await pressUp();
    await pressEnter();

    expect(submitted).toEqual(["history", "top\nbottom"]);
  });

  test("pressing the up arrow reaches history from the first row of a multi-line prompt", async () => {
    const { submitted, seedHistory, type, pressEnter, pressUp } = await renderPromptInput();
    await seedHistory("history");

    await type("top\nbottom");
    await pressUp(); // Moves the cursor up a row within the draft.
    await pressUp(); // On the first row now, so this reaches back into history.
    await pressEnter();

    expect(submitted).toEqual(["history", "history"]);
  });

  test("pressing the down arrow moves the cursor within a multi-line prompt", async () => {
    const { submitted, seedHistory, type, pressEnter, pressUp, pressDown } =
      await renderPromptInput();
    await seedHistory("top\nbottom");

    await type("draft");
    await pressUp(); // Recalls the prompt, cursor at the end of its last row.
    await pressUp(); // Moves up a row within it.
    await pressDown(); // Back down a row — not forward to the draft.
    await pressEnter();

    expect(submitted).toEqual(["top\nbottom", "top\nbottom"]);
  });

  test("pressing the down arrow returns to the draft from the last row of a multi-line prompt", async () => {
    const { submitted, seedHistory, type, pressEnter, pressUp, pressDown } =
      await renderPromptInput();
    await seedHistory("top\nbottom");

    await type("draft");
    await pressUp(); // Recalls the prompt, cursor at the end of its last row.
    await pressDown(); // Already on the last row, so this goes forward to the draft.
    await pressEnter();

    expect(submitted).toEqual(["top\nbottom", "draft"]);
  });

  test("pressing the up arrow moves the cursor within a wrapped prompt", async () => {
    const { submitted, seedHistory, type, pressEnter, pressUp } = await renderPromptInput();
    await seedHistory("history");

    await type(wrappingPrompt);
    await pressUp();
    await pressEnter();

    expect(submitted).toEqual(["history", wrappingPrompt]);
  });

  test("pressing the down arrow moves the cursor within a wrapped prompt", async () => {
    const { submitted, seedHistory, type, pressEnter, pressUp, pressDown } =
      await renderPromptInput();

    await seedHistory(wrappingPrompt);

    await type("draft");
    await pressUp(); // Recalls the wrapped prompt, cursor at the end of its last row.
    await pressUp(); // Moves up a row within it.
    await pressDown(); // Back down a row — not forward to the draft.
    await pressEnter();

    expect(submitted).toEqual([wrappingPrompt, wrappingPrompt]);
  });

  test("a modified arrow is left to the terminal", async () => {
    const { submitted, seedHistory, type, pressEnter, pressUp } = await renderPromptInput();
    await seedHistory("history");

    await type("draft");
    await pressUp({ shift: true });
    await pressUp({ super: true });
    await pressEnter();

    expect(submitted).toEqual(["history", "draft"]);
  });
});
