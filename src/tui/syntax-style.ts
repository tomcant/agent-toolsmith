import { SyntaxStyle } from "@opentui/core";
import type { ThemeColors } from "./theme.ts";

export function createSyntaxStyle(theme: ThemeColors): SyntaxStyle {
  const code = theme.code;

  return SyntaxStyle.fromStyles({
    default: { fg: theme.foreground },

    "markup.heading.1": { fg: theme.accent, bold: true, underline: true },
    "markup.heading.2": { fg: theme.accent, bold: true },
    "markup.heading.3": { fg: theme.accent, bold: false },
    "markup.heading.4": { fg: theme.accent, bold: false },
    "markup.heading.5": { fg: theme.accent, bold: false },
    "markup.heading.6": { fg: theme.accent, bold: false },

    "markup.strong": { fg: theme.foreground, bold: true },
    "markup.italic": { italic: true },
    "markup.strikethrough": { fg: theme.muted },
    "markup.quote": { fg: theme.muted, italic: true },
    "markup.list": { fg: theme.accent },
    "markup.list.checked": { fg: theme.success },
    "markup.list.unchecked": { fg: theme.muted },
    "markup.raw": { fg: code.string },
    "markup.raw.block": { fg: theme.foreground },
    "markup.link": { fg: theme.accent, underline: true },
    "markup.link.label": { fg: theme.accent },
    "markup.link.url": { fg: theme.muted },

    comment: { fg: theme.muted, italic: true },
    keyword: { fg: code.keyword },

    string: { fg: code.string },
    "string.escape": { fg: code.constant },
    "character.special": { fg: code.constant },
    number: { fg: code.number },
    boolean: { fg: code.constant },
    constant: { fg: code.constant },

    function: { fg: code.function },
    constructor: { fg: code.type },
    type: { fg: code.type },
    module: { fg: code.type },

    variable: { fg: theme.foreground },
    "variable.builtin": { fg: code.constant },
    attribute: { fg: code.function },
    label: { fg: code.constant },

    operator: { fg: theme.muted },
    punctuation: { fg: theme.muted },
  });
}
