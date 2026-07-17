import { Text } from "ink";
import { type MarkedExtension, marked } from "marked";
import { markedTerminal } from "marked-terminal";

// @types/marked-terminal only publishes v6, which predates marked-terminal v7's API
// change: at runtime markedTerminal() returns a MarkedExtension, but the v6 types still
// declare a Renderer. The cast bridges that version skew until the types catch up.
marked.use(markedTerminal() as unknown as MarkedExtension);

type AssistantMessageProps = {
  content: string;
};

export function AssistantMessage({ content }: AssistantMessageProps) {
  return <Text>{(marked.parse(content) as string).trimEnd()}</Text>;
}
