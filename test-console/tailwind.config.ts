import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: "#0b1020",
        panel: "#11182d",
        muted: "#7b88a8",
        border: "#22304d",
        success: "#16a34a",
        warning: "#f59e0b",
        danger: "#ef4444",
        accent: "#4f46e5",
      },
    },
  },
  plugins: [],
} satisfies Config;
