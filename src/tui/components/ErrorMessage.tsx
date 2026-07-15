import { Box, Text } from "ink";
import { theme } from "../theme.ts";

type ErrorMessageProps = {
  content: string;
};

export function ErrorMessage({ content }: ErrorMessageProps) {
  return (
    <Box>
      <Box flexShrink={0}>
        <Text color={theme.error} bold>
          {"✗ "}
        </Text>
      </Box>
      <Box flexGrow={1}>
        <Text color={theme.error}>{content}</Text>
      </Box>
    </Box>
  );
}
