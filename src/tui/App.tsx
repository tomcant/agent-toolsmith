import { ScrollBar } from "@byteland/ink-scroll-bar";
import { defaultTheme, extendTheme, Spinner, TextInput, ThemeProvider } from "@inkjs/ui";
import { Box, Text, useApp, useInput, useStdout } from "ink";
import { ScrollView, type ScrollViewRef } from "ink-scroll-view";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
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
  const { stdout } = useStdout();
  const [rows, setRows] = useState(stdout?.rows ?? 24);
  const abortRef = useRef<AbortController | null>(null);
  const [textInputKey, setTextInputKey] = useState(0);
  const [showIntro, setShowIntro] = useState(true);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [overlay, setOverlay] = useState<{ title: string; content: ReactNode } | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [working, setWorking] = useState(false);

  const scrollRef = useRef<ScrollViewRef>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const stickToBottom = useRef(true);

  useEffect(() => {
    if (!stdout) return;
    const onResize = () => {
      setRows(stdout.rows ?? 24);
      scrollRef.current?.remeasure();
    };
    stdout.on("resize", onResize);
    return () => {
      stdout.off("resize", onResize);
    };
  }, [stdout]);

  const followOutput = useCallback(() => {
    if (stickToBottom.current) {
      scrollRef.current?.scrollToBottom();
    }
  }, []);

  useInput((_input, key) => {
    if (key.escape) {
      if (overlay) {
        setOverlay(null);
      } else if (working) {
        abortRef.current?.abort();
      }
      return;
    }

    if (key.pageUp || key.pageDown) {
      const view = scrollRef.current;
      if (!view) return;

      const page = Math.max(1, view.getViewportHeight() - 1);
      const offset = view.getScrollOffset();
      const bottom = view.getBottomOffset();
      const next = key.pageUp ? Math.max(0, offset - page) : Math.min(bottom, offset + page);
      stickToBottom.current = next >= bottom;
      view.scrollTo(next);
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
      case "clear":
        await agent.clear();
        setTranscript([]);
        setShowIntro(true);
        setElapsedMs(null);
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
    stickToBottom.current = true;
    setWorking(true);

    const startedAt = Date.now();
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
      setWorking(false);
      setElapsedMs(Date.now() - startedAt);
      abortRef.current = null;
    }
  };

  return (
    <ThemeProvider theme={inkUiTheme}>
      <Box flexDirection="column" height={rows}>
        <Box flexGrow={1} flexBasis={0}>
          <ScrollView
            ref={scrollRef}
            flexGrow={1}
            paddingX={1}
            onScroll={setScrollOffset}
            onContentHeightChange={(height) => {
              setContentHeight(height);
              followOutput();
            }}
            onViewportSizeChange={(size) => {
              setViewportHeight(size.height);
              followOutput();
            }}
          >
            <Box key="header" flexDirection="column" marginY={1} gap={1}>
              <Banner />
              {showIntro && <IntroMessage />}
            </Box>
            {transcript.map((item) => (
              <Box key={`${item.kind}-${item.id}`} marginBottom={1}>
                {renderTranscriptItem(item)}
              </Box>
            ))}
          </ScrollView>
          <ScrollBar
            placement="inset"
            contentHeight={contentHeight}
            viewportHeight={viewportHeight}
            scrollOffset={scrollOffset}
            color={theme.accent}
            autoHide
          />
        </Box>
        <Box flexShrink={0} flexDirection="column">
          {(working || elapsedMs !== null) && (
            <Box marginY={1} paddingX={1}>
              {working ? (
                <Spinner label="Working..." />
              ) : (
                <Text color={theme.muted} italic>
                  Worked for {formatDuration(elapsedMs ?? 0)}
                </Text>
              )}
            </Box>
          )}
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
                isDisabled={working}
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

function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}
