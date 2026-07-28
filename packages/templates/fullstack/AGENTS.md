# SpecOS Project Instructions

Treat specs, rules, tests, and generated artifacts as one traceable delivery chain.

## Source Of Truth

1. Read the project entry in `README.md`.
2. Read the project mode in `docs/spec-modes/`.
3. Read active delivery state in `current/`.
4. Read human-authored drafts in `.prd/`.
5. Read stable platform and system design from `design/`.
6. Read epic, release, and dependency planning from `.features/roadmap.md`.
7. Implement from feature specs under `.features/<SPEC-ID>-<slug>/`.
8. Keep review evidence in `reviews/` and test evidence in `tests/`.
9. Keep rules in `rules/` and agent responsibilities in `ai/agents/`.

## Coordinator And Dispatch

- `pola` is the coordinator. It classifies requests and routes them, but does not execute delivery work itself.
- User-facing routing targets only the four main agents: `architecture-agent`, `implementation-agent`, `testing-agent`, and `qa-agent`.
- All other roles are specialists. A main agent opens a specialist as an on-demand subagent through its `managed_by` ownership; specialists are never default entrypoints.
- `qa-agent` owns final acceptance and release readiness, including `reviewer`, `ci-editor`, and `deployment-agent` work.

## Delivery Rules

- Preserve human-authored files unless an explicit overwrite is requested.
- Keep generated artifacts traceable to a draft, spec, or rule.
- Cover empty, loading, success, and failure states for user-facing flows.
- Record assumptions when a requirement is ambiguous.
