import { Spinner, TextInput } from "@inkjs/ui";
import { Box, Text, useApp } from "ink";
import { useState } from "react";
import type { Agent } from "#/agent";
import { isExitCommand } from "./commands.ts";
import { AssistantMessage } from "./components/AssistantMessage.tsx";
import { Banner } from "./components/Banner.tsx";
import { ErrorMessage } from "./components/ErrorMessage.tsx";
import { ToolCall } from "./components/ToolCall.tsx";
import { UserMessage } from "./components/UserMessage.tsx";
import { applyAgentEvent, type TranscriptItem } from "./transcript.ts";

type AppProps = {
  agent: Agent;
};

export function App({ agent }: AppProps) {
  const { exit } = useApp();
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [textInputKey, setTextInputKey] = useState(0);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (value: string) => {
    if (value.trim() === "") {
      return;
    }

    if (isExitCommand(value)) {
      exit();
      return;
    }

    setTranscript((prev) => [...prev, { kind: "user", id: prev.length, content: value }]);
    setTextInputKey((k) => k + 1);
    setBusy(true);

    try {
      for await (const event of agent.turn(value)) {
        setTranscript((prev) => applyAgentEvent(prev, event));
      }
    } catch (err) {
      const content = err instanceof Error ? err.message : String(err);
      setTranscript((prev) => [...prev, { kind: "error", id: prev.length, content }]);
    }

    setBusy(false);
  };

  return (
    <Box flexDirection="column">
      <Banner />
      {transcript.map((item) => (
        <Box key={`${item.kind}-${item.id}`} flexDirection="column" marginTop={1} paddingX={1}>
          {renderTranscriptItem(item)}
        </Box>
      ))}
      {busy && (
        <Box marginTop={1} paddingX={1}>
          <Spinner label="Thinking..." />
        </Box>
      )}
      <Box marginTop={1} paddingX={1} borderStyle="round" borderColor="cyan" borderDimColor>
        <Text color="cyan" bold>
          ❯{" "}
        </Text>
        <Box flexGrow={1}>
          <TextInput
            key={textInputKey}
            isDisabled={busy}
            placeholder="Type a message (Ctrl+C or /exit to quit)"
            onSubmit={handleSubmit}
          />
        </Box>
      </Box>
    </Box>
  );
}

function renderTranscriptItem(item: TranscriptItem) {
  switch (item.kind) {
    case "user":
      return <UserMessage content={item.content} />;
    case "assistant":
      return <AssistantMessage content={item.content} />;
    case "tool_call":
      return <ToolCall name={item.name} input={item.input} result={item.result} />;
    case "error":
      return <ErrorMessage content={item.content} />;
  }
}
