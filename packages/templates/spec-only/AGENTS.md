# SpecOS Agent Instructions

This template is spec-first: one requirement = one Requirement Package.

- Read `README.md` first.
- Read `docs/spec-modes/` to confirm the running mode (single official mode: GoalSpec / Agent-Native SDLC).
- Read the Requirement Package index in `.requirements/README.md`.
- Treat `design/` as the stable design source.
- Treat `.requirements/requirements/R0NN-<slug>/prd.md` and `index.yaml` as the root source for intent, then read the selected child `specs/S0N-<slug>/spec.md` -> `test.md` -> one `issues/ISSUE-*.md`.
- Child review, evidence, and QA decisions stay inside the same Spec Package; do not create a root issue file for new work.
- Keep generated tests and reports traceable to the active requirement ID (`R0NN`) and spec/test IDs.
- Route requests through the four main agents (`architecture-agent`, `implementation-agent`, `testing-agent`, `qa-agent`); open specialist roles only as on-demand subagents under their managing main agent.
