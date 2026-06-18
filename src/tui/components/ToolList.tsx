import { Box, Text } from "ink";
import type { ToolMetadata } from "#/agent/tools/types.ts";
import { toolListRows } from "../commands.ts";

type ToolListProps = {
  tools: ToolMetadata[];
};

export function ToolList({ tools }: ToolListProps) {
  const rows = toolListRows(tools);

  if (rows.length === 0) {
    return <Text color="gray">No tools available.</Text>;
  }

  return (
    <Box flexDirection="column">
      {rows.map((row) => (
        <Box key={row.name}>
          <Box flexShrink={0} marginRight={2}>
            <Text color="gray">{row.name}</Text>
          </Box>
          <Box flexGrow={1}>
            <Text color="gray" wrap="truncate-end">
              {row.description}
            </Text>
          </Box>
        </Box>
      ))}
    </Box>
  );
}
