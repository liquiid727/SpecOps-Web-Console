---
name: to-issues
description: Use when turning a precise bug, regression, or local change request into a concise peer Requirement Issue that can be specified and resolved.
---

# Requirement Issue Intake — GoalSpec

PRD and Issue are peer requirement entries. Use this skill for a concrete bug,
regression, or narrowly stated local change. Do not use it to split an approved
Spec into implementation or verification tasks; implementation follows the
Spec directly and testing is owned by `test.md` and its evidence.

## Inputs

Read repository rules, the root `index.yaml`, existing `prd.md` or `issue.md`,
relevant Spec/design, actual code and tests, and current evidence. If the
request is a broad product outcome, hand it to `prd` instead. If behavior is
already specified, record the Issue as a defect against that Spec and request a
Spec revision when the contract must change.

## Canonical output

For new work, write the root entry:

```text
.requirements/requirements/R0NN-<slug>/issue.md
```

Set `index.yaml` `entry_kind: issue`. A root Issue uses stable `ISSUE-R0NN`
identity; do not create `specs/*/issues/ISSUE-*` implementation files for new
work. Existing child Issue files are historical and must not be rewritten.

Use the configured requirements directory and Issue template when available.
Record `source_entry: ./issue.md`; do not leave a dangling `source_prd` binding
copied from a PRD template. For a repair covered by an existing approved Spec,
link that Spec and its evidence location and proceed under repair authorization.
Create or revise a Spec through `prd-to-spec` only when behavior is unspecified
or the contract changes; do not manufacture a duplicate Spec for a small bug.

## Required contract

The Issue must state only the precise facts needed to create or select a Spec:

- Problem and reproduction / trigger
- Actual and expected behavior
- Affected consumer, entry path, and impact
- Scope and explicit non-goals
- Existing Spec reference, if any
- Decisions or information still required
- Proposed resolution evidence location

Do not add architecture decisions, implementation task lists, test matrices, or
completion records here. Put technical behavior and invariants in `spec.md`;
put independent scenarios in `test.md`; put commands, runs, limitations, and
quality conclusions in `evidence/`.

## Handoff

```text
PRD or Issue entry → approved child Spec → direct implementation
                   ↘ independent Test Design → verification Evidence
```

An Issue is resolved only after the affected Spec and evidence/acceptance
records are updated. It does not itself mean implemented, tested, or accepted.
