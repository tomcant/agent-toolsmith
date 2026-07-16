import { defaultTheme, extendTheme, Spinner, TextInput, ThemeProvider } from "@inkjs/ui";
import { Box, Text, useApp, useInput } from "ink";
import { type ReactNode, useEffect, useRef, useState } from "react";
import type { Agent } from "#/agent";
import { isLightScheme } from "./color-scheme.ts";
import { type Command, parseCommand } from "./commands.ts";
import { AssistantMessage } from "./components/AssistantMessage.tsx";
import { Banner } from "./components/Banner.tsx";
import { ErrorMessage } from "./components/ErrorMessage.tsx";
import { IntroMessage } from "./components/IntroMessage.tsx";
import { Overlay } from "./components/Overlay.tsx";
import { StatusBar } from "./components/StatusBar.tsx";
import { SystemMessage } from "./components/SystemMessage.tsx";
import { ToolCall } from "./components/ToolCall.tsx";
import { ToolList } from "./components/ToolList.tsx";
import { UserMessage } from "./components/UserMessage.tsx";
import { theme } from "./theme.ts";
import { applyAgentEvent, markAbortedToolCalls, type TranscriptItem } from "./transcript.ts";

const inkUiTheme = extendTheme(defaultTheme, {
  components: {
    Spinner: {
      styles: {
        frame: () => ({ color: theme.accent }),
      },
    },
  },
});

type AppProps = {
  agent: Agent;
};

export function App({ agent }: AppProps) {
  const { exit } = useApp();
  const abortRef = useRef<AbortController | null>(null);
  const [textInputKey, setTextInputKey] = useState(0);
  const [showIntro, setShowIntro] = useState(true);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [overlay, setOverlay] = useState<{ title: string; content: ReactNode } | null>(null);
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

  useEffect(() => {
    const notices = agent.startupNotices();
    if (notices.length === 0) return;
    setTranscript((prev) => [
      ...prev,
      ...notices.map((content, idx) => ({
        kind: "system" as const,
        id: prev.length + idx,
        content,
      })),
    ]);
  }, [agent]);

  const appendSystemMessage = (content: string) => {
    setTranscript((prev) => [...prev, { kind: "system", id: prev.length, content }]);
  };

  const handleCommand = async (command: Command) => {
    switch (command.kind) {
      case "tools_list":
        setOverlay({
          title: "Tools",
          content: <ToolList tools={agent.listTools()} />,
        });
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
    setShowIntro(false);
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
    <ThemeProvider theme={inkUiTheme}>
      <Box flexDirection="column" gap={1}>
        <Banner />
        {showIntro && <IntroMessage />}
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
        <Box flexDirection="column">
          {overlay && <Overlay title={overlay.title}>{overlay.content}</Overlay>}
          <Box
            paddingX={1}
            borderStyle="round"
            borderColor={theme.accent}
            borderDimColor={!isLightScheme()}
          >
            <Text color={theme.accent} bold>
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
          <StatusBar {...agent.modelInfo()} />
        </Box>
      </Box>
    </ThemeProvider>
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
