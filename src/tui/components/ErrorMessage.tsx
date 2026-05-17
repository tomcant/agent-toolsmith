import { Text } from "ink";
import { Frame } from "./Frame.tsx";

type ErrorMessageProps = {
  content: string;
  width: number;
};

export function ErrorMessage({ content, width }: ErrorMessageProps) {
  return (
    <Frame label="error" color="red" width={width}>
      <Text color="red">{content}</Text>
    </Frame>
  );
}
