import { PasswordInput } from "@inkjs/ui";
import { Box, Text } from "ink";
import pkg from "../../../package.json" with { type: "json" };
import { isLightScheme } from "../color-scheme.ts";
import { theme } from "../theme.ts";

type ApiKeyPromptProps = {
  onSubmit: (key: string) => void;
};

export function ApiKeyPrompt({ onSubmit }: ApiKeyPromptProps) {
  const handleSubmit = (value: string) => {
    const key = value.trim();
    if (key === "") return;
    onSubmit(key);
  };

  return (
    <Box flexDirection="column" gap={1}>
      <Box flexDirection="column" paddingX={1} gap={1}>
        <Text>
          <Text bold color={theme.accent}>
            Agent Toolsmith
          </Text>
          <Text dimColor> v{pkg.version}</Text>
        </Text>
        <Text>
          <Text dimColor>
            No LLM provider is configured. Paste an Anthropic API key to continue, or press{" "}
          </Text>
          <Text color={theme.accent}>Ctrl+C</Text>
          <Text dimColor> to quit.</Text>
        </Text>
      </Box>
      <Box
        paddingX={1}
        borderStyle="round"
        borderColor={theme.accent}
        borderDimColor={!isLightScheme()}
      >
        <Box flexGrow={1}>
          <PasswordInput placeholder="sk-ant-..." onSubmit={handleSubmit} />
        </Box>
      </Box>
    </Box>
  );
}
