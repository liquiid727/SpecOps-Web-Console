# CLI-GUI-031 issue 099 implementation and verification handoff

- Decision: **accepted-with-waiver** for the local in-process contract scope.
- Implementation: machine-code failure classification; conservative side-effect folding; same-Attempt persistent-to-spawn transport fallback; and centralized redaction across vendor events, parsed events, metadata, components, diagnostics, logs, and transcript persistence.
- Changed production files: `cli-gui/shared/execution-attempt.ts`, `cli-gui/server/agent-backends.ts`, `cli-gui/server/orchestrator.ts`.
- Changed test files: `cli-gui/shared/execution-attempt.test.ts`, `cli-gui/server/agent-backends.test.ts`, `cli-gui/server/orchestrator.test.ts`.
- Evidence: Fairy focused 41 passed; independent focused 37 passed; full CLI-GUI 574 passed and 4 skipped.
- Gates: typecheck, lint/ui:check, build, `npx specos check`, and `git diff --check` passed. Build emitted only the existing chunk-size warning.
- Review: first read-only review found error-path redaction gaps and the second found vendor-event/component gaps; both were fixed. No third review was run because the loop limit is two rounds; final independent static audit and tests passed.
- Browser/platform: N/A per Test Spec; no screenshot or trace was fabricated.
- Waiver: real Provider/Codex, packaged Tauri, cross-process lock/fsync/crash recovery, and real stream interruption remain unavailable.
- Normalized result: `tests/results/cli-gui-031.issue-099.local.json`.
- Raw evidence: `tests/results/cli-gui-031.issue-099.failure.raw.json`.
