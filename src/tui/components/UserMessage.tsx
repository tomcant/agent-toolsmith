import { Box, Text } from "ink";
import { theme } from "../theme.ts";

type UserMessageProps = {
  content: string;
};

export function UserMessage({ content }: UserMessageProps) {
  return (
    <Box>
      <Box flexShrink={0}>
        <Text color={theme.accent}>{"> "}</Text>
      </Box>
      <Box flexGrow={1}>
        <Text>{content}</Text>
      </Box>
    </Box>
  );
}
