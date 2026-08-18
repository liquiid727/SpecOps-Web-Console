---
name: prd-to-spec
description: Transform an accepted PRD into one or more small, modular Feature Specs with stable identifiers, requirement coverage, dependency contracts, review status, and versioned public behavior. Use when converting product requirements into implementation-ready specs, deciding whether a small PRD maps to one spec or a complex PRD must be decomposed into multiple end-to-end feature slices, or normalizing legacy requirements into a spec roadmap. Produces Feature Specs only; generate independent Test Specs later with spec-to-test after approval.
---

# PRD to Spec

Turn an accepted PRD into implementation-ready Feature Specs. Keep stable platform decisions in design documents, epic order in the roadmap, feature behavior in small Feature Specs, and independent verification in downstream Test Specs.

## Boundary

This skill owns:

- classifying PRD scope
- designing the Feature Spec decomposition
- mapping every PRD requirement to a Feature Spec
- generating one or more versioned Feature Specs
- updating epic, order, and dependency recommendations
- driving Feature Spec review and approval

This skill does not:

- generate a Test Spec
- generate executable tests
- implement code
- turn database, backend, frontend, or test layers into separate specs unless they deliver independently valuable behavior

After an approved Feature Spec exists, use `spec-to-test` for independent verification design.

## Read Order

Read:

1. project README and active mode
2. repository rules and spec rules
3. current delivery context
4. source PRD or structured draft
5. stable design documents
6. roadmap and existing Feature Specs
7. relevant public API, event, schema, error, and compatibility contracts

For an existing system, compare the requested behavior with current contracts. For a greenfield system, propose only the minimum architecture needed to make the feature contracts explicit.

## Workflow

### 1. Validate the PRD

Require:

- a clear product goal
- explicit in-scope and out-of-scope behavior
- numbered User Stories or equivalent requirements
- verifiable acceptance criteria
- known constraints and unresolved product questions

Ask at most three to five blocking questions. Record reasonable non-blocking assumptions instead of expanding the PRD.

### 2. Classify PRD Scope

Classify the PRD before writing a Spec.

Use `feature` when:

- it has one primary business or user outcome
- it can be independently reviewed, verified, and shipped
- one owner or small team can deliver it end to end
- upstream contracts are stable
- its acceptance criteria form one coherent release slice

Use `epic` or `system` when any of these is true:

- it contains multiple independently valuable outcomes
- different parts can be released separately
- it spans multiple owners or bounded contexts
- it needs a dependency DAG
- it contains multiple workflows with separate acceptance boundaries
- one focused implementation cycle cannot deliver it safely

Do not use document length alone as the decision rule.

### 3. Create the Decomposition Plan

For a `feature` PRD, propose one Feature Spec.

For an `epic` or `system` PRD, first present a decomposition plan:

| Proposed Spec ID | Feature Slice | Covered Requirements | Depends On | Stable Prerequisites | Release Order |
| --- | --- | --- | --- | --- | --- |
| `RP-001` | Event ingestion | `US-001`, `FR-1` | none | tenant identity contract | 1 |
| `RP-002` | Decision API | `US-002`, `FR-2..4` | `RP-001` | event schema v1 | 2 |

Also present:

- a complete PRD requirement coverage matrix
- a dependency DAG
- shared public contracts
- cross-Spec integration or joint acceptance points
- requirements intentionally deferred or excluded

Get human approval or accepted automated review evidence for the decomposition before writing multiple Specs.

### 4. Slice Vertically

Each Feature Spec must:

- deliver one observable business or user outcome
- cross domain, application, repository, API, and UI layers when the outcome requires them
- have one explicit owner
- be independently reviewable and verifiable
- be independently shippable or have an explicit dependency contract
- fit a focused implementation and review cycle

Do not create separate Feature Specs named only after technical layers such as database, backend service, frontend components, or tests. Those are deliverables or Issues inside a feature slice unless they expose a separately reusable product contract.

Keep Feature Specs flat by ID. Express composition through epic membership, `Depends On`, `Prerequisites`, and the roadmap rather than nested Spec directories.

### 5. Generate Each Feature Spec

Use this exact core order:

```markdown
# <SPEC-ID> <Title>

## Meta

## Goal

## Why This Exists

## Out of Scope

## Deliverables

## Domain

## Application

## Repository

## API

## Database Impact

## Test Plan

## Definition of Done
```

#### Meta

Include:

- `Spec ID`
- `Spec Version`
- `Title`
- `Epic`
- `Status`: `draft | in-review | approved | superseded`
- `Owner Agent`
- `Source PRD`
- `Covered Requirements`
- `Depends On`
- `Prerequisites`
- `Risk Tier`: `P0 | P1 | P2`
- `Quality Profile`
- `Approval Evidence`

#### Goal and Scope

- State one measurable outcome.
- Explain why it is a standalone slice.
- Block neighboring work explicitly under `Out of Scope`.
- Keep deliverables concrete.

#### Contracts

Describe public behavior rather than implementation code:

- domain rules, invariants, and state transitions
- use-case orchestration and external dependency behavior
- persistence expectations and compatibility constraints
- API or event request, response, authentication, error, idempotency, and versioning semantics
- database impact, migration, rollback, and backward compatibility

Write `none` with a reason when API or database impact does not apply.

#### Test Plan

Define verification intent only:

- requirement and acceptance identifiers
- happy, error, edge, and limit branches
- applicable API, scenario, UI/E2E, performance, load, concurrency, security, migration, and compatibility risks
- measurable SLO or capacity targets when required
- expected evidence and blocking priority

Do not create the independent Test Spec or executable scripts here. Preserve enough stable contract information for `spec-to-test` to derive them after approval.

#### Definition of Done

Use a checklist covering:

- declared deliverables
- contract updates
- implementation-coupled unit coverage
- downstream independent Test Spec approval before ship when the quality profile requires it; this is not a prerequisite for Feature Spec approval
- required normalized test evidence
- review approval
- migration, rollout, rollback, or documentation evidence when applicable

### 6. Verify Coverage and Composition

Before review:

- map every PRD requirement to exactly one owning Feature Spec
- identify intentional cross-Spec verification without duplicating ownership
- ensure every dependency names the consumed stable contract
- ensure no Spec is only a horizontal technical layer
- ensure each acceptance criterion is testable
- ensure API, error, state, and performance contracts are explicit enough for independent test design

Stop on orphaned requirements, circular dependencies, duplicated ownership, or unresolved blocking contracts.

### 7. Review, Version, and Save

Review each Spec for product coverage, architecture fit, dependency correctness, contract completeness, and slice size.

Use the lifecycle:

```text
draft -> in-review -> approved -> superseded
```

Only mark a Spec `approved` when human approval or repository-authorized automated review evidence is recorded. Approval freezes the source version used by downstream Test Specs.

Resolve `<featuresDir>` from `.specos/manifest.yaml` `artifacts.specsDir` (required; default `.features/`; see `rules/shared/artifact-locations.md`). Do not inspect or fall back to legacy directories. When the user picks a custom location, write it back to `artifacts.specsDir` and record a project configuration memory.

Default paths:

```text
<featuresDir>/<SPEC-ID>-<slug>/spec.md
<featuresDir>/roadmap.md
```

Do not default to legacy paths or invent directories outside the canonical manifest path.

## Version Change Rules

- Increment `Spec Version` whenever approved public behavior changes.
- Record affected requirements and contracts.
- Mark Test Specs derived from an older version `stale`.
- Do not rewrite historical implementation, review, or test evidence to reference a newer version.
- Use `superseded` when a Spec is replaced rather than silently reusing its ID for a different feature boundary.

## Relationship to Other Skills

```text
prd
  -> prd-to-spec
  -> spec approval
      ├── to-issues -> implementation
      └── spec-to-test -> independent verification
  -> review-it
  -> ship-it
```

- `prd` produces the source product intent.
- `prd-to-spec` produces one or more modular Feature Specs.
- `spec-to-test` derives one Test Spec from each approved Feature Spec.
- `to-issues` decomposes an approved Feature Spec into implementation Issues.
- `code-to-spec` establishes a reviewable baseline when a legacy project has code but no current Spec.
