import { Box, Text } from "ink";
import { theme } from "../theme.ts";

export function IntroMessage() {
  return (
    <Box paddingX={1}>
      <Text>
        <Text dimColor>Use </Text>
        <Text color={theme.accent}>/tools</Text>
        <Text dimColor>
          {" "}
          to list the available tools, or start a conversation to build and use new ones.
        </Text>
      </Text>
    </Box>
  );
}
