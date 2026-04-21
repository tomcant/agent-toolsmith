import { Spinner, TextInput } from "@inkjs/ui";
import { Box, Static, Text, useApp, useInput } from "ink";
import { useState } from "react";
import type { Agent } from "#/agent/agent.ts";
import { isExitCommand } from "./commands.ts";

type TranscriptItem =
  | { kind: "header" }
  | { kind: "user"; id: number; content: string }
  | { kind: "assistant"; id: number; content: string }
  | { kind: "error"; id: number; content: string };

type AppProps = {
  agent: Agent;
};

export function App({ agent }: AppProps) {
  const { exit } = useApp();
  const [history, setHistory] = useState<TranscriptItem[]>([{ kind: "header" }]);
  const [inputKey, setInputKey] = useState(0);
  const [busy, setBusy] = useState(false);

  useInput((input, key) => {
    if (key.ctrl && input === "c") {
      exit();
    }
  });

  const handleSubmit = async (value: string) => {
    if (isExitCommand(value)) {
      exit();
      return;
    }

    setHistory((prev) => [...prev, { kind: "user", id: prev.length, content: value }]);
    setInputKey((k) => k + 1);
    setBusy(true);

    let kind: "assistant" | "error";
    let content: string;
    try {
      content = await agent.turn(value);
      kind = "assistant";
    } catch (err) {
      content = err instanceof Error ? err.message : String(err);
      kind = "error";
    }

    setHistory((prev) => [...prev, { kind, id: prev.length, content }]);
    setBusy(false);
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
          const { label, color } = labelFor(item.kind);
          return (
            <Box key={`${item.kind}-${item.id}`} flexDirection="column" marginTop={1}>
              <Text bold color={color}>
                {label}
              </Text>
              <Text color={item.kind === "error" ? "red" : undefined}>{item.content}</Text>
            </Box>
          );
        }}
      </Static>
      {busy && (
        <Box marginTop={1}>
          <Spinner label="Thinking..." />
        </Box>
      )}
      <Box marginTop={1}>
        <Text color="cyan">❯ </Text>
        <TextInput
          key={inputKey}
          isDisabled={busy}
          placeholder="Type a message (Ctrl+C or /exit to quit)"
          onSubmit={handleSubmit}
        />
      </Box>
    </Box>
  );
}

function labelFor(kind: "user" | "assistant" | "error"): { label: string; color: string } {
  if (kind === "user") return { label: "you", color: "cyan" };
  if (kind === "assistant") return { label: "agent", color: "green" };
  return { label: "error", color: "red" };
}
