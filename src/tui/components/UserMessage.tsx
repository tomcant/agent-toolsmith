import { useTheme } from "../theme.ts";

type UserMessageProps = {
  content: string;
};

export function UserMessage({ content }: UserMessageProps) {
  const theme = useTheme();
  return (
    <box style={{ flexDirection: "row" }}>
      <box style={{ flexShrink: 0 }}>
        <text fg={theme.accent}>{"> "}</text>
      </box>
      <box style={{ flexGrow: 1 }}>
        <text bg={theme.userMessageBg}>{content}</text>
      </box>
    </box>
  );
}
