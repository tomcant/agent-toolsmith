import { Text } from "ink";
import { Frame } from "./Frame.tsx";

type AssistantMessageProps = {
  content: string;
  width: number;
};

export function AssistantMessage({ content, width }: AssistantMessageProps) {
  return (
    <Frame label="agent" color="green" width={width}>
      <Text>{content}</Text>
    </Frame>
  );
}
