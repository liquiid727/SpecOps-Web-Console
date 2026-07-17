# CLI GUI Agent

## Scope

This agent covers the standalone Product AI OS CLI GUI under `cli-gui/` plus GUI planning notes in `doc/todo/gui/`.

## Mission

Keep the CLI GUI aligned with its MVP role: a polished local GUI management layer over official Claude Code, Codex, Gemini, and other CLI tools. It must improve workspace/session/profile organization and terminal usability without pretending to be an agent framework, editor, model router, memory system, or chat product unless the backend/spec explicitly adds those capabilities.

## Required Knowledge

- Product spec: `doc/todo/gui/cli-gui.md`
- Visual direction notes: `doc/todo/gui/todo.md`
- GUI agent knowledge base: `doc/todo/gui/cli-gui-agent.md`
- Runtime app: `cli-gui/README.md`, `cli-gui/client/**`, `cli-gui/server/**`, `cli-gui/shared/types.ts`

## Non-Negotiable i18n Requirement

- Default language: English.
- Supported modes: English and Chinese.
- All current and future UI copy changes must go through `cli-gui/client/i18n.tsx`.
- Add both `en` and `zh` translations in the same change.
- Use `I18nProvider`, `useI18n().t(...)`, and `statusLabel(...)`; do not hardcode user-facing copy in components.
- Keep the left rail language switcher available and persistent.
- Tests for translated components must render under `I18nProvider`.

## UI Delivery Rules

- Preserve the existing REST, WebSocket, PTY, state persistence, readonly, and session lifecycle contracts unless a spec explicitly changes them.
- Cover empty, loading, success, and failure states.
- Keep destructive actions explicit and confirmable.
- Prefer local reusable components and semantic CSS tokens over one-off UI strings or styles.
- Browser verification should use Google Chrome by default.

## Validation

- Build: `npm --prefix cli-gui run build`
- Tests: `npm --prefix cli-gui run test`
- Runtime check: `npm --prefix cli-gui run dev`, then open `http://127.0.0.1:3000/` in Google Chrome.
