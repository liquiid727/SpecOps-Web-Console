---
name: to-issues
description: Use when decomposing an approved GoalSpec child Spec or Test Design into independently completable implementation or verification Issues.
---

# Spec to Issues — GoalSpec

Create one local Issue file per independently completable work item. The Issue belongs to exactly one child Spec Package and must remain traceable to the root Requirement, contract behavior, Test Design, and evidence gate.

## Inputs

Choose exactly one track:

```text
A. implementation Issues from an approved specs/S0N-<slug>/spec.md
B. verification Issues from an approved specs/S0N-<slug>/test.md
```

Read in order: root `prd.md` and `index.yaml`, selected child `spec.md`, selected child `test.md` when present, relevant rules/design, existing dependencies, and current review/evidence/acceptance records. A PRD-only fallback requires explicit user approval and must record incomplete technical/test traceability.

Reject draft or stale source artifacts for release-bound Issues.

## Canonical output

Write only inside the selected child package:

```text
.requirements/requirements/R0NN-<slug>/specs/S0N-<slug>/issues/
└── ISSUE-R0NN-S0N-NNN-<slug>.md
```

A remote GitHub/iCafe Issue may be an external projection, but the local file remains the canonical source.

Start from `.requirements/templates/spec-package/issues/ISSUE-R001-S01-001-example.md`, rename the file with the real stable ID and slug, and preserve its frontmatter contract.

## Issue identity and frontmatter

Allocate the next unused sequence within the child Spec Package. IDs are permanent and are never reused or renumbered:

```yaml
id: ISSUE-R001-S01-001
requirement: R001
spec_package: S01
kind: implementation # implementation | verification
track: implementation # implementation | verification
status: todo # todo | in-progress | implemented_pending_verification | verified | blocked
primary_spec: SPEC-R001-S01-001
source_spec: ../spec.md
source_spec_id: SPEC-R001-S01-001
source_spec_version: 1.0.0
source_spec_hash: <sha256-or-immutable-revision>
source_test: ../test.md
source_test_id: TEST-R001-S01
source_test_version: 1.0.0
source_test_hash: <sha256-or-immutable-revision>
priority: P1
owner: <owner>
depends_on: []
```

Every Issue must have exactly one `primary_spec`. Cross-package references go in `covers` and do not change the owning directory.

## Issue body contract

Require these sections:

```markdown
# ISSUE-R001-S01-001 — <Title>

## Covers
- REQ-R001-001
- SPEC-R001-S01-001
- TEST-R001-S01-001

## Goal
## Scope
### Must
### Must Not
## Tasks
## Validation
## Dependencies
## Required Evidence
## Completion Record
```

Implementation Issues MUST include an explicit code-and-unit-test task (or a
written `N/A` rationale). Verification Issues MUST identify the test assets,
runner scope, normalized evidence, and `evidence/index.yaml` registration they
own. Add an Acceptance Criteria section with observable Given/When/Then results.

For AI-generated test drafts, include the human reviewer and review decision in
the Issue or Completion Record. A draft is not evidence until the review is
complete and the resulting run is normalized.

Implementation Issues may include implementation-coupled unit tests but must not claim independent QA acceptance. Verification Issues own test assets, execution, and evidence; they must not silently modify production behavior.
Planned `TEST-*` coverage is not execution evidence. Required Evidence is
satisfied only by a normalized run/artifact registered in `evidence/index.yaml`.

The Completion Record must eventually contain changed files, tests executed, evidence references, commit/PR, design decisions, tradeoffs, open questions, and any Spec Deviation. It is the only implementation-note record; do not create a separate notes document. `Issue Done` is not child QA acceptance or root Requirement Done.

## Decomposition rules

- Split by independently completable vertical behavior, not by document heading or technical layer.
- Keep implementation and verification tracks separate.
- Make `depends_on` explicit; detect missing, duplicate, or circular ownership before writing.
- Include acceptance criteria that are observable and executable.
- Reject an Issue when its source Spec/Test is draft, stale, superseded, or
  version/hash mismatched for a release-bound track.
- Split independent public behaviors, risk profiles, or verification owners
  into separate Issues; do not create one omnibus Issue spanning unrelated
  SPECs or mix implementation and verification tracks.
- Present the Issue table and dependency order for user approval before creating external Issues.

## Handoff

```text
approved S0N/spec.md
  ├── /to-issues (implementation)
  └── approved S0N/test.md → /to-issues (verification)
       → /loop-it
```
