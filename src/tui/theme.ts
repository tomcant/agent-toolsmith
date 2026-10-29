import type { NativeResourceOwner, SyntaxStyle, ThemeMode } from "@opentui/core";
import { createContext, useContext } from "react";
import { createSyntaxStyle } from "./syntax-style.ts";

export type Theme = ThemeColors & { syntax: SyntaxStyle };

export type ThemeColors = {
  accent: string;
  success: string;
  running: string;
  error: string;
  muted: string;
  foreground: string;
  userMessageBg: string;
  banner: string;
  code: {
    keyword: string;
    string: string;
    function: string;
    number: string;
    type: string;
    constant: string;
  };
};

const cache = new WeakMap<NativeResourceOwner, Map<ThemeMode, Theme>>();

export function createTheme(mode: ThemeMode, owner: NativeResourceOwner): Theme {
  let themes = cache.get(owner);
  if (!themes) {
    themes = new Map();
    cache.set(owner, themes);
  }
  const cached = themes.get(mode);
  if (cached) return cached;

  const colors = themeColors(mode);
  const theme = { ...colors, syntax: createSyntaxStyle(colors, owner) };
  themes.set(mode, theme);
  return theme;
}

function themeColors(mode: ThemeMode): ThemeColors {
  const light = mode === "light";
  return {
    accent: light ? "#0A7D2E" : "#28FF5A",
    success: light ? "#0A7D2E" : "#28FF5A",
    running: light ? "#8A6D00" : "#FFCB6B",
    error: light ? "#B32424" : "#FF6B6B",
    muted: light ? "#6B6B6B" : "#8A8A8A",
    foreground: light ? "#1A1A1A" : "#E6E6E6",
    userMessageBg: light ? "#E6E6E6" : "#404040",
    banner: light ? "#0A7D2E" : "#7CFF97",
    code: {
      keyword: light ? "#7A00CC" : "#C792EA",
      string: light ? "#0A7D2E" : "#C3E88D",
      function: light ? "#0050B3" : "#82AAFF",
      number: light ? "#B35900" : "#F78C6C",
      type: light ? "#8A6D00" : "#FFCB6B",
      constant: light ? "#B35900" : "#F78C6C",
    },
  };
}

export const ThemeContext = createContext<Theme | null>(null);

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error("ThemeContext is missing — render the app inside ThemeContext.");
  }
  return theme;
}
