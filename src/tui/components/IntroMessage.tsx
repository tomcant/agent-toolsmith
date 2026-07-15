import { Box, Text } from "ink";
import { theme } from "../theme.ts";

export function IntroMessage() {
  return (
    <Box paddingX={1}>
      <Text dimColor>
        Use <Text color={theme.accent}>/tools</Text> to list the available tools, or start a
        conversation to build and use new ones.
      </Text>
    </Box>
  );
}
