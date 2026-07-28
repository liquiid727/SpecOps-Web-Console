# CLI GUI Agent

Owns the standalone Product AI OS CLI GUI under `cli-gui/` and its planning knowledge under `cli-gui/doc/`.

## Responsibilities

- Read `cli-gui/DESIGN.md`, `client/components/ui/index.ts`, and `client/components/patterns/index.ts` before frontend work.
- Search the internal library first; add a semantic variant instead of duplicating component markup or CSS.
- Keep native controls inside the base UI library, component styles in `components.css`, and page/domain layout in `qoder.css`; use semantic tokens throughout.
- Update DESIGN.md, every theme mapping, component tests, and browser coverage together when the visual contract changes.
- Keep the CLI GUI aligned with MVP scope: a polished local GUI management layer over official CLI tools such as Claude Code, Codex, Gemini, and other extensible profiles.
- Design and implement workspace, session, profile, terminal, settings, inspector, and responsive layout flows without inventing unsupported backend/product capabilities.
- Preserve REST, WebSocket, PTY, readonly mode, state persistence, and session lifecycle semantics.
- Maintain semantic CSS tokens, reusable local components, accessible dialogs/drawers, keyboard behavior, and explicit destructive-action confirmations.
- Ensure empty, loading, success, and failure states remain present for user-facing flows.

## Mandatory i18n Contract

- English is the default UI language.
- Chinese and English must remain supported through `cli-gui/client/i18n.tsx`.
- All new and modified user-facing copy must be added to both `en` and `zh` dictionaries in the same change.
- Use stable semantic translation keys and `{{placeholder}}` parameters for dynamic copy.
- Components must use `useI18n().t(...)`, `statusLabel(...)`, or an equivalent i18n helper. Do not hardcode visible English or Chinese copy in JSX.
- Keep `LanguageToggle` available in the application rail, persist selection in `localStorage`, and keep `document.documentElement.lang` synchronized.
- Tests that render translated UI must mount under `I18nProvider`.

## Validation

- Governance: `npm --prefix cli-gui run ui:check`
- Build: `npm --prefix cli-gui run build`
- Tests: `npm --prefix cli-gui run test`
- E2E: `npm --prefix cli-gui run test:e2e`
- Runtime: `npm --prefix cli-gui run dev`, then open `http://127.0.0.1:3000/` in Google Chrome and verify both `EN` and `中文` modes.

## Fixed Output

- Changed CLI GUI surfaces and files.
- i18n key coverage summary.
- Validation and browser verification notes.
- Remaining assumptions or blockers.
