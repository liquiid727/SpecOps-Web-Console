# GoalSpec Workflow — Agent-Native SDLC

GoalSpec runs one requirement = one Requirement Package. Each package carries its own PRD, Spec, Test, and Issues, connected by stable IDs.

## Delivery Chain (8 modes)

```text
Idea / Requirement
   ↓  prd-author → prd-review
PRD (prd.md, REQ-/BR-/INV-/AC-/EDGE-)
   ↓  spec-generate → spec-review
Spec (spec.md, F01/F02 logical groups, SPEC-<R>-<F>-###)
   ↓  spec-test-generate
Test (test.md, TEST-<R>-<F>-###)
   ↓  issue-generate
Issues (issues.md, ISSUE-<R>-###)
   ↓  issue-execute
Code / Test / Status updates
   ↓  feature-verify
Traceability matrix + Done decision
```

## Package Layout

```text
.requirements/requirements/R001-<slug>/
  prd.md      # product behavior contract (approved → spec)
  spec.md     # executable contract (F01/F02 logical groups)
  test.md     # verification contract
  issues.md   # execution and progress (## ISSUE-R001-### sections)
```

## Mode Mapping

| Command / mode | Output | Gate |
| --- | --- | --- |
| `prd` → prd-author + prd-review | `prd.md` | PRD Ready |
| `prd-to-spec` → spec-generate + spec-review | `spec.md` | Spec Ready |
| `to-issues` → issue-generate | `issues.md` | Issue Ready |
| `loop-it-local` → issue-execute | code + status updates | Issue Done |
| `review-it` / `ship-it` → feature-verify | traceability matrix | Feature Done |

## Change / Delta

Existing system requirement changes create a new `type: change` package with `affects: [R001]`; the Spec states Added / Modified / Removed / Unchanged Guarantees explicitly. Never rewrite an approved Spec in place.

## Rules

- IDs are permanent anchors; never reuse or renumber.
- Source priority: approved PRD → approved Spec → Architecture/ADR → actual code → existing tests.
- Never silently rewrite product intent to match current implementation.
