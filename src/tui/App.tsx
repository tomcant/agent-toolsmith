import { TextInput } from "@inkjs/ui";
import { Box, Static, Text, useApp, useInput } from "ink";
import { useState } from "react";
import { isExitCommand } from "./commands.ts";

type TranscriptItem = { kind: "header" } | { kind: "user"; id: number; content: string };

export function App() {
  const { exit } = useApp();
  const [history, setHistory] = useState<TranscriptItem[]>([{ kind: "header" }]);
  const [inputKey, setInputKey] = useState(0);

  useInput((input, key) => {
    if (key.ctrl && input === "c") {
      exit();
    }
  });

  const handleSubmit = (value: string) => {
    if (isExitCommand(value)) {
      exit();
      return;
    }
    setHistory((prev) => [...prev, { kind: "user", id: prev.length, content: value }]);
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
            <Box key={`user-${item.id}`} flexDirection="column" marginTop={1}>
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
