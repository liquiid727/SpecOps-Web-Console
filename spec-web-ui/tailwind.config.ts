import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#e5e7eb",
        canvas: "#0b0b0c",
        panel: "#111111",
        accent: {
          DEFAULT: "#60a5fa",
          strong: "#93c5fd",
          soft: "#172554"
        },
        coral: "#34d399",
        sand: "#18181b",
        line: "#27272a"
      },
      boxShadow: {
        panel: "0 0 0 1px rgba(39, 39, 42, 0.65)"
      },
      fontFamily: {
        sans: ["'Inter'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"]
      }
    }
  },
  plugins: []
};

export default config;
