import { TextAttributes } from "@opentui/core";
import type { ToolMetadata } from "#/agent/tools/types.ts";
import { toolListRows } from "../commands.ts";
import { useTheme } from "../theme.ts";

type ToolListProps = {
  tools: ToolMetadata[];
};

export function ToolList({ tools }: ToolListProps) {
  const theme = useTheme();
  const rows = toolListRows(tools);

  if (rows.length === 0) {
    return <text fg={theme.muted}>No tools available.</text>;
  }

  return (
    <box>
      {rows.map((row) => (
        <box key={row.name} style={{ flexDirection: "row" }}>
          <box style={{ flexShrink: 0, marginRight: 2 }}>
            <text attributes={TextAttributes.BOLD}>{row.name}</text>
          </box>
          <box style={{ flexGrow: 1 }}>
            <text fg={theme.muted} wrapMode="none" truncate>
              {row.description}
            </text>
          </box>
        </box>
      ))}
    </box>
  );
}
