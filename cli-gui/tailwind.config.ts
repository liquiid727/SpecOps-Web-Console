import type { Config } from "tailwindcss";

export default {
  content: ["./client/**/*.{ts,tsx}", "./client/styles/**/*.css"],
  theme: {
    extend: {
      colors: {
        canvas: "var(--canvas)",
        surface: "var(--surface)",
        ink: "var(--text)",
        muted: "var(--muted)",
        accent: "var(--accent)"
      }
    }
  },
  plugins: []
} satisfies Config;
