# Sync Handoff Gateway

## Status

Accepted workflow contract for semantic change synchronization. This file records the human and agent handoff rule; it does not implement a hosted runner.

## Goal

Keep SpecOS specs useful by making every semantic change declare which neighboring assets were synchronized, which were intentionally waived, and which owner agent must handle remaining gaps.

## When This Gateway Applies

Require a `Sync Handoff` when a task changes meaning, behavior, ownership, routing, validation, or release evidence in any of these surfaces:

- `docs/spec-modes/`
- `.requirements/requirements/R0NN-<slug>/`, `design/`, or `docs/spec-modes/`
- `.agents/manifest.yaml`
- `.agents/roles/` or `ai/agents/`
- `skills/developer/`
- `rules/` or `.rules/`
- `ai/workflows/`
- Spec Package `evidence/` or `scripts/checks/`
- release evidence formats

For typo-only, formatting-only, or comment-only edits, write `sync_handoff_status: not_applicable` in the CI Record and state the reason.

The owning Issue first declares `change_profile` and an Execution Preflight
under `rules/shared/change-discipline.md`. A Sync Handoff consumes those
existing facts; it does not create a second review, QA, or approval state.

## Neighbor Asset Matrix

Use this matrix to decide what must be checked before handoff.

| Changed surface | Neighbor assets to check | Typical owner agent |
| --- | --- | --- |
| `docs/spec-modes/*` | agent loading order, active handoff notes, release gates, template defaults | `Fairy` or `spec-editor` |
| `design/*` | requirement packages, feature specs, UI design notes, rules, review gates | `spec-editor` |
| `.requirements/README.md` | dependent feature specs, release gates, implementation ordering, tests | `spec-editor` |
| `.requirements/requirements/*/specs/*/spec.md` | implementation notes, tests, Issue files, reviews, evidence, API contracts, release gates | `spec-editor` |
| `.agents/manifest.yaml` | `.agents/roles/*`, `ai/agents/*`, `.agents/README.md`, route preview expectations, scoped skills | `Fairy` with affected role owner |
| `.agents/roles/*` | matching `ai/agents/*`, manifest metadata, context includes, role outputs | affected role owner |
| `ai/agents/*` | matching `.agents/roles/*`, manifest outputs, workflow docs | affected role owner |
| `skills/developer/*` | manifest skill binding, role prompt assumptions, skill references, CI evidence if delivery-related | skill owner role |
| `rules/*` or `.rules/*` | affected specs, tests, role prompts, release gates, rule map | `reviewer` or domain owner |
| `ai/workflows/*` | `.agents/README.md`, route preview docs, role contracts, CI/release handoff | `execution-editor` |
| `specs/*/evidence/*` | Spec IDs, Requirement IDs, owner agents, result normalization, gate reports | `test-editor` |
| `scripts/checks/*` | local reproducibility docs, CI rule docs, package build/test commands, CI Record evidence | `ci-editor` |

## Sync Handoff Template

```markdown
## Sync Handoff
source_spec_or_rule: <spec, draft, rule, or workflow path>
change_profile: mechanical | behavior | cross-surface | high-risk
production_consumers_or_real_entry_paths:
  - <consumer, command, route, service, or workflow>
changed_surface:
  - <paths changed in this task>
neighbor_assets_checked:
  - <path or surface checked, with short result>
updated_assets:
  - <path updated, or none>
waived_assets:
  - <path or surface not updated + reason>
open_sync_risks:
  - <risk, or none>
owner_agent: <registered role from .agents/manifest.yaml, or Fairy>
next_gate: <review | test | ci | qa | merge | none>
```

## Coordinator Rules

- `Fairy` owns final sync judgment for multi-agent work.
- Supporting agents may report local sync risks, but they must not turn local guesses into global requirements.
- `Fairy` must reject false positives when the changed surface does not affect the suggested neighbor asset.
- If sync evidence is missing for a semantic change, `Fairy` must call it out before commit, PR, merge, release, or promotion.
- If a required neighbor update is intentionally skipped, the handoff must record a waiver reason and the owner agent for follow-up.
- The final handoff carries forward known limitations and intentionally untouched areas from the implementation evidence; do not convert them into a new acceptance verdict.

## CI Gateway Rules

- `review-it` and `ship-it` read the latest task-relevant `Sync Handoff` before Git actions.
- Missing sync evidence for semantic changes means `sync_handoff_status: partial` or `fail`, never `pass`.
- A `pass` status requires either updated neighbor assets or explicit waivers for every relevant neighbor surface.
- A `not_applicable` status is allowed only for non-semantic edits and must include the reason under skipped checks or sync evidence.

## Output Rule

Do not paste every subagent report into the final handoff. The handoff should be short, source-linked, and actionable enough for the next agent or coworker to continue without re-discovering the same sync boundary.
