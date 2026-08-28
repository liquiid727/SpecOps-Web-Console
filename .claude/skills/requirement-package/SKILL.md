---
name: requirement-package
description: "Use when starting or advancing a GoalSpec v2 requirement, change, or child Spec Package through its PRD, Spec, Test, Issue, and acceptance stages."
user-invocable: true
allowed-tools:
  - Bash(git:*)
  - Bash(mkdir:*)
  - Bash(cp:*)
---

# Requirement Package Workflow（GoalSpec v2）

规范：docs/spec-modes/GoalSpec/agent-native-sdlc-standard.md。
模板：`.requirements/templates/`（先读其 `README.md`）。示例：`.requirements/examples/`。
所有生成物都必须从对应模板开始，不得另造一套 frontmatter 或路径约定。

## Canonical Workspace

Every new requirement/change uses one PRD Workspace:

    .requirements/requirements/R0NN-<slug>/
    ├── prd.md
    ├── index.yaml
    ├── acceptance.md
    └── specs/S0N-<slug>/
        ├── spec.md
        ├── test.md
        ├── issues/ISSUE-R0NN-S0N-NNN-<slug>.md
        ├── review.md
        ├── acceptance.md
        └── evidence/

PRD 1:N Spec Package; Spec Package 1:N Issue.

## Source Priority

    Approved latest PRD / Change Requirement
    ↓
    Approved child Spec
    ↓
    Architecture / ADR
    ↓
    Actual Code
    ↓
    Existing Tests

Never silently rewrite product intent to match implementation.

## Workflow Stages

1. prd-author
2. prd-review
3. spec-generate
4. spec-review
5. spec-test-generate
6. issue-generate
7. issue-execute
8. feature-verify

## Developer Skill Composition

These stages are the canonical entry point; use the developer skills as bounded
components, with the following contracts:

```text
prd-author / prd-review
  → skills/developer/prd/SKILL.md
spec-generate / spec-review
  → skills/developer/prd-to-spec/SKILL.md
spec-test-generate
  → skills/developer/spec-to-test/SKILL.md
issue-generate
  → skills/developer/to-issues/SKILL.md
issue-execute
  → skills/developer/loop-it/SKILL.md
```

All components MUST preserve the same `R0NN`, `S0N`, `SPEC-R0NN-S0N-NNN`,
`TEST-R0NN-S0N-NNN`, and `ISSUE-R0NN-S0N-NNN` identifiers. They MUST write only
to the canonical child package paths.

The generator chain also preserves `source_*` path, stable ID, version, and
hash bindings. File paths use `source_spec` / `source_test`; stable anchors use
`source_spec_id` and the TEST/ISSUE IDs. Approved or release-bound artifacts
may not retain placeholder text, `pending-*` hashes, or unresolved blocking
Open Questions.

## prd-author / prd-review

Create root prd.md and index.yaml. PRD MUST define Goal, Non-Goal, Actors, Scope,
REQ, BR, INV, EDGE, AC and a Spec Package Decomposition. Each S0N entry declares
its path, covered REQ and independent business outcome.

PRD Ready requires clear scope, verifiable REQ/AC, adequate invariant and edge
coverage, feasible S0N decomposition and no blocking Open Question.

## spec-generate / spec-review

For every approved S0N decomposition entry, create specs/S0N-<slug>/spec.md.
Every SPEC maps to one or more REQ and states preconditions, scenario,
authorization, state, data/error/concurrency semantics, side effects,
observability, risk/gate impact, and AC mapping. Agent behaviors additionally
declare metrics, Dataset/version, thresholds, trajectory signals, degradation,
and human handoff conditions.

Do not split by code directories. Split by independent business outcome, Actor,
lifecycle, authorization boundary, risk profile or acceptance result.

A change workspace MUST put Change Delta in every affected child Spec:
Added, Modified, Removed and Unchanged Guarantees.

## spec-test-generate

Create test.md beside the child spec. It is a verification design, not an
execution report. Every TEST must name a concrete seam, setup/data/environment,
Given/When/Then assertions, failure behavior, evidence type, and gate impact.
Cover applicable happy, negative, authorization, state, invariant,
retry/duplicate, concurrency, external failure, observability and QA
exploratory cases. Every P0/P1 REQ, SPEC, and applicable BR/INV/EDGE/AC needs
TEST coverage. Agent packages add the PR smoke/full Eval and online sampling
plan; ordinary packages mark it not applicable.

Execution outputs are stored or referenced in the same child
`evidence/{plans,schedules,runs,gates,artifacts}/` directories and registered in
`evidence/index.yaml`; acceptance.md is the only QA Gate decision record.

## issue-generate / issue-execute

Generate one issues/ISSUE-*.md file per independently completable work item.
Every file MUST name exactly one primary_spec and its covers IDs.

Before execution read: root prd.md and index.yaml, selected child spec.md,
test.md, the Issue file, then required review/evidence/acceptance records and
actual code context. Record changed files, tests, evidence references, design
decisions, deviations, tradeoffs, open questions, and Spec Deviation in the
Issue Completion Record.

## feature-verify

Verify one child Spec Package first:

    Issues Done
    AND Test Exit Criteria supported by evidence
    AND Review blockers resolved or waived
    AND Actual Behavior == Spec
    AND mapped AC verified

Record accepted, blocked or accepted-with-waiver only in the child acceptance.md.
Then aggregate all required child decisions and PRD AC/UAT in the root
acceptance.md. Issue Done is never QA acceptance or Requirement Done.

## Prohibitions

- Do not generate a root issues.md for a v2 Workspace.
- Do not use planned test coverage as final evidence.
- Do not silently change approved product behavior or Unchanged Guarantees.
- Do not close an Issue with unexplained Spec Deviation.
- Do not treat raw unreferenced output as QA Gate Evidence.

## Examples

R000-example-feature demonstrates R000 → S01/S02 → independent Issue files.
R000-example-change demonstrates a Delta Spec Package and verified Unchanged
Guarantees.
