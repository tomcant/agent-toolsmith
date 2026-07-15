import { Box, Text } from "ink";
import { theme } from "../theme.ts";

type SystemMessageProps = {
  content: string;
};

export function SystemMessage({ content }: SystemMessageProps) {
  return (
    <Box>
      <Box flexShrink={0}>
        <Text color={theme.muted}>{"⏺ "}</Text>
      </Box>
      <Box flexGrow={1}>
        <Text color={theme.muted}>{content}</Text>
      </Box>
    </Box>
  );
}
