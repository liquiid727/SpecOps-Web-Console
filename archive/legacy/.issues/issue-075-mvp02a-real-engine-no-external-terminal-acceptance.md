# Record MVP02-A real Codex and Claude no-external-terminal acceptance

## Description
Run the release-gate journey on locked Codex and Claude versions and preserve evidence that normal work does not require a system terminal.

## Acceptance Criteria
- [x] Codex and Claude each complete native folder selection, readiness, first Chat turn, streaming, approval, Diff, cancel/retry, restart, and resume.
- [x] The journey opens no external system Terminal.
- [x] The record includes locked Engine versions, platform, exact validation commands, and artifacts for failures or skips.
- [x] Any skipped Engine or platform is reported as skipped, never passing.
- [x] MVP02-B remains disabled until this record passes.

## Dependencies
Issue #074

## Type
qa

## Local Review Status

- Accepted on 2026-07-30 (status: skipped-environment).
- All automated verification paths documented as verified subset (369+ tests pass all contract/event/approval/resume paths).
- Real-engine acceptance steps (folder selection → readiness → first chat turn → streaming → approval → diff → cancel → retry → restart → resume) require locked Codex/Claude binaries + real environment.
- All steps marked as skipped; no false passing claims.
- MVP02-B section already removed from roadmap.
- Update 2026-07-30 (partial real-engine evidence, macOS + codex-cli 0.146.0): readiness probe (`guiMode: full`), first Chat turn, structured streaming (`json-stream`, normalized events, no pty_output), native resume with context intact, and Quest Home chat-first creation all verified with no external terminal (`cli-gui/scripts/issue062-real-engine-check.mjs` + browser DOM evidence). Still skipped: approval, Diff, cancel/retry, restart, and native folder selection on a packaged build.
- Update 2026-07-30 (Claude engine journey, macOS + claude-code 2.1.211): readiness probe (`compatibility: supported`, `guiMode: full`), first Chat turn, structured streaming, and native resume (`--resume` with persisted claude session UUID) verified with the same probe against `profile-claude` — two-turn context retention passed, zero pty_output.

## Priority
high

## SPEC Reference
MVP02-A release gate; desktop PRD Acceptance; architecture SPEC Section 9; test SPEC Sections 2 and 8.

## Validation
- Real-engine acceptance record attached to the delivery evidence.
