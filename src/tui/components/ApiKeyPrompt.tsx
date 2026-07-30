import { PasswordInput } from "@inkjs/ui";
import { Box, Text } from "ink";
import { isLightScheme } from "../color-scheme.ts";
import { theme } from "../theme.ts";
import { ErrorMessage } from "./ErrorMessage.tsx";

type ApiKeyPromptProps = {
  error?: string;
  onSubmit: (apiKey: string) => void;
};

export function ApiKeyPrompt({ error, onSubmit }: ApiKeyPromptProps) {
  return (
    <Box flexDirection="column" gap={1}>
      <Box>
        <Text>
          <Text dimColor>No LLM provider is configured. Paste an </Text>
          <Text color={theme.accent}>Anthropic API key</Text>
          <Text dimColor> to continue, or press Ctrl+C to quit.</Text>
        </Text>
      </Box>
      <Box
        paddingX={1}
        borderStyle="round"
        borderColor={theme.accent}
        borderDimColor={!isLightScheme()}
      >
        <PasswordInput placeholder="sk-ant-..." onSubmit={onSubmit} />
      </Box>
      {error && <ErrorMessage content={error} />}
    </Box>
  );
}
