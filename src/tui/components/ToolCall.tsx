import { Box, Text } from "ink";

type ToolCallProps = {
  name: string;
  input: unknown;
  result?: {
    content: string;
    is_error: boolean;
  };
};

export function ToolCall({ name, input, result }: ToolCallProps) {
  return (
    <Box flexDirection="column" paddingLeft={2}>
      <Box>
        <Text color="yellow">⚙ </Text>
        <Text color="yellow" bold>
          {name}
        </Text>
        <Text dimColor>{` ${JSON.stringify(input)}`}</Text>
      </Box>
      {result && (
        <Box paddingLeft={2}>
          {result.is_error ? (
            <Text color="red">
              <Text bold>✗ </Text>
              {truncate(result.content, 120)}
            </Text>
          ) : (
            <Text dimColor>
              <Text color="green" bold>
                →{" "}
              </Text>
              {truncate(result.content, 120)}
            </Text>
          )}
        </Box>
      )}
    </Box>
  );
}

function truncate(content: string, max: number): string {
  return content.length > max ? `${content.slice(0, max)}…` : content;
}
