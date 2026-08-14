import { useTheme } from "../theme.ts";

type MarkdownProps = {
  content: string;
  streaming?: boolean;
};

export function Markdown({ content, streaming = false }: MarkdownProps) {
  const theme = useTheme();
  return (
    <markdown
      content={content}
      streaming={streaming}
      internalBlockMode="top-level"
      tableOptions={{
        style: "grid",
        widthMode: "content",
        cellPaddingX: 1,
      }}
      syntaxStyle={theme.syntax}
    />
  );
}
