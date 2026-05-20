import type { ToolMetadata } from "#/agent/tools/types.ts";
import { formatToolList } from "../commands.ts";
import { useTerminalWidth } from "../hooks.ts";
import { SystemMessage } from "./SystemMessage.tsx";

type ToolListProps = {
  tools: ToolMetadata[];
};

export function ToolList({ tools }: ToolListProps) {
  const width = useTerminalWidth();
  return <SystemMessage content={formatToolList(tools, width - 4)} />;
}
