import { Box, Text } from "ink";

type UserMessageProps = {
  content: string;
};

export function UserMessage({ content }: UserMessageProps) {
  return (
    <Box>
      <Box flexShrink={0}>
        <Text color="cyan">{"> "}</Text>
      </Box>
      <Box flexGrow={1}>
        <Text>{content}</Text>
      </Box>
    </Box>
  );
}
