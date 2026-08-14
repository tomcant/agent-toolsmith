import type { ModelInfo } from "#/agent";
import { useTheme } from "../theme.ts";

export function StatusBar({ provider, model }: ModelInfo) {
  const theme = useTheme();
  return (
    <box style={{ paddingX: 1 }}>
      <text fg={theme.muted}>
        {provider} / {model}
      </text>
    </box>
  );
}
