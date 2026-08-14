import { Markdown } from "./Markdown.tsx";

type AssistantMessageProps = {
  content: string;
  streaming?: boolean;
};

export function AssistantMessage({ content, streaming }: AssistantMessageProps) {
  return <Markdown content={content} streaming={streaming} />;
}
