import { Spinner, TextInput } from "@inkjs/ui";
import { Box, Static, Text, useApp, useInput } from "ink";
import { useState } from "react";
import type { Agent } from "#/agent/agent.ts";
import type { AgentEvent } from "#/agent/types.ts";
import { isExitCommand } from "./commands.ts";

type HistoryItem =
  | { kind: "header" }
  | { kind: "user"; id: number; content: string }
  | { kind: "assistant"; id: number; content: string }
  | { kind: "tool_call"; id: number; name: string; input: unknown }
  | { kind: "tool_result"; id: number; content: string; is_error: boolean }
  | { kind: "error"; id: number; content: string };

type AppProps = {
  agent: Agent;
};

export function App({ agent }: AppProps) {
  const { exit } = useApp();
  const [history, setHistory] = useState<HistoryItem[]>([{ kind: "header" }]);
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

    try {
      for await (const event of agent.turn(value)) {
        setHistory((prev) => [...prev, eventToItem(event, prev.length)]);
      }
    } catch (err) {
      const content = err instanceof Error ? err.message : String(err);
      setHistory((prev) => [...prev, { kind: "error", id: prev.length, content }]);
    }

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
          return (
            <Box key={`${item.kind}-${item.id}`} flexDirection="column" marginTop={1}>
              {renderItem(item)}
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

function eventToItem(event: AgentEvent, id: number): HistoryItem {
  switch (event.type) {
    case "text":
      return { kind: "assistant", id, content: event.text };
    case "tool_call":
      return { kind: "tool_call", id, name: event.name, input: event.input };
    case "tool_result":
      return { kind: "tool_result", id, content: event.content, is_error: event.is_error };
  }
}

function renderItem(item: Exclude<HistoryItem, { kind: "header" }>) {
  switch (item.kind) {
    case "user":
      return (
        <>
          <Text bold color="cyan">
            you
          </Text>
          <Text>{item.content}</Text>
        </>
      );
    case "assistant":
      return (
        <>
          <Text bold color="green">
            agent
          </Text>
          <Text>{item.content}</Text>
        </>
      );
    case "tool_call":
      return (
        <>
          <Text bold color="yellow">
            tool
          </Text>
          <Text>
            {item.name}({JSON.stringify(item.input)})
          </Text>
        </>
      );
    case "tool_result":
      return (
        <>
          <Text bold color={item.is_error ? "red" : "yellow"}>
            result
          </Text>
          <Text color={item.is_error ? "red" : undefined}>{item.content}</Text>
        </>
      );
    case "error":
      return (
        <>
          <Text bold color="red">
            error
          </Text>
          <Text color="red">{item.content}</Text>
        </>
      );
  }
}
