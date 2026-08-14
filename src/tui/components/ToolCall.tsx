import { TextAttributes } from "@opentui/core";
import type { OutputFormat, ToolInput } from "#/agent/tools/types.ts";
import { type Theme, useTheme } from "../theme.ts";
import { truncate } from "../utils.ts";
import { Markdown } from "./Markdown.tsx";

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
  const theme = useTheme();
  const status = getStatus(theme, result, aborted);

  return (
    <box style={{ paddingLeft: 2 }}>
      <box style={{ flexDirection: "row" }}>
        <text fg={status.color} attributes={TextAttributes.BOLD}>
          {status.icon}{" "}
        </text>
        <text attributes={TextAttributes.BOLD}>{name}</text>
        <text fg={theme.muted}>({formatInput(input)})</text>
      </box>
      {result || aborted ? <ToolOutput name={name} result={result} color={status.color} /> : null}
    </box>
  );
}

type ToolOutputProps = {
  name: string;
  result?: ToolResult;
  color: string;
};

function ToolOutput({ name, result, color }: ToolOutputProps) {
  const theme = useTheme();
  const content = result?.content.trimEnd();

  return (
    <box style={{ paddingLeft: 1, border: ["left"], borderColor: color }}>
      {content ? (
        <ToolOutputBody name={name} content={content} result={result} />
      ) : (
        <text fg={theme.muted}>{result ? "(no output)" : "Interrupted"}</text>
      )}
    </box>
  );
}

type ToolOutputBodyProps = {
  name: string;
  content: string;
  result?: ToolResult;
};

function ToolOutputBody({ name, content, result }: ToolOutputBodyProps) {
  const theme = useTheme();

  if (result?.isError) {
    return <text fg={theme.error}>{content}</text>;
  }
  if (result?.outputFormat === "markdown") {
    return <Markdown content={content} />;
  }
  if (name === "inspect") {
    return <Markdown content={`\`\`\`typescript\n${content}\n\`\`\``} />;
  }
  return <text fg={theme.foreground}>{content}</text>;
}

function getStatus(
  theme: Theme,
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
