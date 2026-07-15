import { Box, Text } from "ink";
import type { ToolInput } from "#/agent/tools/types.ts";
import { theme } from "../theme.ts";
import { truncate } from "../utils.ts";

type ToolCallProps = {
  name: string;
  input: ToolInput;
  result?: {
    content: string;
    is_error: boolean;
  };
  aborted?: boolean;
};

export function ToolCall({ name, input, result, aborted }: ToolCallProps) {
  const status = getStatus(result, aborted);
  return (
    <Box flexDirection="column" paddingLeft={2}>
      <Box>
        <Text color={status.color} bold>
          {status.icon}{" "}
        </Text>
        <Text bold>{name}</Text>
        <Text dimColor>({formatInput(input)})</Text>
      </Box>
      {result ? (
        <Box paddingLeft={2}>
          <Text color={result.is_error ? theme.error : undefined} dimColor={!result.is_error}>
            {summarise(result.content)}
          </Text>
        </Box>
      ) : aborted ? (
        <Box paddingLeft={2}>
          <Text dimColor>interrupted</Text>
        </Box>
      ) : null}
    </Box>
  );
}

function getStatus(
  result: ToolCallProps["result"],
  aborted?: boolean,
): { icon: string; color: string } {
  if (!result) {
    return aborted ? { icon: "⊘", color: theme.muted } : { icon: "●", color: theme.running };
  }
  if (result.is_error) {
    return { icon: "✗", color: theme.error };
  }
  return { icon: "✓", color: theme.success };
}

function formatInput(input: ToolInput, max = 80): string {
  const parts = Object.entries(input).map(([key, value]) => `${key}: ${formatValue(value)}`);
  return truncate(parts.join(", "), max);
}

function formatValue(value: unknown, max = 60): string {
  const raw = typeof value === "string" ? value : JSON.stringify(value);
  return truncate(raw.replace(/\s+/g, " ").trim(), max);
}

function summarise(content: string, max = 100): string {
  const firstLine = content.split("\n").find((line) => line.trim()) ?? "";
  return truncate(firstLine, max);
}
