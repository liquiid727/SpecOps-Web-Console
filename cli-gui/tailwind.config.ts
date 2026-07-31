import type { Config } from "tailwindcss";

// All values route through the semantic CSS variables defined in
// client/styles/tokens.css + client/styles/themes/*.css, so every utility
// (and @apply rule) automatically follows the active data-theme
// (qoder-light / neo / classic / zcode).
export default {
  content: ["./client/**/*.{ts,tsx}", "./client/styles/**/*.css"],
  theme: {
    extend: {
      colors: {
        // Surfaces
        canvas: "var(--canvas)",
        rail: "var(--rail)",
        navigator: "var(--navigator)",
        terminal: "var(--terminal)",
        overlay: "var(--overlay)",
        surface: {
          DEFAULT: "var(--surface)",
          raised: "var(--surface-raised)",
          hover: "var(--surface-hover)",
          selected: "var(--surface-selected)"
        },
        page: "var(--bg-page)",
        panel: "var(--bg-panel)",
        sidebar: "var(--bg-sidebar)",
        // Text
        ink: "var(--text)",
        secondary: "var(--text-secondary)",
        tertiary: "var(--text-tertiary)",
        quaternary: "var(--text-quaternary)",
        muted: "var(--muted)",
        faint: "var(--faint)",
        // Borders
        line: {
          DEFAULT: "var(--border)",
          subtle: "var(--border-subtle)",
          strong: "var(--border-strong)"
        },
        // Accent + status
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          contrast: "var(--accent-contrast)"
        },
        focus: "var(--focus)",
        danger: {
          DEFAULT: "var(--danger)",
          muted: "var(--danger-muted)",
          border: "var(--danger-border)",
          text: "var(--danger-text)"
        },
        success: { muted: "var(--success-muted)", border: "var(--success-border)" },
        warning: {
          DEFAULT: "var(--warning)",
          muted: "var(--warning-muted)",
          border: "var(--warning-border)"
        },
        info: { muted: "var(--info-muted)", border: "var(--info-border)", icon: "var(--info-icon)" },
        running: "var(--running)",
        starting: "var(--starting)",
        stopped: "var(--stopped)",
        error: "var(--error)",
        blue: "var(--blue)",
        green: { DEFAULT: "var(--green)", bg: "var(--green-bg)" },
        red: "var(--red)",
        yellow: "var(--yellow)",
        diff: {
          "add-bg": "var(--diff-add-bg)",
          "add-text": "var(--diff-add-text)",
          "del-bg": "var(--diff-del-bg)",
          "del-text": "var(--diff-del-text)",
          "header-bg": "var(--diff-header-bg)",
          "header-text": "var(--diff-header-text)"
        },
        bubble: { user: "var(--bubble-user-bg)", "user-border": "var(--bubble-user-border)" }
      },
      borderRadius: {
        xs: "var(--radius-xs)",
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        full: "var(--radius-full)",
        DEFAULT: "var(--radius)",
        small: "var(--radius-small)"
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        pop: "var(--shadow-pop)",
        drawer: "var(--shadow-drawer)",
        neo: "var(--neo-shadow)"
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"]
      },
      fontSize: {
        xs: "var(--text-xs)",
        sm: "var(--text-sm)",
        base: "var(--text-base)",
        md: "var(--text-md)",
        lg: "var(--text-lg)",
        xl: "var(--text-xl)",
        "2xl": "var(--text-2xl)",
        "3xl": "var(--text-3xl)"
      },
      zIndex: {
        rail: "var(--z-rail)",
        "drawer-backdrop": "var(--z-drawer-backdrop)",
        drawer: "var(--z-drawer)",
        menu: "var(--z-menu)",
        feedback: "var(--z-feedback)",
        modal: "var(--z-modal)"
      },
      transitionDuration: {
        fast: "var(--duration-fast)",
        normal: "var(--duration-normal)"
      },
      transitionTimingFunction: {
        out: "var(--ease-out)"
      }
    }
  },
  plugins: []
} satisfies Config;
