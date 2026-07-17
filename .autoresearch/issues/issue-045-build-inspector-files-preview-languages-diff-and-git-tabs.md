# Build inspector Files Preview Languages Diff and Git tabs

## Description
Transform the right inspector into an accessible lazy-loaded read-only project inspection workspace.

## Acceptance Criteria
- [ ] Preserve session details or make them available through the revised inspector design.
- [ ] Add accessible Preview, Files, Diff, and Git tabs.
- [ ] Load inspector data only for the active tab and cancel stale requests.
- [ ] Render an incremental file tree and open selected text files in Preview.
- [ ] Display line-numbered read-only text, binary/oversized states, and language summary.
- [ ] Render staged/unstaged Diff lines without relying on color alone.
- [ ] Display branch, detached HEAD, status counts, clean, partial, timeout, and non-Git states.
- [ ] Provide refresh without edit, stage, discard, or other mutation controls.
- [ ] Add English/Chinese, keyboard, component, responsive drawer, and browser fixture tests.
- [ ] Add the Settings category shell/placeholders and preserve existing workspace/profile management as a release integration task.
- [ ] Add the final Playwright workbench suite covering shell, sessions, transcript, terminal, picker, and inspector flows.
- [ ] Run npm test, npm run build, npm run test:e2e, readonly zero-write tests, and real Claude Code/Codex raw-terminal smoke validation.

## Dependencies
Issues #32, #43, #44

## Type
frontend

## Priority
high

## SPEC Reference
SPEC §2.3, §9.4; PRD US-019–026

## Source
- `tasks/prd-cli-gui-workbench.md`
- `tasks/spec-cli-gui-workbench.md`
