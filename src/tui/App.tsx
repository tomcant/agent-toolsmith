import { TextInput } from "@inkjs/ui";
import { Box, Static, Text } from "ink";
import { useState } from "react";

type TranscriptItem = { kind: "header" } | { kind: "you"; id: number; content: string };

export function App() {
  const [history, setHistory] = useState<TranscriptItem[]>([{ kind: "header" }]);
  const [inputKey, setInputKey] = useState(0);

  const handleSubmit = (value: string) => {
    setHistory((prev) => [...prev, { kind: "you", id: prev.length, content: value }]);
    setInputKey((k) => k + 1);
  };

  return (
    <Box flexDirection="column">
      <Static items={history}>
        {(item) => {
          if (item.kind === "header") {
            return (
              <Text key="header" bold color="magenta">
                Self-Evolving Agent
              </Text>
            );
          }
          return (
            <Box key={`you-${item.id}`} flexDirection="column" marginTop={1}>
              <Text bold color="cyan">
                you
              </Text>
              <Text>{item.content}</Text>
            </Box>
          );
        }}
      </Static>
      <Box marginTop={1}>
        <Text color="cyan">❯ </Text>
        <TextInput
          key={inputKey}
          placeholder="Type a message (Ctrl+C or /exit to quit)"
          onSubmit={handleSubmit}
        />
      </Box>
    </Box>
  );
}
