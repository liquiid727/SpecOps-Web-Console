---
name: to-issues
description: Decompose an approved, versioned Feature Spec into small implementation Issues, or an approved Test Spec into independent verification Issues, and create them in GitHub, local Markdown, or Baidu iCafe. Use after prd-to-spec approval for the implementation track or after spec-to-test approval for the testing track. Preserves spec, requirement, dependency, owner, evidence, and track traceability.
---

# Spec to Issues

Create executable work items from approved Specs. Keep implementation and independent verification in separate tracks so test work does not inherit private implementation assumptions.

## Inputs

Prefer:

- an approved Feature Spec for `track: implementation`
- an approved Test Spec for `track: verification`

Allow a PRD-only fallback only when the user explicitly accepts that technical contracts and independent test traceability are incomplete.

For each source, require:

- `spec_id`
- exact source version
- status `approved`
- covered requirement identifiers
- dependencies and prerequisites
- acceptance or verification evidence

Reject stale Test Specs and unapproved source baselines.

## Workflow

### 1. Select the Track

```text
A. Implementation Issues from an approved Feature Spec
B. Verification Issues from an approved Test Spec
C. PRD-only fallback with recorded limitations
```

Do not mix A and B into the same Issue. They may be created as two batches and scheduled in parallel.

### 2. Decompose Vertically

For implementation:

- cover Feature Spec deliverables and Definition of Done
- keep one independently implementable behavior slice per Issue
- include implementation-coupled unit tests with the implementation Issue
- split when one focused agent session cannot finish safely
- preserve cross-Spec dependencies by Spec ID

For verification:

- decompose by independent profile or coherent business flow
- keep API contract, scenario, UI/E2E, performance, load/stress, concurrency, and security ownership explicit
- attach environment, data, evidence, and gate requirements
- do not assign implementation source changes to verification Issues

Do not create one Issue for every document heading. Merge tiny related work and split large cross-owner work.

### 3. Use the Issue Contract

```markdown
# <Title>

## Traceability
- Track: implementation | verification
- Spec ID:
- Source Spec:
- Source Version:
- Requirement IDs:
- Depends On:

## Goal

## Scope

## Out of Scope

## Acceptance Criteria
- [ ] Observable criterion

## Inputs

## Outputs

## Owner

## Required Evidence

## Gate Impact
- blocking | warning | informational
```

Every Issue must have one owning track, exact source version, requirement identifiers, and acceptance evidence.

### 4. Check the Issue Graph

Before creation:

- ensure all required source requirements are covered
- ensure no requirement has conflicting owners
- detect circular dependencies
- keep implementation and verification contexts isolated
- allow verification asset preparation to begin before implementation completes
- mark live execution dependencies on a deployable target explicitly

Present the proposed Issue table for user approval.

### 5. Create the Issues

Support:

- GitHub through `gh issue create`
- local Markdown under the project issue directory; resolve it in order: explicit user request > `.specos/manifest.yaml` `artifacts.issuesDir` > default `.issues/` (see `rules/shared/artifact-locations.md`), with filenames `issue-NNN-<slug>.md`
- Baidu iCafe through the available CLI

When the user picks a custom local issue directory, write it back to `artifacts.issuesDir` and record a project configuration memory so later sessions reuse it.

Use repository label conventions when present. Otherwise include:

- `track:implementation` or `track:verification`
- owner/type
- risk or priority
- source Spec ID

Never create external Issues before user approval.

## Parallel Scheduling

After Feature Spec approval:

```text
approved Feature Spec
├── to-issues (implementation) -> implementation work
└── spec-to-test
    └── approved Test Spec
        └── to-issues (verification) -> test asset and execution work
```

Implementation and verification-asset preparation may run concurrently. Verification execution that requires a live service must depend on a deployable test target.

## Completion Report

Report:

- source Spec and version
- selected track
- created Issue identifiers
- requirement coverage
- dependency order
- blockers and waived gaps
- next owner

## Relationship to Other Skills

```text
prd
  -> prd-to-spec
  -> Feature Spec approval
      ├── to-issues (implementation)
      └── spec-to-test
          -> Test Spec approval
          -> to-issues (verification)
  -> review-it
  -> ship-it
```
