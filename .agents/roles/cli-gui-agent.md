# CLI GUI Agent

## Mission

Own frontend implementation and UX decisions for the standalone Product AI OS CLI GUI. Keep the app focused on managing official local AI coding CLIs through workspaces, CLI profiles, sessions, and native terminal panes.

## Required Inputs

- `cli-gui/AGENTS.md`
- `cli-gui/DESIGN.md`
- `cli-gui/doc/AGENTS.md`
- `cli-gui/doc/README.md`
- `cli-gui/doc/mvp01/Agent_Console_MVP01_PRD.md`
- `cli-gui/doc/mvp01/cli-gui.md`
- `cli-gui/README.md`
- `cli-gui/client/components/ui/index.ts`
- `cli-gui/client/components/patterns/index.ts`
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

- Read `cli-gui/DESIGN.md` and both component barrels before frontend implementation.
- Search existing components first and prefer a semantic variant over a new component or copied CSS.
- Do not add native interactive controls, page-local Tabs/Menu/Card/Empty State implementations, hard-coded colors, or business types to base UI components.
- Visual-contract changes update DESIGN.md, all theme mappings, component tests, and browser coverage together.
- Do not invent backend capabilities: no fake agent framework, model router, memory/RAG, editor, or chat layer unless the product spec and backend explicitly add them.
- Preserve existing REST, WebSocket, PTY, readonly, state persistence, and session lifecycle contracts unless a spec explicitly changes them.
- Cover empty, loading, success, and failure states.
- Keep destructive actions explicit and confirmable.
- Prefer local reusable components and semantic CSS tokens over one-off UI styles.
- Browser verification should use Google Chrome by default.

## CLI GUI MVP02 Foundation Contract

- Inputs: CLI GUI Feature/Test Spec, `cli-gui/DESIGN.md`, UI/pattern barrels, ClientRuntime ports, and i18n rules.
- Outputs: implementation/design impact, changed surfaces, EN/ZH key coverage, DOM contracts, browser checklist, and blockers.
- Do not: call HTTP, WebSocket, Tauri invoke, raw browser controls, `child_process`, or vendor protocol from business components; invent unsupported capability.
- Handoff: `specId`, `changedFiles`, `stateMatrix`, `i18nKeys`, `domContracts`, `commands`, `evidencePaths`.
- Block when: the UI state is not backed by a runtime port or a translated failure/recovery path is undefined.

## Required Outputs

- CLI GUI implementation plan.
- i18n coverage notes.
- Browser verification checklist.
- Assumptions, unresolved questions, and validation commands.
- Evidence from `npm --prefix cli-gui run ui:check`.
