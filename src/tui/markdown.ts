import { Marked, type MarkedExtension } from "marked";
import { markedTerminal } from "marked-terminal";

type Renderer = NonNullable<MarkedExtension["renderer"]>;

// ANSI escape. Kept non-literal so the linter doesn't flag control characters, and so
// no raw control byte ends up in the source.
const ESC = String.fromCharCode(27);

// @types/marked-terminal only publishes v6, which predates marked-terminal v7's API
// change: at runtime markedTerminal() returns a MarkedExtension, but the v6 types still
// declare a Renderer. The cast below bridges that version skew until the types catch up.
const terminal = markedTerminal({
  showSectionPrefix: false,
  tableOptions: { style: { head: ["green", "bold"] } },
}) as unknown as MarkedExtension;

if (terminal.renderer) {
  renderInlineTokensInListItems(terminal.renderer);
  replaceListBulletGlyph(terminal.renderer);
  addGutterToCodeBlocks(terminal.renderer);
  addGutterToBlockquotes(terminal.renderer);
  fitHorizontalRuleToWidth(terminal.renderer);
}

const marked = new Marked(terminal);

export function renderMarkdown(content: string): string {
  return (marked.parse(content) as string).trimEnd();
}

// marked-terminal's `text` renderer emits a token's raw string and ignores any nested
// inline tokens, so bold/italic/code inside a (tight) list item render as literal
// markdown (e.g. `**bold**`). Paragraphs escape this because they parse their inline
// tokens. Recurse into those tokens when present so list items style the same as prose;
// leaf text tokens (no nested tokens) keep the original path.
function renderInlineTokensInListItems(renderer: Renderer): void {
  const renderText = renderer.text;
  if (!renderText) return;

  renderer.text = function (token) {
    return "tokens" in token && token.tokens
      ? this.parser.parseInline(token.tokens)
      : renderText.call(this, token);
  };
}

// marked-terminal marks unordered list items with a literal "* ", which reads as
// unrendered markdown. Swap it for a real bullet glyph (same width, so indentation
// still lines up; ordered items and literal asterisks in item text are untouched).
// marked-terminal relies on the "* " marker to re-break nested items onto their own
// line, and lists render inside-out — so only rewrite once the outermost list is
// fully assembled, otherwise nested items collapse onto their parent.
function replaceListBulletGlyph(renderer: Renderer): void {
  const renderList = renderer.list;
  if (!renderList) return;

  let listDepth = 0;
  renderer.list = function (token) {
    listDepth += 1;
    let out: string | false;
    try {
      out = renderList.call(this, token);
    } finally {
      listDepth -= 1;
    }
    return listDepth === 0 && typeof out === "string" ? out.replace(/^(\s*)\* /gm, "$1• ") : out;
  };
}

// marked-terminal renders a fenced code block as plain indented, syntax-highlighted
// text with no container, so it reads as "floating" in the transcript. Replace its
// leading indent (marked-terminal's default `tab`, 4 spaces) with a grey gutter bar
// on every line so the block reads as one contained region. Applied per line so it
// survives any terminal width and wrapping.
function addGutterToCodeBlocks(renderer: Renderer): void {
  const renderCode = renderer.code;
  if (!renderCode) return;

  const GUTTER = `${ESC}[90m│${ESC}[39m `; // grey vertical bar, then reset foreground

  renderer.code = function (token) {
    const out = renderCode.call(this, token);
    return typeof out === "string" ? out.replace(/^ {4}/gm, GUTTER) : out;
  };
}

// Give blockquotes the same gutter bar as code so they stop floating.
function addGutterToBlockquotes(renderer: Renderer): void {
  const renderBlockquote = renderer.blockquote;
  if (!renderBlockquote) return;

  const gutterRe = new RegExp(`^((?:${ESC}\\[[0-9;]*m)*) {4}`, "gm");

  renderer.blockquote = function (token) {
    const out = renderBlockquote.call(this, token);
    return typeof out === "string" ? out.replace(gutterRe, "$1│ ") : out;
  };
}

// marked-terminal draws a horizontal rule the full width of the terminal, which
// overflows the padded transcript column and wraps onto a second line. Size the rule
// to the visible content width instead so it fits on one line at any terminal width.
function fitHorizontalRuleToWidth(renderer: Renderer): void {
  // Transcript padding (1 each side) plus the scroll bar (1).
  const CHROME_COLUMNS = 3;

  renderer.hr = () => {
    const width = Math.max(1, (process.stdout.columns ?? 80) - CHROME_COLUMNS);
    return `${"─".repeat(width)}\n\n`;
  };
}
