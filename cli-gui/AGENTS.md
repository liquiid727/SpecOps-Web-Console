# CLI GUI Agent Instructions

## Scope

This file applies to all files under `cli-gui/`.

## Agent Binding

- Use `.agents/roles/cli-gui-agent.md` and `ai/agents/cli-gui-agent.md` for CLI GUI frontend/product UI work.
- Read `cli-gui/doc/AGENTS.md` before changing GUI layout, copy, settings, terminal workspace, sessions, workspaces, profiles, responsive behavior, or tests.

## Mandatory i18n Requirement

- Default language: English.
- Supported modes: English and Chinese.
- All user-facing copy changes must go through `client/i18n.tsx` with both `en` and `zh` values.
- Components must use `I18nProvider`, `useI18n().t(...)`, `statusLabel(...)`, or an equivalent i18n helper. Do not hardcode visible English or Chinese text in JSX.
- Language switching lives in Settings (Appearance) and stays persistent; do not mount a standalone rail switcher.
- Translated component tests must render under `I18nProvider`.

## UI Delivery Rules

- Before every frontend task, read `DESIGN.md`, `client/components/ui/index.ts`, and `client/components/patterns/index.ts`.
- Search the component barrels before creating UI. Extend an existing semantic variant when behavior is shared; do not copy markup or styles.
- Business components must not implement raw buttons, fields, text areas, selects, Tabs, Menus, Cards, or empty states. Use the internal library and pass translated visible copy from the caller.
- `components.css` owns reusable component styling. `qoder.css` owns page layout and domain structure. Both must use semantic tokens; do not hard-code colors.
- A visual-contract change must update `DESIGN.md`, default and alternate theme tokens, component tests, and relevant browser coverage in the same change.
- Preserve REST, WebSocket, PTY, readonly, persistence, and session lifecycle contracts unless a spec explicitly changes them.
- Do not add fake chat, model routing, editor, memory/RAG, or agent orchestration capabilities without matching backend/spec support.
- Cover empty, loading, success, and failure states.
- Keep destructive actions explicit and confirmable.
- Prefer reusable local components and semantic CSS tokens.
- Browser verification should use Google Chrome by default.

## Validation

- `npm --prefix cli-gui run ui:check`
- `npm --prefix cli-gui run build`
- `npm --prefix cli-gui run test`
- `npm --prefix cli-gui run test:e2e`
- `npm --prefix cli-gui run dev`, then open `http://127.0.0.1:3000/` in Google Chrome for runtime UI checks.
