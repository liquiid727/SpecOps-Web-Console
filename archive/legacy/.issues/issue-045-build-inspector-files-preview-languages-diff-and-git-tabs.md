# Build inspector Files Preview Languages Diff and Git tabs

## Description
Transform the right inspector into an accessible lazy-loaded read-only project inspection workspace.

## Acceptance Criteria
- [x] Preserve session details or make them available through the revised inspector design.
- [x] Add accessible Preview, Files, Diff, and Git tabs.
- [x] Load inspector data only for the active tab and cancel stale requests.
- [x] Render an incremental file tree and open selected text files in Preview.
- [x] Display line-numbered read-only text, binary/oversized states, and language summary.
- [x] Render staged/unstaged Diff lines without relying on color alone.
- [x] Display branch, detached HEAD, status counts, clean, partial, timeout, and non-Git states.
- [x] Provide refresh without edit, stage, discard, or other mutation controls.
- [x] Add English/Chinese, keyboard, component, responsive drawer, and browser fixture tests.
- [x] Add the Settings category shell/placeholders and preserve existing workspace/profile management as a release integration task.
- [x] Add the final Playwright workbench suite covering shell, sessions, transcript, terminal, picker, and inspector flows.
- [x] Run npm test, npm run build, npm run test:e2e, readonly zero-write tests, and real Claude Code/Codex raw-terminal smoke validation.

## Dependencies
Issues #32, #43, #44

## Type
frontend

## Priority
high

## SPEC Reference
SPEC §2.3, §9.4; PRD US-019–026

## Source

- Traceability: legacy/unmapped
