import { Text } from "ink";

type AssistantMessageProps = {
  content: string;
};

export function AssistantMessage({ content }: AssistantMessageProps) {
  return <Text>{content}</Text>;
}
