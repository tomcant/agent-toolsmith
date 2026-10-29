import { useAnimationTick } from "@opentui/react";
import { useState } from "react";

const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

type SpinnerProps = {
  color: string;
};

export function Spinner({ color }: SpinnerProps) {
  const [frame, setFrame] = useState(0);
  useAnimationTick(12.5, () => setFrame((value) => (value + 1) % frames.length));
  return <text fg={color}>{frames[frame]}</text>;
}
