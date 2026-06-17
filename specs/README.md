# SpecOS Knowledge Spine

SpecOS keeps project memory, active work, and delivery evidence under `specs/`.

The directory names stay simple for tooling, but their product meaning is SpecOS-specific:

- `current/` is **Project Memory**: accepted system facts, vocabulary, architecture context, and domain language.
- `changes/` is the **Change Workspace**: proposed deltas, contracts, task plans, review gates, and evidence while work is active.
- `archive/` is the **Evidence Archive**: completed change history after accepted facts have updated Project Memory.
- `_rules/` holds contract-writing governance and normalization rules.
- `_template/` holds reusable SpecOS contract and task templates.

Recommended lifecycle:

```text
spec-draft/
  -> specs/changes/<change-id>/spec.md
  -> task-plan.md + execution-plan.md + tests/schedules/
  -> implementation / tests / review / gate evidence
  -> accepted facts update specs/current/
  -> completed history moves to specs/archive/<change-id>/
```

SpecOS contracts should keep both human-readable Markdown and machine-readable YAML when applicable. Agents working on active changes must read both Project Memory and the relevant Change Workspace. Agents should write to `specs/current/` only as a final promotion step after the change has implementation, test, review, and acceptance evidence.

## Data Flow Layers

SpecOS keeps project knowledge maintainable by separating three layers:

```text
spec layer -> task layer -> evidence layer
```

- **Spec layer** records durable project memory and proposed deltas: `spec-draft/`, `specs/current/`, `specs/changes/<change-id>/spec.md`, rules, contracts, open questions, and accepted vocabulary.
- **Task layer** turns the spec into assigned work: `task-plan.md`, `execution-plan.md`, generated `tests/schedules/*.test-schedule.json`, owner agents, inputs, outputs, dependencies, and acceptance evidence.
- **Evidence layer** records what actually happened: implementation reports, normalized test results, gate reports, review reports, changelogs, promotion notes, and archived change workspaces.

New requirements should not jump directly from spec text to implementation. They should pass through a task layer so each agent has explicit ownership, traceable inputs, and required evidence.
