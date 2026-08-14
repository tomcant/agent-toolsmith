import { useTheme } from "../theme.ts";

type SystemMessageProps = {
  content: string;
};

export function SystemMessage({ content }: SystemMessageProps) {
  const theme = useTheme();
  return (
    <box style={{ flexDirection: "row" }}>
      <box style={{ flexShrink: 0 }}>
        <text fg={theme.muted}>{"⏺ "}</text>
      </box>
      <box style={{ flexGrow: 1 }}>
        <text fg={theme.muted}>{content}</text>
      </box>
    </box>
  );
}
