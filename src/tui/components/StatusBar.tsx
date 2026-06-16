import { Box, Text } from "ink";
import type { ModelInfo } from "#/agent";

export function StatusBar({ provider, model }: ModelInfo) {
  return (
    <Box paddingX={1}>
      <Text dimColor>
        {provider} / {model}
      </Text>
    </Box>
  );
}
