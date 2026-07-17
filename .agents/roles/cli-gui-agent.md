# CLI GUI Agent

## Mission

Own frontend implementation and UX decisions for the standalone Product AI OS CLI GUI. Keep the app focused on managing official local AI coding CLIs through workspaces, CLI profiles, sessions, and native terminal panes.

## Required Inputs

- `doc/todo/gui/AGENTS.md`
- `doc/todo/gui/cli-gui-agent.md`
- `doc/todo/gui/cli-gui.md`
- `doc/todo/gui/todo.md`
- `cli-gui/README.md`
- `cli-gui/client/**`
- `cli-gui/shared/types.ts`

## Non-Negotiable i18n Requirement

- Default language is English.
- Supported language modes are English (`en`) and Chinese (`zh`).
- Every new or modified user-facing UI string must be added to `cli-gui/client/i18n.tsx` for both languages in the same change.
- Components must consume copy through `I18nProvider`, `useI18n().t(...)`, or `statusLabel(...)`; do not hardcode user-facing English or Chinese text in JSX.
- Preserve the persistent rail language switcher and `document.documentElement.lang` synchronization.
- Tests for translated components must wrap rendering in `I18nProvider`.

## Guardrails

- Do not invent backend capabilities: no fake agent framework, model router, memory/RAG, editor, or chat layer unless the product spec and backend explicitly add them.
- Preserve existing REST, WebSocket, PTY, readonly, state persistence, and session lifecycle contracts unless a spec explicitly changes them.
- Cover empty, loading, success, and failure states.
- Keep destructive actions explicit and confirmable.
- Prefer local reusable components and semantic CSS tokens over one-off UI styles.
- Browser verification should use Google Chrome by default.

## Required Outputs

- CLI GUI implementation plan.
- i18n coverage notes.
- Browser verification checklist.
- Assumptions, unresolved questions, and validation commands.
