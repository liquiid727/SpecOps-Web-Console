---
requirement: R003
spec_package: S01
spec_id: SPEC-R003-S01
title: Engineering Discipline Contract
source_prd: ../../prd.md
source_prd_version: 1.0.0
version: 1.0.0
status: approved
owner: architecture-agent
qualityProfile: agent-workflow
riskTier: P1
depends_on: []
approval: user-authorized direct execution on 2026-09-06
---

# Spec Package S01 — Engineering Discipline Contract

## 1. Objective and Traceability

Business Outcome:
- SpecOS rules and canonical templates give every semantic change one concise,
  traceable way to declare applicability, execution facts, affected observable
  surfaces, decision ownership, and honest closeout.

| PRD Requirement | Contract Behavior | Acceptance Criterion | Risk |
|---|---|---|---|
| REQ-R003-001 | SPEC-R003-S01-001 | AC-R003-001 | P1 |
| REQ-R003-002 | SPEC-R003-S01-002 | AC-R003-002 | P1 |
| REQ-R003-003 | SPEC-R003-S01-003 | AC-R003-003 | P1 |
| REQ-R003-004 | SPEC-R003-S01-004 | AC-R003-004 | P1 |
| REQ-R003-005 | SPEC-R003-S01-005 | AC-R003-005, AC-R003-007 | P1 |

## 2. Existing System Analysis

Relevant modules / interfaces / data / conventions:
- `.rules/project.md` owns concise repository-wide workflow rules.
- `rules/shared/` owns reusable canonical rules; `.rules/` is the short agent-facing adapter.
- `docs/spec-modes/GoalSpec/agent-native-sdlc-standard.md` owns the artifact chain and stable IDs.
- `.requirements/templates/spec-package/` is the canonical source for new child-package artifacts.
- `assets/templates/specs/` and `packages/templates/{fullstack,spec-only}/` mirror canonical templates; `scripts/checks/goalspec-template-consistency.test.mjs` checks byte equality.
- Issue Completion Record already owns implementation decisions, tradeoffs, tests, evidence and deviations; `design/` owns only durable platform/system truth.

Existing constraints and architecture decisions:
- GoalSpec v2 is the sole Agent-Native SDLC contract; this Spec must not add a mode, parallel state machine or Note tree.
- Child artifacts own their respective facts: Spec behavior, Test Design, Issues, evidence, review and acceptance stay separate.
- Existing user changes to `ship-it`, its Catalog record and the CI Record asset remain user-owned input; this Spec must not overwrite them.

## 3. Scope and Architecture

### In Scope

- A canonical `rules/shared/change-discipline.md` that defines applicability, preflight, surface evidence, decision ownership and closeout semantics.
- A concise reference from `.rules/project.md` and an explicit GoalSpec standard section for the same semantics.
- Canonical template fields for Issue preflight/closeout, Test Design surface matrix, Spec decision ownership and evidence provenance.
- Exact mirrors of every altered canonical template and updates to their consistency test.

### Out of Scope

- New `design/` documents, `.agents/notes/`, new Agent roles or new SDLC modes.
- Third-party text import, license interpretation, UI implementation and backfilling R002 artifacts.
- Executable validation logic; S03 owns check implementation and fixtures.

Architecture and component responsibilities:
- `rules/shared/change-discipline.md`: canonical cross-cutting semantics and applicability table.
- `.rules/project.md`: directs agents to the canonical rule and preserves the existing delivery chain.
- GoalSpec standard: assigns each field to its canonical artifact owner.
- Template sources and mirrors: expose the same fields to new Workspaces.
- `scripts/checks/goalspec-template-consistency.test.mjs`: prevents template drift.

## 4. Contract Behaviors

### SPEC-R003-S01-001 Change Profile Classification

Implements:
- REQ-R003-001

Public Seam:
- Rule and Issue field: `change_profile: mechanical | behavior | cross-surface | high-risk`.
- Observable response or state boundary: every new R003-era Issue declares one profile; `mechanical` includes a non-empty applicability rationale.

Preconditions:
- The change request, affected source and nearest repository rules are available.

Given / When / Then:
- Given: a change that only formats, fixes spelling, reorders imports or changes an unambiguous comment.
- When: the Issue is prepared.
- Then: it may use `mechanical` and record why semantic effects do not apply.
- Given: a behavior, public contract, workflow, persistence, protocol, configuration, generated-output, security or concurrency change.
- When: the Issue is prepared.
- Then: it uses `behavior`, `cross-surface` or `high-risk`; it does not use `mechanical` merely to bypass evidence.

Authorization:
- Allowed actors / roles: registered architecture, implementation, testing, reviewer and QA roles.
- Forbidden actors / tenant boundary: no role may reinterpret `mechanical` as release acceptance or waive P0/P1 evidence without the existing waiver path.

State and Data Semantics:
- The profile is immutable for a completed Issue unless a parent Spec revision or review finding changes the underlying scope.
- Inputs are Markdown frontmatter and body fields; no external persistence or PII is introduced.

Error Semantics:
- Invalid input: missing profile or invalid enum is a blocking check error.
- Dependency / timeout failure: Not applicable; this behavior is local document validation.
- User-visible result, code/status, partial-write or rollback: missing rationale for `mechanical` is a blocking validation result and does not alter existing artifacts.

Idempotency / Concurrency:
- Re-running classification checks produces the same result for unchanged artifacts.

Side Effects and Observability:
- Validation reports the Issue path, field and stable error code; it emits no secrets or raw prompt contents.

Risk and Gate Impact:
- Risk tier: P1
- Required evidence: valid Issue frontmatter and deterministic fixture result.
- Gate impact: blocking for new R003-era semantic Issue templates and S03 fixtures.

Acceptance Mapping:
- AC-R003-001

### SPEC-R003-S01-002 Execution Preflight Fact Map

Implements:
- REQ-R003-002

Public Seam:
- Issue section: `## Execution Preflight` with confirmed facts, unverified assumptions, production consumers / real entry paths, affected surfaces and planned checks, unrelated worktree changes, and human decisions required.
- Observable response or state boundary: an implementation or verification Issue can be read without rediscovering these execution inputs.

Preconditions:
- Root PRD, child Spec/Test Design, current code/tests and worktree status have been read in GoalSpec source order.

Given / When / Then:
- Given: a non-mechanical Issue that changes a code, workflow, test, rule or generated artifact surface.
- When: execution is about to begin.
- Then: each required preflight field is present; an inapplicable field uses `Not applicable — <reason>`.

Authorization:
- Allowed actors / roles: the Issue owner writes facts; reviewer/testing roles may reject unsupported consumer or surface claims.
- Forbidden actors / tenant boundary: implementation owners may not claim QA acceptance through preflight.

State and Data Semantics:
- Facts describe the selected Issue scope and are updated only when evidence changes them.
- A user-owned unrelated dirty change is named and excluded, never reset or silently folded into the Issue.

Error Semantics:
- Invalid input: missing required preflight heading or a semantic Issue with no consumer/entry/surface is blocking.
- Dependency / timeout failure: inability to find a consumer or safely attribute a dirty change is a stop condition, not an invented answer.
- User-visible result, code/status, partial-write or rollback: the execution remains blocked until the owner clarifies the boundary.

Idempotency / Concurrency:
- Not applicable; the artifact is a single Issue-owned record.

Side Effects and Observability:
- The preflight makes source paths, entry paths, planned commands and requested human decisions reviewable without storing sensitive runtime data.

Risk and Gate Impact:
- Risk tier: P1
- Required evidence: Issue body fields and S03 fixture validation.
- Gate impact: blocking before execution for semantic/high-risk Issues.

Acceptance Mapping:
- AC-R003-002

### SPEC-R003-S01-003 Surface-Oriented Evidence Plan

Implements:
- REQ-R003-003

Public Seam:
- Test Design section: `## Affected Observable Surfaces` with columns `Surface`, `Consumer / real entry`, `Planned verification`, `Required evidence`, and `Gate impact`.
- Evidence metadata: `surface`, `consumer_entry`, and correlation fields appropriate to the surface.

Preconditions:
- The child Spec identifies observable behavior and the preflight identifies affected consumers and entries.

Given / When / Then:
- Given: a source change that also changes a generated, package, CLI, UI, persistence or build/release artifact.
- When: its Test Design is written.
- Then: each applicable surface receives its own verification row; source validation does not satisfy a distinct generated or release-artifact row.
- Given: a UI, trace or distributed run.
- When: evidence is recorded.
- Then: `run_id`, commit, environment and applicable service/session/trace identifiers make related artifacts attributable without forcing unrelated checks into one session.

Authorization:
- Allowed actors / roles: testing owners select evidence; QA evaluates release applicability.
- Forbidden actors / tenant boundary: implementation owners cannot substitute a mock or hand-built side path for a declared real entry without a documented waiver.

State and Data Semantics:
- The matrix is planned coverage; PASS/FAIL belongs only in evidence and acceptance.
- Supported surfaces are `source`, `package-api`, `cli-config`, `browser-ui`, `generated-output`, `model-visible-output`, `build-release-artifact`, `persistence-protocol`, and `security-concurrency-cleanup`.

Error Semantics:
- Invalid input: a blocking surface with no real entry, verification method or evidence type is invalid.
- Dependency / timeout failure: runner failure is recorded as evidence failure/blocked, not converted to a passing surface.
- User-visible result, code/status, partial-write or rollback: Not applicable to the documentation plan.

Idempotency / Concurrency:
- Repeated Test Design generation must preserve approved surface rows unless the bound Spec changes.

Side Effects and Observability:
- Surface rows and evidence records expose only paths, commands and safe identifiers; no secrets are embedded.

Risk and Gate Impact:
- Risk tier: P1
- Required evidence: approved Test Design surface matrix and normalized run metadata.
- Gate impact: blocking for P0/P1 surfaces selected by the Test Design.

Acceptance Mapping:
- AC-R003-003

### SPEC-R003-S01-004 Decision Ownership and Alternatives

Implements:
- REQ-R003-004

Public Seam:
- `Alternatives considered` is recorded in the artifact that owns the decision: Design for durable cross-requirement system truth, PRD/Spec for product or contract choices, Completion Record for implementation choices, and Review for rejected findings.
- Observable response or state boundary: a reader follows one canonical link rather than comparing duplicate Note documents.

Preconditions:
- The owner has searched current Design, parent artifacts, Completion Records and Review records for an existing decision.

Given / When / Then:
- Given: a non-mechanical change with two or more genuine viable choices.
- When: the choice is recorded.
- Then: the canonical owner contains each considered alternative and why it was not selected.
- Given: no real alternative was considered.
- When: the field is completed.
- Then: it says `Not applicable — no competing viable option was considered`; it does not fabricate alternatives.

Authorization:
- Allowed actors / roles: owner roles record decisions in their artifacts; architecture owner resolves ambiguous durable ownership.
- Forbidden actors / tenant boundary: no actor may create `.agents/notes/` or use a separate document to avoid choosing an owner.

State and Data Semantics:
- A decision is updated when its facts change; a new decision links rather than rewrites an unrelated old decision.
- Historical Requirement Workspaces remain historical evidence and are not retroactively migrated.

Error Semantics:
- Invalid input: duplicate active decision records or a fabricated alternative is a review finding.
- Dependency / timeout failure: unclear ownership blocks the Issue and requests architecture review.
- User-visible result, code/status, partial-write or rollback: Not applicable.

Idempotency / Concurrency:
- Not applicable; canonical ownership prevents concurrent records for the same decision.

Side Effects and Observability:
- The chosen owner, alternatives and consequence are visible through normal artifact links.

Risk and Gate Impact:
- Risk tier: P1
- Required evidence: canonical artifact link and Review validation.
- Gate impact: blocking only where multiple viable choices affect public behavior, safety, compatibility or long-lived workflow semantics.

Acceptance Mapping:
- AC-R003-004

### SPEC-R003-S01-005 Honest Closeout Contract

Implements:
- REQ-R003-005

Public Seam:
- Completion Record fields: `Checks Skipped`, `Verified Behavior`, `Known Limitations / Residual Risk`, and `Intentionally Untouched`, in addition to existing executed tests/evidence/decisions/tradeoffs.
- Observable response or state boundary: the handoff distinguishes executed evidence from unexecuted scope and from QA acceptance.

Preconditions:
- The Issue has completed the checks in its own Validation section or is blocked.

Given / When / Then:
- Given: a completed or blocked Issue.
- When: the Completion Record is finalized.
- Then: executed checks, skipped checks, behavior actually verified, residual risk, and untouched surfaces are each explicit; empty categories use `None` or `Not applicable` with rationale.

Authorization:
- Allowed actors / roles: Issue owner records facts; reviewer/QA challenge unsupported claims.
- Forbidden actors / tenant boundary: no role can turn a focused check or process startup into independent verification, QA acceptance or release readiness.

State and Data Semantics:
- Closeout fields summarize the selected Issue only. Formal run facts remain in evidence and final acceptance remains in `acceptance.md`.

Error Semantics:
- Invalid input: an Issue marked complete without a required closeout field is invalid.
- Dependency / timeout failure: failed or missing validation is listed as skipped/blocked with reason, never normalized to PASS.
- User-visible result, code/status, partial-write or rollback: Not applicable.

Idempotency / Concurrency:
- Re-running focused checks updates the executed result and evidence reference without erasing prior failure classification.

Side Effects and Observability:
- Completion records have enough information for Sync Handoff and review to identify unsupported completion claims.

Risk and Gate Impact:
- Risk tier: P1
- Required evidence: completed Issue record and S03 check result.
- Gate impact: blocking before an implementation Issue becomes `implemented_pending_verification` and before a verification Issue becomes `verified`.

Acceptance Mapping:
- AC-R003-005
- AC-R003-007

## 5. Data and Interface Contracts (conditional)

Data model, persistence, migration, and backward compatibility:
- Markdown/YAML fields are additive for newly generated Workspaces. Existing historical artifacts are readable without backfill; S03 defines enforcement activation only for R003-created or explicitly migrated Issues.

API / IPC / CLI / event contract:
- Template/check public field names are stable: `change_profile`, `Execution Preflight`, `Affected Observable Surfaces`, `Alternatives considered`, `Checks Skipped`, `Verified Behavior`, `Known Limitations / Residual Risk`, `Intentionally Untouched`.

## 6. Technical Constraints (conditional)

| Area | Contract or `Not applicable` with rationale |
|---|---|
| Security | Do not put secrets, PII, raw prompts or tokens in preflight, surface or closeout fields. |
| Performance | Documentation/template changes add no runtime work; S03 check must remain suitable for the PR fast gate. |
| Compatibility / migration / rollback | Additive fields only; no historical rewrite; reverting R003 leaves old artifacts readable. |
| Agent behavior | Dataset `R003 engineering-discipline fixtures v1`; 16 curated cases; semantic/high-risk false-N/A is 0; overall profile/evidence choice accuracy is at least 90%; retain profile, sources, surfaces, checks and Gate result; missing consumer/evidence or uncertain classification triggers human owner handoff. |

## 7. Change Delta

### Added
- A canonical engineering-discipline rule and additive template fields.
- A surface-to-evidence matrix and explicit decision ownership mapping.

### Modified
- GoalSpec and project rules explain semantic applicability and honest closeout.
- New Issue/Test Design/Evidence artifacts expose the additional contract fields.

### Removed
- None.

### Unchanged Guarantees
- GoalSpec remains the only SDLC; verification and QA ownership remain separated; `design/` remains optional and only owns durable platform/system truth; verification method: template consistency and R003 fixture checks.

## 8. Spec Ready Check

- [x] Each behavior maps to REQ and AC with a public seam and observable result.
- [x] State, data, errors, authorization, side effects, observability, and applicable constraints are explicit.
- [x] Change compatibility and migration behavior are explicit when applicable.
- [x] No blocking Open Question remains.
