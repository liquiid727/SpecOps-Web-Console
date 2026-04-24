import type { Config } from "tailwindcss";

const withOpacity = (variable: string) => `rgb(var(${variable}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        inherit: "inherit",
        current: "currentColor",
        transparent: "transparent",
        black: "#000",
        white: "#fff",
        slate: {
          50: withOpacity("--color-slate-50"),
          100: withOpacity("--color-slate-100"),
          200: withOpacity("--color-slate-200"),
          300: withOpacity("--color-slate-300"),
          400: withOpacity("--color-slate-400"),
          500: withOpacity("--color-slate-500"),
          600: withOpacity("--color-slate-600"),
          700: withOpacity("--color-slate-700"),
          800: withOpacity("--color-slate-800"),
          900: withOpacity("--color-slate-900")
        },
        ink: withOpacity("--color-ink"),
        canvas: withOpacity("--color-canvas"),
        panel: withOpacity("--color-panel"),
        accent: {
          DEFAULT: withOpacity("--color-accent"),
          strong: withOpacity("--color-accent-strong"),
          soft: withOpacity("--color-accent-soft")
        },
        coral: withOpacity("--color-coral"),
        sand: withOpacity("--color-sand"),
        line: withOpacity("--color-line")
      },
      boxShadow: {
        panel: "0 0 0 1px rgb(var(--color-line) / 0.65)"
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
