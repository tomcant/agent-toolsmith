import { Text } from "ink";
import { type MarkedExtension, marked } from "marked";
import { markedTerminal } from "marked-terminal";

// @types/marked-terminal only publishes v6, which predates marked-terminal v7's API
// change: at runtime markedTerminal() returns a MarkedExtension, but the v6 types still
// declare a Renderer. The cast bridges that version skew until the types catch up.
const terminal = markedTerminal() as unknown as MarkedExtension;

if (terminal.renderer) {
  // marked-terminal's `text` renderer emits a token's raw string and ignores any
  // nested inline tokens, so bold/italic/code inside a (tight) list item render as
  // literal markdown (e.g. `**bold**`). Paragraphs escape this because they parse
  // their inline tokens. Recurse into those tokens when present so list items style
  // the same as prose; leaf text tokens (no nested tokens) keep the original path.
  const renderText = terminal.renderer.text;
  if (renderText) {
    terminal.renderer.text = function (token) {
      return "tokens" in token && token.tokens
        ? this.parser.parseInline(token.tokens)
        : renderText.call(this, token);
    };
  }

  // marked-terminal draws a horizontal rule the full width of the terminal, which
  // overflows the padded transcript column and wraps onto a second line. Size the rule
  // to the visible content width instead so it fits on one line at any terminal width.
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
