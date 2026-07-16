import { isLightScheme } from "./color-scheme.ts";

export const theme = {
  get accent() {
    return isLightScheme() ? "#0A7D2E" : "#28FF5A";
  },
  get success() {
    return isLightScheme() ? "#0A7D2E" : "#28FF5A";
  },
  running: "yellow",
  error: "red",
  muted: "gray",
  get userMessageBg() {
    return isLightScheme() ? "#E6E6E6" : "#404040";
  },
} as const;
