# CLI GUI MVP02

MVP02 turns the MVP01 local console foundation into a desktop-first product that
can run day-to-day Codex and Claude Code work without requiring the user to open
an external terminal.

## Release Definition

- **MVP02-A — Desktop Terminal Replacement:** local Workspace selection, Engine
  readiness, Chat-first Session creation, streaming execution, approval,
  cancellation, resume, transcript replay, and read-only Diff inspection.
- **MVP02-B — Remote Control (descoped):** responsive Web clients control the
  same local runtime through the Control Server and `agentd`. This slice has
  been removed from the current roadmap; its Issues (#076-#089) were deleted.
  The remote PRD/SPEC documents are retained for future reference only.
- **MVP03 — App Replacement:** official Codex/Claude App replacement and
  differentiated features such as task timelines, reports, RepoWiki, generated
  Skills, and richer themes.

## Product Inputs

- [client-platform-prd.md](./client-platform-prd.md)
- [desktop-terminal-replacement-prd.md](./desktop-terminal-replacement-prd.md)
- [remote-prd.md](./remote-prd.md)
- [remote.md](./remote.md) — original human-authored concept, retained unchanged

## Technical Specifications

Read [spec/architecture-spec.md](./spec/architecture-spec.md) first. It indexes:

- client runtime and shared UI architecture
- Agent Backend and Transport contracts
- MVP02 UI and interaction behavior
- Tauri desktop host and local TypeScript runtime
- remote architecture, API, and security contracts
- traceable verification requirements

## Delivery Rule

MVP02-A is the completion gate for MVP02. Remote control (MVP02-B) has been
descoped; if it returns to the roadmap it must reuse the local contracts proven
by MVP02-A and must not introduce a second Session Manager, Agent Runtime, or
transcript model.

## Status Convention

The table below describes the current local worktree, not a shipped release.
`accepted_local` means the scoped local tests and review passed; it does not
mean that Git commit, remote merge, issue closure, real-engine acceptance, or
the parent Feature Spec promotion is complete.

The MVP01 execution cards under `mvp01/issues/` are a separate numbered set
from the canonical backlog under `../../../.issues/`. Matching numbers are not a
completion mapping. MVP02 work is tracked by the canonical Issue files and
the implementation/review records at the repository root.

## Implementation Status

| Slice | Status | Evidence / remaining gate |
|---|---|---|
| ClientRuntime ports and local runtime | accepted locally | Issues #061 and #063 pass scoped local suites; broader browser and release evidence remains |
| Engine readiness and Chat-first entry | accepted locally | Issues #065 and #066 pass scoped local suites; `CHAT_ENABLED` turned on 2026-07-30 after codex real-engine chat-turn evidence (issue #062/#075 records) |
| Agent Backend and schema v4 | accepted locally | Issue #062: registry/normalizer wired into `server/production.ts`; v3→v4 migration with backup covered; codex real-engine json-stream turn + native resume verified 2026-07-30; native SDK/ACP fixtures remain pending |
| Composer, transcript, approval, Diff, monitor | accepted locally | Issues #067-#070 and #073 pass scoped local suites (streaming, resume, approval, read-only diff, responsive i18n); 50k-event stress and browser-matrix checks skipped |
| Tauri least privilege | accepted locally | Issue #071: loopback, bearer, and supervision covered; actual packaged sidecar run and native capability acceptance skipped (needs packaging environment) |
| Contract/performance/security suites | accepted locally | Issue #074: `server/contract-security.test.ts` plus performance baselines (1000 events < 100ms); platform matrix skipped |
| Remote control | descoped | Issues #076-#089 deleted; only typed envelopes and deny-by-default policy remain in the codebase as contract stubs |
| Release gate | pending real-engine evidence | Issue #075 is `skipped-environment`; automated build, unit, and UI-governance checks pass locally, but real locked Codex/Claude no-external-terminal records are still required |
