import { TextAttributes } from "@opentui/core";
import pkg from "../../../package.json" with { type: "json" };
import { useTheme } from "../theme.ts";

export function Banner() {
  const theme = useTheme();
  return (
    <box>
      <ascii-font text="TOOLSMITH" font="tiny" color={theme.banner} />
      <box style={{ marginTop: 1, flexDirection: "row" }}>
        <text fg={theme.accent} attributes={TextAttributes.BOLD}>
          Agent Toolsmith
        </text>
        <text fg={theme.muted}> v{pkg.version}</text>
      </box>
    </box>
  );
}
