# SpecOS Project Instructions

Treat specs, rules, tests, and generated artifacts as one traceable delivery chain.

## Source Of Truth

1. Read the project entry in `README.md`.
2. Read the project mode in `docs/spec-modes/` (single official mode: GoalSpec / Agent-Native SDLC).
3. Read the Requirement Package index in `.requirements/README.md`.
4. Read stable platform and system design from `design/`.
5. Implement from the active Requirement Workspace under `.requirements/requirements/R0NN-<slug>/`, reading `prd.md` -> `index.yaml` -> selected `specs/S0N-<slug>/spec.md` -> `test.md` -> one `issues/ISSUE-*.md`.
6. Keep test evidence in `tests/`, rules in `rules/`, and agent responsibilities in `ai/agents/`.

## Coordinator And Dispatch

- `pola` is the coordinator. It classifies requests and routes them, but does not execute delivery work itself.
- User-facing routing targets only the four main agents: `architecture-agent`, `implementation-agent`, `testing-agent`, and `qa-agent`.
- All other roles are specialists. A main agent opens a specialist as an on-demand subagent through its `managed_by` ownership; specialists are never default entrypoints.
- `qa-agent` owns final acceptance and release readiness, including `reviewer`, `ci-editor`, and `deployment-agent` work.

## Delivery Rules

- One requirement = one Requirement Workspace: root PRD and acceptance aggregate child Spec Packages under `.requirements/requirements/R0NN-<slug>/`.
- One child Spec Package owns its `spec.md`, `test.md`, `review.md`, `acceptance.md`, `evidence/`, and one-file-per-Issue `issues/` directory.
- IDs are permanent anchors (`R0NN`, `REQ-R0NN-###`, `SPEC-`, `TEST-`, `ISSUE-`); never reuse or renumber.
- On requirement changes, create a new `type: change` package with `affects:` instead of rewriting an approved Spec.
- Preserve human-authored files unless an explicit overwrite is requested.
- Keep generated artifacts traceable to a Requirement Package.
- Cover empty, loading, success, and failure states for user-facing flows.
- Record assumptions when a requirement is ambiguous.
