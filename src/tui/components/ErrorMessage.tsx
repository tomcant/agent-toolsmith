import { Box, Text } from "ink";

type ErrorMessageProps = {
  content: string;
};

export function ErrorMessage({ content }: ErrorMessageProps) {
  return (
    <Box>
      <Box flexShrink={0}>
        <Text color="red" bold>
          {"✗ "}
        </Text>
      </Box>
      <Box flexGrow={1}>
        <Text color="red">{content}</Text>
      </Box>
    </Box>
  );
}
