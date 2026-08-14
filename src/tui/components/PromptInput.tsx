import type { TextareaOptions, TextareaRenderable } from "@opentui/core";
import { TextAttributes } from "@opentui/core";
import { useTerminalDimensions } from "@opentui/react";
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

  const handleSubmit = () => {
    const input = inputRef.current?.plainText ?? "";
    if (input.trim() === "" || !canSubmit) return;
    inputRef.current?.clear();
    onSubmit(input);
  };

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
