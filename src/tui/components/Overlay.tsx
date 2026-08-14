import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";
import { useTheme } from "../theme.ts";

type OverlayProps = {
  title: string;
  children: ReactNode;
};

export function Overlay({ title, children }: OverlayProps) {
  const theme = useTheme();
  return (
    <box
      style={{
        flexShrink: 0,
        paddingX: 1,
        border: true,
        borderStyle: "rounded",
        borderColor: theme.accent,
      }}
    >
      <box style={{ marginBottom: 1 }}>
        <text fg={theme.accent} attributes={TextAttributes.BOLD}>
          {`▌ ${title}`}
        </text>
      </box>
      {children}
      <box style={{ marginTop: 1 }}>
        <text fg={theme.muted}>Esc to close</text>
      </box>
    </box>
  );
}
