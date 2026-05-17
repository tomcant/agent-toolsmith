import { useStdout } from "ink";
import { useEffect, useState } from "react";

export function useTerminalWidth(): number {
  const { stdout } = useStdout();
  const [width, setWidth] = useState(stdout?.columns ?? 80);

  useEffect(() => {
    if (!stdout) return;

    const handler = () => setWidth(stdout.columns ?? 80);
    stdout.on("resize", handler);

    return () => {
      stdout.off("resize", handler);
    };
  }, [stdout]);

  return width;
}
