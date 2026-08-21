import type { TextareaOptions, TextareaRenderable } from "@opentui/core";
import { TextAttributes } from "@opentui/core";
import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import { useRef } from "react";
import { useTheme } from "../theme.ts";

const maxRows = 10;
const reservedRows = 6;

const keyBindings: TextareaOptions["keyBindings"] = [
  { name: "return", action: "submit" },
  { name: "kpenter", action: "submit" },
  { name: "return", super: true, action: "submit" },
  { name: "kpenter", super: true, action: "submit" },
  { name: "return", shift: true, action: "newline" },
  { name: "kpenter", shift: true, action: "newline" },
  { name: "return", meta: true, action: "newline" },
  { name: "kpenter", meta: true, action: "newline" },
];

type PromptInputProps = {
  canSubmit: boolean;
  onSubmit: (input: string) => void;
};

export function PromptInput({ canSubmit, onSubmit }: PromptInputProps) {
  const theme = useTheme();
  const inputRef = useRef<TextareaRenderable>(null);
  const { height } = useTerminalDimensions();

  const history = useRef<string[]>([]);
  const stepsBack = useRef(0);
  const draft = useRef("");

  const handleSubmit = () => {
    const prompt = inputRef.current?.plainText ?? "";
    if (prompt.trim() === "" || !canSubmit) return;

    if (history.current.at(-1) !== prompt) {
      history.current.push(prompt);
    }
    stepsBack.current = 0;

    inputRef.current?.clear();
    onSubmit(prompt);
  };

  useKeyboard((key) => {
    const textarea = inputRef.current;
    if (!textarea) return;

    if (key.name !== "up" && key.name !== "down") return;
    if (key.ctrl || key.meta || key.shift || key.option || key.super) return;

    const up = key.name === "up";
    const { visualRow } = textarea.visualCursor;
    if (up ? visualRow > 0 : visualRow < textarea.virtualLineCount - 1) return;

    const next = stepsBack.current + (up ? 1 : -1);
    if (next < 0 || next > history.current.length) return;

    if (stepsBack.current === 0) {
      draft.current = textarea.plainText;
    }
    stepsBack.current = next;

    textarea.setText(next === 0 ? draft.current : (history.current.at(-next) ?? ""));
    textarea.gotoBufferEnd();
    key.preventDefault();
  });

  return (
    <box
      style={{
        flexDirection: "row",
        paddingX: 1,
        border: true,
        borderStyle: "rounded",
        borderColor: theme.accent,
      }}
    >
      <box style={{ flexShrink: 0 }}>
        <text fg={theme.accent} attributes={TextAttributes.BOLD}>
          {"❯ "}
        </text>
      </box>
      <textarea
        ref={inputRef}
        focused
        placeholder="Type a message (Ctrl+C or /exit to quit)"
        placeholderColor={theme.muted}
        cursorColor={theme.foreground}
        textColor={theme.foreground}
        focusedTextColor={theme.foreground}
        keyBindings={keyBindings}
        onSubmit={handleSubmit}
        style={{ flexGrow: 1, maxHeight: Math.max(1, Math.min(maxRows, height - reservedRows)) }}
      />
    </box>
  );
}
