import { Spinner, TextInput } from "@inkjs/ui";
import { Box, Text, useApp, useInput } from "ink";
import { type ReactNode, useRef, useState } from "react";
import type { Agent } from "#/agent";
import { type Command, parseCommand } from "./commands.ts";
import { AssistantMessage } from "./components/AssistantMessage.tsx";
import { Banner } from "./components/Banner.tsx";
import { ErrorMessage } from "./components/ErrorMessage.tsx";
import { SystemMessage } from "./components/SystemMessage.tsx";
import { ToolCall } from "./components/ToolCall.tsx";
import { ToolList } from "./components/ToolList.tsx";
import { UserMessage } from "./components/UserMessage.tsx";
import { applyAgentEvent, markAbortedToolCalls, type TranscriptItem } from "./transcript.ts";

type AppProps = {
  agent: Agent;
};

export function App({ agent }: AppProps) {
  const { exit } = useApp();
  const abortRef = useRef<AbortController | null>(null);
  const [textInputKey, setTextInputKey] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [overlay, setOverlay] = useState<ReactNode>(null);
  const [busy, setBusy] = useState(false);

  useInput((_input, key) => {
    if (!key.escape) {
      return;
    }
    if (overlay) {
      setOverlay(null);
      return;
    }
    if (busy) {
      abortRef.current?.abort();
    }
  });

  const appendSystemMessage = (content: string) => {
    setTranscript((prev) => [...prev, { kind: "system", id: prev.length, content }]);
  };

  const handleCommand = async (command: Command) => {
    switch (command.kind) {
      case "tools_list":
        setOverlay(<ToolList tools={agent.listTools()} />);
        return;
      case "tools_remove":
        await agent.removeTool(command.name);
        appendSystemMessage(`Removed tool '${command.name}'`);
        return;
      case "exit":
        exit();
        return;
    }
  };

  const handleSubmit = async (input: string) => {
    if (input.trim() === "") {
      return;
    }

    setTextInputKey((k) => k + 1);
    setOverlay(null);

    try {
      const command = parseCommand(input);
      if (command) {
        await handleCommand(command);
        return;
      }
    } catch (err) {
      appendSystemMessage(err instanceof Error ? err.message : String(err));
      return;
    }

    setTranscript((prev) => [...prev, { kind: "user", id: prev.length, content: input }]);
    setBusy(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      for await (const event of agent.turn(input, controller.signal)) {
        setTranscript((prev) => applyAgentEvent(prev, event));
      }
      if (controller.signal.aborted) {
        setTranscript(markAbortedToolCalls);
        appendSystemMessage("Interrupted");
      }
    } catch (err) {
      const content = err instanceof Error ? err.message : String(err);
      setTranscript((prev) => [...prev, { kind: "error", id: prev.length, content }]);
    } finally {
      abortRef.current = null;
      setBusy(false);
    }
  };

  return (
    <Box flexDirection="column" gap={1}>
      <Banner />
      {transcript.map((item) => (
        <Box key={`${item.kind}-${item.id}`} paddingX={1}>
          {renderTranscriptItem(item)}
        </Box>
      ))}
      {busy && (
        <Box paddingX={1}>
          <Spinner label="Thinking..." />
        </Box>
      )}
      {overlay && (
        <Box flexDirection="column" gap={1} paddingX={1}>
          {overlay}
          <Text dimColor>Esc to close</Text>
        </Box>
      )}
      <Box paddingX={1} borderStyle="round" borderColor="cyan" borderDimColor>
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
      return (
        <ToolCall name={item.name} input={item.input} result={item.result} aborted={item.aborted} />
      );
    case "system":
      return <SystemMessage content={item.content} />;
    case "error":
      return <ErrorMessage content={item.content} />;
  }
}
