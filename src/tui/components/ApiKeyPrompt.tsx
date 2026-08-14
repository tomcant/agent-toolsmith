import { TextAttributes } from "@opentui/core";
import { useTheme } from "../theme.ts";
import { ErrorMessage } from "./ErrorMessage.tsx";

type ApiKeyPromptProps = {
  error?: string;
  onSubmit: (apiKey: string) => void;
};

export function ApiKeyPrompt({ error, onSubmit }: ApiKeyPromptProps) {
  const theme = useTheme();
  return (
    <box style={{ gap: 1 }}>
      <box>
        <text fg={theme.muted}>
          No LLM provider is configured. Paste an <span fg={theme.accent}>Anthropic API key</span>{" "}
          to continue, or press Ctrl+C to quit.
        </text>
      </box>
      <box
        style={{
          flexDirection: "row",
          paddingX: 1,
          border: true,
          borderStyle: "rounded",
          borderColor: theme.accent,
        }}
      >
        <input
          focused
          attributes={TextAttributes.HIDDEN}
          placeholder="sk-ant-..."
          placeholderColor={theme.muted}
          cursorColor={theme.foreground}
          onSubmit={(input) => onSubmit(input as string)}
          style={{ flexGrow: 1 }}
        />
      </box>
      {error && <ErrorMessage content={error} />}
    </box>
  );
}
