# Spec Modes

This project runs one official mode: **GoalSpec** (Agent-Native SDLC).

- `GoalSpec`: one requirement = one Requirement Package under `.requirements/requirements/R0NN-<slug>/`, with PRD -> Spec -> Test -> Issues -> Verify connected by stable IDs.
- `LiteSpec` / `EnterpriseSpec` are demoted to optional plugin specs (see `docs/spec-modes/plugins/` when installed); they do not change the Requirement Package model.

Read:

- `docs/spec-modes/GoalSpec/README.md`
- `.requirements/README.md` — the Requirement Package index and templates
- Full standard: `docs/spec-modes/GoalSpec/agent-native-sdlc-standard.md` when present
