import { TextAttributes } from "@opentui/core";
import { useTheme } from "../theme.ts";

type ErrorMessageProps = {
  content: string;
};

export function ErrorMessage({ content }: ErrorMessageProps) {
  const theme = useTheme();
  return (
    <box style={{ flexDirection: "row" }}>
      <box style={{ flexShrink: 0 }}>
        <text fg={theme.error} attributes={TextAttributes.BOLD}>
          {"✗ "}
        </text>
      </box>
      <box style={{ flexGrow: 1 }}>
        <text fg={theme.error}>{content}</text>
      </box>
    </box>
  );
}
