import { Box, Text } from "ink";

type SystemMessageProps = {
  content: string;
};

export function SystemMessage({ content }: SystemMessageProps) {
  return (
    <Box>
      <Box flexShrink={0}>
        <Text color="gray">{"⏺ "}</Text>
      </Box>
      <Box flexGrow={1}>
        <Text color="gray">{content}</Text>
      </Box>
    </Box>
  );
}
