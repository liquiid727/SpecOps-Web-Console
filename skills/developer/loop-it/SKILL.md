---
name: loop-it
description: Use when executing a selected batch of approved GoalSpec local Issues, or an explicitly requested remote Issue batch, with dependency, evidence, review, and checkpoint gates.
---

# Loop Issues — GoalSpec

Execute stable Issues one at a time. This skill never creates PRDs, Specs, Test Designs, or QA acceptance decisions. If requirements or parent contracts are still changing, stop and return to the owning skill.

## Source mode

Use local GoalSpec delivery by default for this repository. Use remote GitHub mode only when the user explicitly requests remote Issue execution.

### Local canonical source

Resolve `artifacts.requirementsDir` from `.specos/manifest.yaml`, then recursively discover only:

```text
<requirementsDir>/R0NN-<slug>/specs/S0N-<slug>/issues/ISSUE-R0NN-S0N-NNN-<slug>.md
```

A direct Issue path or an explicit `R0NN`, `S0N`, or Issue ID selector is authoritative; without a selector, list groups and ask once.

Remote mode may use GitHub Issue numbers, but each remote Issue must still identify its canonical `R/S/ISSUE` source before implementation.

## Preconditions

Stop before writes when any of these fail:

1. Git repository exists and the working tree is clean, or the user explicitly chose a safe recovery action.
2. The selected Issue exists and has `kind`, `track`, `requirement`, `spec_package`, `primary_spec`, `source_spec_version`, and `depends_on`.
3. The root PRD and `index.yaml`, child `spec.md`, and approved child `test.md` exist.
4. Root/child source artifacts are approved and the Issue is not bound to a stale Spec/Test version.
5. `.loop-local-state/` is ignored by Git. Checkpoints never enter an Issue commit.

## Required read order

Before each Issue, read:

```text
README.md
→ rules/
→ docs/spec-modes/GoalSpec/
→ relevant design/
→ root prd.md
→ root index.yaml
→ child spec.md
→ child test.md
→ selected Issue
→ child review.md / evidence/ / acceptance.md
→ actual code and tests
```

If a parent artifact is missing, unapproved, or version-mismatched, mark the run blocked and do not implement.

## Dependency and selection rules

- Read dependencies from Issue frontmatter `depends_on`; use body `## Dependencies` only as a human-readable mirror.
- Missing dependencies, duplicate ownership, stale bindings, and circular dependencies are hard stops. Never break a cycle by arbitrary numeric order.
- Topologically sort the selected graph; use the stable Issue ID only as a tie-breaker.
- Do not silently expand a selection to external dependencies. Require an explicit include-dependencies choice.

## Checkpoint

Store one atomic checkpoint per selection:

```text
.loop-local-state/<stable-selection-key>.json
```

Checkpoint statuses are execution bookkeeping and must not be confused with QA acceptance:

```text
pending → in_progress → implemented → reviewed → shipped
                         └──────────→ blocked / failed
```

The canonical Issue status remains:

```text
todo → in-progress → implemented_pending_verification → verified
```

`implemented_pending_verification` means code and the Issue-declared focused
validation are complete; it never means the Test Design, Spec Package, or
Requirement is accepted. Update the checkpoint after every transition. Preserve
a corrupt checkpoint and ask whether to resume or start a new selection.

## Single-Issue loop

1. Prepare an isolated branch only after the preconditions pass.
2. Read the complete parent chain and Issue contract.
3. Implement only the Issue's Must scope. Do not rewrite PRD/Spec or weaken tests.
4. For `track: implementation`, run only the focused, changed-scope commands
   declared in the Issue `Validation` section. Do not automatically run the
   Test Design coverage matrix, full regression, performance, concurrency,
   E2E, or release Gate. Add or update a code-coupled unit test only when the
   Issue declares a suitable seam; otherwise record the required `N/A` rationale.
5. For `track: verification`, execute the assigned Test Design scenarios,
   write or reference normalized evidence under the owning child package's
   `evidence/{plans,schedules,runs,gates,artifacts}/`, and register it in
   `evidence/index.yaml`. Every blocking result must identify TEST,
   SPEC/version, ISSUE, commit, environment, time, and result.
6. Update the Issue Completion Record with changed files, tests, evidence,
   commit, design decisions, deviations, tradeoffs, open questions, and Spec
   Deviation. An implementation Issue without explicitly required evidence
   records `N/A — verification Issue owns release evidence`.
   Do not create a separate implementation-notes file such as `docs/issue#*.html`.
7. Run `/review-it`; record findings and resolutions in the child `review.md`. Unresolved blocking findings stop the loop.
8. An implementation Issue may commit after its declared focused validation and
   review pass, with canonical status `implemented_pending_verification`. A
   verification Issue may advance to `verified` only when its required evidence
   and gates pass. In local mode, commit only the listed Issue files and use a
   fast-forward merge when explicitly authorized. In remote mode, use `/ship-it`
   only when explicitly authorized.
9. Never write child or root QA acceptance from this loop. `feature-verify` owns `specs/S0N/acceptance.md` and root `acceptance.md`.

If execution discovers a conflict with the approved Spec or project
architecture, mark the run blocked and record the conflict as a finding or Spec
Deviation. Do not resolve it by silently changing implementation, parent
contracts, tests, or recorded evidence; the parent Spec revision marks bound
Test Designs and Issues stale before a new execution selection begins.

## Safety gates

Never advance an implementation Issue to `implemented_pending_verification` when:

- the source Spec/Test is stale or unapproved;
- a required dependency is not complete;
- a review blocker is unresolved;
- the Completion Record is incomplete;
- the working tree contains unrelated changes.

Never advance a verification Issue to `verified`, or QA to acceptance, when:

- the source Spec/Test is stale or unapproved;
- a required dependency is not complete;
- P0/P1 evidence is missing, failed, or unclassified;
- a review blocker is unresolved;
- the Completion Record is incomplete;
- the working tree contains unrelated changes.

The final summary must list selection, Issue IDs, dependency order, changed files, tests, evidence, review status, checkpoint status, blockers, and any skipped validation.
