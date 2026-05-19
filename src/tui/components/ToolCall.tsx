import { Box, Text } from "ink";
import type { ToolInput } from "#/agent/tools/types.ts";

type ToolCallProps = {
  name: string;
  input: ToolInput;
  result?: {
    content: string;
    is_error: boolean;
  };
};

export function ToolCall({ name, input, result }: ToolCallProps) {
  const status = getStatus(result);
  return (
    <Box flexDirection="column" paddingLeft={2}>
      <Box>
        <Text color={status.color} bold>
          {status.icon}{" "}
        </Text>
        <Text bold>{name}</Text>
        <Text dimColor>({formatInput(input)})</Text>
      </Box>
      {result && (
        <Box paddingLeft={2}>
          <Text color={result.is_error ? "red" : undefined} dimColor={!result.is_error}>
            {summarise(result.content)}
          </Text>
        </Box>
      )}
    </Box>
  );
}

function getStatus(result: ToolCallProps["result"]): { icon: string; color: string } {
  if (!result) {
    return { icon: "●", color: "yellow" };
  }
  if (result.is_error) {
    return { icon: "✗", color: "red" };
  }
  return { icon: "✓", color: "green" };
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

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}
