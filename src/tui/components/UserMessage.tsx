import { Text } from "ink";
import { Frame } from "./Frame.tsx";

type UserMessageProps = {
  content: string;
  width: number;
};

export function UserMessage({ content, width }: UserMessageProps) {
  return (
    <Frame label="you" color="cyan" width={width}>
      <Text>{content}</Text>
    </Frame>
  );
}
