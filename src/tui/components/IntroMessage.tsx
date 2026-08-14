import { useTheme } from "../theme.ts";

export function IntroMessage() {
  const theme = useTheme();
  return (
    <box>
      <text fg={theme.muted}>
        Use <span fg={theme.accent}>/tools</span> to list the available tools, or start a
        conversation to build and use new ones.
      </text>
    </box>
  );
}
