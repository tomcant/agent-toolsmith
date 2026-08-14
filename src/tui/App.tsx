import type { ScrollBoxRenderable, ThemeMode } from "@opentui/core";
import { TextAttributes } from "@opentui/core";
import { useKeyboard, useRenderer } from "@opentui/react";
import "opentui-spinner/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import type { Agent, ModelInfo } from "#/agent";
import { type Command, parseCommand } from "./commands.ts";
import { ApiKeyPrompt } from "./components/ApiKeyPrompt.tsx";
import { AssistantMessage } from "./components/AssistantMessage.tsx";
import { Banner } from "./components/Banner.tsx";
import { ErrorMessage } from "./components/ErrorMessage.tsx";
import { IntroMessage } from "./components/IntroMessage.tsx";
import { Overlay } from "./components/Overlay.tsx";
import { PromptInput } from "./components/PromptInput.tsx";
import { StatusBar } from "./components/StatusBar.tsx";
import { SystemMessage } from "./components/SystemMessage.tsx";
import { ToolCall } from "./components/ToolCall.tsx";
import { ToolList } from "./components/ToolList.tsx";
import { UserMessage } from "./components/UserMessage.tsx";
import { useProportionalScrollbarThumb } from "./scrollbar.ts";
import { createTheme, ThemeContext } from "./theme.ts";
import { applyAgentEvent, markAbortedToolCalls, type TranscriptItem } from "./transcript.ts";

type OverlayState = {
  kind: "tools";
  title: string;
  content: ReactNode;
};

type AppProps = {
  agent: Agent;
  attachApiKey: (apiKey: string) => ModelInfo | null;
  themeMode: ThemeMode;
};

export function App({ agent, attachApiKey, themeMode: initialThemeMode }: AppProps) {
  const [showIntro, setShowIntro] = useState(true);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [overlay, setOverlay] = useState<OverlayState | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [working, setWorking] = useState(false);

  const [modelInfo, setModelInfo] = useState(agent.modelInfo());
  const [apiKeyError, setApiKeyError] = useState<string>();
  const [apiKeyAttempt, setApiKeyAttempt] = useState(0);
  const needsApiKey = modelInfo === null;

  const [themeMode, setThemeMode] = useState(initialThemeMode);
  const theme = createTheme(themeMode);

  const scrollRef = useRef<ScrollBoxRenderable>(null);
  useProportionalScrollbarThumb(scrollRef);

  const abortRef = useRef<AbortController>(null);
  const renderer = useRenderer();

  useEffect(() => {
    renderer.on("theme_mode", setThemeMode);
    return () => {
      renderer.off("theme_mode", setThemeMode);
    };
  }, [renderer]);

  useKeyboard((key) => {
    if (key.name === "escape") {
      if (overlay) {
        setOverlay(null);
      } else if (working) {
        abortRef.current?.abort();
      }
      return;
    }

    if (key.name === "pageup") {
      scrollRef.current?.scrollBy(-1, "viewport");
    } else if (key.name === "pagedown") {
      scrollRef.current?.scrollBy(1, "viewport");
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

  const toolsOverlay = (): OverlayState => ({
    kind: "tools",
    title: "Tools",
    content: <ToolList tools={agent.listTools()} />,
  });

  const handleCommand = async (command: Command) => {
    switch (command.kind) {
      case "tools_list":
        setOverlay(toolsOverlay());
        return;

      case "tools_remove":
        await agent.removeTool(command.name);
        appendSystemMessage(`Removed tool '${command.name}'`);
        setOverlay((prev) => (prev?.kind === "tools" ? toolsOverlay() : prev));
        return;

      case "clear":
        await agent.clear();
        setTranscript([]);
        setShowIntro(true);
        setOverlay(null);
        setElapsedMs(null);
        return;

      case "exit":
        renderer.destroy();
    }
  };

  const handleApiKeySubmit = (value: string) => {
    const apiKey = value.trim();
    if (apiKey === "") return;

    const modelInfo = attachApiKey(apiKey);
    if (!modelInfo) {
      setApiKeyError("Could not initialise an LLM client from that key.");
      setApiKeyAttempt((attempt) => attempt + 1);
      return;
    }

    setModelInfo(modelInfo);
  };

  const handleSubmit = async (input: string) => {
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
    setShowIntro(false);
    setOverlay(null);
    setElapsedMs(null);
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
    <ThemeContext value={theme}>
      <box style={{ flexGrow: 1 }}>
        <scrollbox
          ref={scrollRef}
          focusable={false}
          stickyScroll
          stickyStart="bottom"
          style={{ flexGrow: 1, paddingX: 1 }}
          verticalScrollbarOptions={{ marginLeft: 1 }}
        >
          <box style={{ paddingTop: 1, gap: 1 }}>
            <Banner />
            {needsApiKey ? (
              <ApiKeyPrompt key={apiKeyAttempt} error={apiKeyError} onSubmit={handleApiKeySubmit} />
            ) : (
              showIntro && <IntroMessage />
            )}
          </box>
          {transcript.map((item, index) => (
            <box key={`${item.kind}-${item.id}`} style={{ marginTop: 1 }}>
              {renderTranscriptItem(item, working && index === transcript.length - 1)}
            </box>
          ))}
        </scrollbox>
        <box style={{ paddingTop: 1, flexShrink: 0 }}>
          <box style={{ paddingX: 1 }}>
            {working ? (
              <box style={{ flexDirection: "row", gap: 1 }}>
                <spinner color={theme.accent} />
                <text fg={theme.foreground}>
                  Working... <span fg={theme.muted}>(esc to interrupt)</span>
                </text>
              </box>
            ) : (
              elapsedMs !== null && (
                <text fg={theme.muted} attributes={TextAttributes.ITALIC}>
                  Worked for {formatDuration(elapsedMs)}
                </text>
              )
            )}
          </box>
          {overlay && <Overlay title={overlay.title}>{overlay.content}</Overlay>}
          {!needsApiKey && <PromptInput canSubmit={!working} onSubmit={handleSubmit} />}
          {modelInfo && <StatusBar {...modelInfo} />}
        </box>
      </box>
    </ThemeContext>
  );
}

function renderTranscriptItem(item: TranscriptItem, streaming: boolean) {
  switch (item.kind) {
    case "user":
      return <UserMessage content={item.content} />;
    case "assistant":
      return <AssistantMessage content={item.content} streaming={streaming} />;
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
