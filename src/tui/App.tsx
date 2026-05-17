import { Spinner, TextInput } from "@inkjs/ui";
import { Box, Text, useApp } from "ink";
import { useState } from "react";
import type { Agent, AgentEvent } from "#/agent";
import { isExitCommand } from "./commands.ts";

type HistoryItem =
  | { kind: "user"; id: number; content: string }
  | { kind: "assistant"; id: number; content: string }
  | {
      kind: "tool_call";
      id: number;
      tool_call_id: string;
      name: string;
      input: unknown;
      result?: {
        content: string;
        is_error: boolean;
      };
    }
  | { kind: "error"; id: number; content: string };

type AppProps = {
  agent: Agent;
};

export function App({ agent }: AppProps) {
  const { exit } = useApp();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [inputKey, setInputKey] = useState(0);
  const [busy, setBusy] = useState(false);

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
        setHistory((prev) => applyEvent(prev, event));
      }
    } catch (err) {
      const content = err instanceof Error ? err.message : String(err);
      setHistory((prev) => [...prev, { kind: "error", id: prev.length, content }]);
    }

    setBusy(false);
  };

  return (
    <Box flexDirection="column">
      {history.map((item) => (
        <Box key={`${item.kind}-${item.id}`} flexDirection="column" marginTop={1}>
          {renderHistoryItem(item)}
        </Box>
      ))}
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

function applyEvent(history: HistoryItem[], event: AgentEvent): HistoryItem[] {
  switch (event.type) {
    case "text": {
      const last = history.at(-1);
      if (last?.kind === "assistant") {
        return [
          ...history.slice(0, -1),
          {
            ...last,
            content: `${last.content}${event.text}`,
          },
        ];
      }
      return [
        ...history,
        {
          kind: "assistant",
          id: history.length,
          content: event.text,
        },
      ];
    }

    case "tool_call":
      return [
        ...history,
        {
          kind: "tool_call",
          id: history.length,
          tool_call_id: event.id,
          name: event.name,
          input: event.input,
        },
      ];

    case "tool_result": {
      const callIdx = history.findIndex(
        (item) => item.kind === "tool_call" && item.tool_call_id === event.tool_call_id,
      );
      if (callIdx === -1) {
        return history;
      }
      return [
        ...history.slice(0, callIdx),
        {
          ...(history[callIdx] as Extract<HistoryItem, { kind: "tool_call" }>),
          result: { content: event.content, is_error: event.is_error },
        },
        ...history.slice(callIdx + 1),
      ];
    }
  }
}

function renderHistoryItem(item: HistoryItem) {
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
          <Text>
            <Text color="gray">⚙ </Text>
            {item.name}({JSON.stringify(item.input)})
          </Text>
          {item.result &&
            (item.result.is_error ? (
              <Text color="red">
                <Text color="red">✗ </Text>
                {truncate(item.result.content, 120)}
              </Text>
            ) : (
              <Text>
                <Text color="green">→ </Text>
                {truncate(item.result.content, 120)}
              </Text>
            ))}
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

function truncate(content: string, max: number): string {
  return content.length > max ? `${content.slice(0, max)}…` : content;
}
