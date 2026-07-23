import { Text } from "ink";
import { type MarkedExtension, marked } from "marked";
import { markedTerminal } from "marked-terminal";

// @types/marked-terminal only publishes v6, which predates marked-terminal v7's API
// change: at runtime markedTerminal() returns a MarkedExtension, but the v6 types still
// declare a Renderer. The cast bridges that version skew until the types catch up.
const terminal = markedTerminal() as unknown as MarkedExtension;

// marked-terminal draws a horizontal rule the full width of the terminal, which
// overflows the padded transcript column and wraps onto a second line. Size the rule
// to the visible content width instead so it fits on one line at any terminal width.
if (terminal.renderer) {
  const CHROME_COLUMNS = 3; // Transcript padding (1 each side) plus the scroll bar (1).

  terminal.renderer.hr = () => {
    const width = Math.max(1, (process.stdout.columns ?? 80) - CHROME_COLUMNS);
    return `${"─".repeat(width)}\n\n`;
  };
}

marked.use(terminal);

type AssistantMessageProps = {
  content: string;
};

export function AssistantMessage({ content }: AssistantMessageProps) {
  return <Text>{(marked.parse(content) as string).trimEnd()}</Text>;
}
