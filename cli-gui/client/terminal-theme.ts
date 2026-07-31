import type { ThemeId } from "./theme";

export function getTerminalTheme(theme: ThemeId) {
  if (theme === "neo") {
    return {
      background: "#f7f9fc", foreground: "#172033", cursor: "#0f172a", cursorAccent: "#f7f9fc", selectionBackground: "#c9d7e8",
      black: "#172033", brightBlack: "#5d6b7c", red: "#b42318", brightRed: "#d92d20", green: "#067647", brightGreen: "#039855", yellow: "#a15c00", brightYellow: "#c47f00", blue: "#175cd3", brightBlue: "#1570ef", magenta: "#7a5af8", brightMagenta: "#9b8afb", cyan: "#087f8c", brightCyan: "#0e9f9a", white: "#eef2f6", brightWhite: "#ffffff"
    };
  }
  if (theme === "zcode") {
    return {
      background: "#111111", foreground: "#e5e5e5", cursor: "#22c55e", cursorAccent: "#111111", selectionBackground: "#3d3d3d",
      black: "#161616", brightBlack: "#737373", red: "#f0555e", brightRed: "#ff8d94", green: "#22c55e", brightGreen: "#4ade80", yellow: "#eab308", brightYellow: "#facc15", blue: "#60a5fa", brightBlue: "#93c5fd", magenta: "#c084fc", brightMagenta: "#d8b4fe", cyan: "#22d3ee", brightCyan: "#67e8f9", white: "#d4d4d4", brightWhite: "#f5f5f5"
    };
  }
  return {
    background: "#101011", foreground: "#d7d5d0", cursor: "#e68766", cursorAccent: "#101011", selectionBackground: "#45434a",
    black: "#151516", brightBlack: "#77746e", red: "#e06972", brightRed: "#ef8d94", green: "#6cc49a", brightGreen: "#8dd4b0", yellow: "#d9b56f", brightYellow: "#e9ca8e", blue: "#79a8d8", brightBlue: "#9bc0e5", magenta: "#b99ad8", brightMagenta: "#cdb2e5", cyan: "#74bfc5", brightCyan: "#98d2d6", white: "#d7d5d0", brightWhite: "#f0efec"
  };
}
