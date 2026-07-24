import { Text } from "ink";
import { renderMarkdown } from "../markdown.ts";

type AssistantMessageProps = {
  content: string;
};

export function AssistantMessage({ content }: AssistantMessageProps) {
  return <Text>{renderMarkdown(content)}</Text>;
}
