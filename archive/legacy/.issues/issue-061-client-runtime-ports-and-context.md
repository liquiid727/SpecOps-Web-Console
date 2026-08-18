# Introduce ClientRuntime ports and React context

## Description
Create the transport-neutral ClientRuntime boundary used by product UI. Feature components must consume domain ports rather than HTTP, WebSocket, browser globals, or Tauri IPC directly.

## Acceptance Criteria
- [x] Define ClientRuntime, EnginePort, SessionPort, EventPort, TerminalPort, WorkspacePort, and PlatformPort contracts.
- [x] Mount one runtime through React context and migrate the first Session/Event consumers.
- [x] Keep transport serialization inside LocalHttpRuntime or compatibility adapters.
- [x] Add a guard test that rejects direct transport imports from feature components.
- [x] Preserve existing local browser behavior and both i18n modes.

## Dependencies
None

## Type
fullstack

## Priority
high

## SPEC Reference
CLI-GUI-020; client-platform PRD CP-001, FR-CP-1/2; client-runtime SPEC Sections 1 and 3.

## Validation
- `npm --prefix cli-gui run test -- --run`
- Contract test for feature components with a fake runtime and no global transport.

## Local Acceptance

- Accepted locally on 2026-07-29.
- Full suite: 47 files, 343 tests passed.
- Build and `ui:check` passed; build retains the existing chunk-size warning.
- Playwright E2E could not launch Chromium because the execution sandbox denied Mach port access; no product assertion ran.
- GitHub shipping remains pending because `gh` is unavailable and the current feature branch contains unrelated user work.
