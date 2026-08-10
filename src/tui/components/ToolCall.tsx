import { Box, Text } from "ink";
import type { OutputFormat, ToolInput } from "#/agent/tools/types.ts";
import { renderMarkdown } from "../markdown.ts";
import { theme } from "../theme.ts";
import { truncate } from "../utils.ts";

type ToolCallProps = {
  name: string;
  input: ToolInput;
  result?: ToolResult;
  aborted?: boolean;
};

type ToolResult = {
  content: string;
  isError: boolean;
  outputFormat?: OutputFormat;
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
      {result || aborted ? <ToolOutput name={name} result={result} color={status.color} /> : null}
    </Box>
  );
}

type ToolOutputProps = {
  name: string;
  result?: ToolResult;
  color: string;
};

function ToolOutput({ name, result, color }: ToolOutputProps) {
  const content = result?.content.trimEnd();
  const outputFormat = result?.isError ? "text" : result?.outputFormat;

  return (
    <Box
      borderStyle="single"
      borderTop={false}
      borderRight={false}
      borderBottom={false}
      borderLeftColor={color}
      paddingLeft={1}
    >
      {content ? (
        <Text
          color={result?.isError ? theme.error : undefined}
          dimColor={!result?.isError && name === "inspect"}
        >
          {outputFormat === "markdown" ? renderMarkdown(content) : content}
        </Text>
      ) : (
        <Text dimColor>{result ? "(no output)" : "Interrupted"}</Text>
      )}
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
  if (result.isError) {
    return { icon: "✗", color: theme.error };
  }
  return { icon: "●", color: theme.success };
}

function formatInput(input: ToolInput, max = 80): string {
  const parts = Object.entries(input).map(([key, value]) => `${key}: ${formatValue(value)}`);
  return truncate(parts.join(", "), max);
}

function formatValue(value: unknown, max = 60): string {
  const raw = typeof value === "string" ? value : JSON.stringify(value);
  return truncate(raw.replace(/\s+/g, " ").trim(), max);
}
