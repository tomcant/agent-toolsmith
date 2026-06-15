import { Box, Text } from "ink";
import type { ReactNode } from "react";

type OverlayProps = {
  title: string;
  children: ReactNode;
};

export function Overlay({ title, children }: OverlayProps) {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
      <Box marginBottom={1}>
        <Text color="cyan" bold>
          {`▌ ${title}`}
        </Text>
      </Box>
      {children}
      <Box marginTop={1}>
        <Text color="cyan" dimColor>
          Esc to close
        </Text>
      </Box>
    </Box>
  );
}
