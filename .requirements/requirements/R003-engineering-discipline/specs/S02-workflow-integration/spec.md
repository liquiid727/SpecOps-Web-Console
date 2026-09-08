---
requirement: R003
spec_package: S02
spec_id: SPEC-R003-S02
title: Workflow Integration
source_prd: ../../prd.md
source_prd_version: 1.0.0
version: 1.0.0
status: approved
owner: implementation-agent
qualityProfile: agent-workflow
riskTier: P1
depends_on:
  - S01
approval: user-authorized direct execution on 2026-09-06
---

# Spec Package S02 — Workflow Integration

## 1. Objective and Traceability

Business Outcome:
- The existing Issue execution, review and handoff workflows apply the S01 contract at their current ownership boundaries without creating a second task state or claiming QA acceptance early.

| PRD Requirement | Contract Behavior | Acceptance Criterion | Risk |
|---|---|---|---|
| REQ-R003-001, REQ-R003-002 | SPEC-R003-S02-001 | AC-R003-002 | P1 |
| REQ-R003-003, REQ-R003-005 | SPEC-R003-S02-002 | AC-R003-003, AC-R003-005 | P1 |
| REQ-R003-004 | SPEC-R003-S02-003 | AC-R003-004 | P1 |
| REQ-R003-001 through REQ-R003-005 | SPEC-R003-S02-004 | AC-R003-008 | P1 |

## 2. Existing System Analysis

Relevant modules / interfaces / data / conventions:
- `skills/developer/loop-it/SKILL.md` owns local Issue execution and Completion Record requirements.
- `skills/developer/review-it/SKILL.md` owns code/design review records, not QA acceptance.
- `skills/developer/ship-it/SKILL.md` owns delivery context and CI Record; it currently contains user-owned uncommitted standalone CI and Sync Handoff changes.
- `ai/workflows/sync-handoff-gateway.md` is the proposed synchronization contract with a neighbor asset matrix.
- `.agents/manifest.yaml` owns selected skills and role context; S02 must not bypass it with direct skill installation.

Existing constraints and architecture decisions:
- Implementation Issues only run focused checks. Verification Issues own formal test execution and normalized evidence.
- `loop-it` must not write `acceptance.md`; final acceptance belongs to the existing feature-verify/QA workflow.
- User-owned dirty changes remain intact. S02 may add non-conflicting R003 contract language but must not rewrite their standalone delivery behavior.

## 3. Scope and Architecture

### In Scope

- Require the S01 preflight before Loop It implementation or verification execution.
- Require S01 honest closeout fields before canonical Issue status advancement.
- Extend review focus with consumer/real-entry, affected surface, decision-owner and unsupported-claim checks.
- Make Sync Handoff consume the same change profile/surface vocabulary and document its activation boundary.
- Align existing `ship-it` CI Record wording with the new closeout fields only where that can be done without overwriting user-owned changes.

### Out of Scope

- Implementation of the check script or fixture data; S03 owns that.
- Remote push, PR, merge, deployment and changes to user-selected Git staging.
- Direct edit of `.agents/manifest.yaml` unless a new owned skill is actually introduced by an approved later Spec.

Architecture and component responsibilities:
- `loop-it`: reads/updates Issue preflight and closeout; preserves implementation/verification/QA separation.
- `review-it`: verifies that preflight claims and evidence surface claims match the real diff and parent contracts.
- `sync-handoff-gateway`: identifies neighboring semantic surfaces using common terminology.
- `ship-it`: reports CI/delivery facts and retains the existing user-owned CI Record extensions.

## 4. Contract Behaviors

### SPEC-R003-S02-001 Execution Uses Preflight Before Writes

Implements:
- REQ-R003-001
- REQ-R003-002

Public Seam:
- `loop-it` source order and single-Issue loop.
- Observable response or state boundary: semantic/high-risk Issues do not enter implementation or verification with an absent or incomplete preflight.

Preconditions:
- Parent PRD, current approved Spec, approved Test Design and selected Issue exist; the worktree boundary is known.

Given / When / Then:
- Given: a semantic Issue selected for local execution.
- When: Loop It reaches its pre-write safety gate.
- Then: it reads the Execution Preflight and blocks if required facts, consumer entry paths or affected surfaces are missing.
- Given: a mechanical Issue.
- When: Loop It validates it.
- Then: it requires a non-empty applicability rationale and applies only the checks justified by its scope.

Authorization:
- Allowed actors / roles: Issue owner records preflight; Loop It and reviewer enforce it.
- Forbidden actors / tenant boundary: Loop It may not create a new PRD/Spec/Test Design or change QA acceptance to satisfy the preflight.

State and Data Semantics:
- The existing `todo → in-progress → implemented_pending_verification → verified` status remains unchanged.
- Preflight is execution input, not a second checkpoint state.

Error Semantics:
- Missing/incomplete preflight produces a blocking condition with the field/path; it never causes Loop It to invent facts.
- Existing unrelated dirty changes are listed and excluded; unsafe attribution remains blocked.

Idempotency / Concurrency:
- Re-running an Issue validates the same preflight unless the Issue or parent source changes.

Side Effects and Observability:
- The final summary names the change profile, affected surfaces, excluded dirty changes and any blocked human decision.

Risk and Gate Impact:
- Risk tier: P1
- Required evidence: loop documentation test and S03 valid/invalid fixture results.
- Gate impact: blocking before execution.

Acceptance Mapping:
- AC-R003-002

### SPEC-R003-S02-002 Completion and Review Preserve Evidence Boundaries

Implements:
- REQ-R003-003
- REQ-R003-005

Public Seam:
- Completion Record and `review-it` review gate.
- Observable response or state boundary: closeout reports focused validation accurately and reviewers can distinguish source, artifact and real-entry evidence.

Preconditions:
- The Issue has a current Test Design and its declared Validation scope.

Given / When / Then:
- Given: an implementation Issue with focused validation.
- When: its Completion Record is written.
- Then: it records executed/skipped/proved/risk/untouched fields and states that verification owns release evidence where applicable.
- Given: a review covers a changed public, generated or release artifact surface.
- When: Review Gate is evaluated.
- Then: the reviewer checks the declared consumer/real entry and rejects unsupported evidence substitution.

Authorization:
- Allowed actors / roles: issue owner writes execution facts; reviewer records findings; QA consumes but does not receive invented acceptance.
- Forbidden actors / tenant boundary: reviewers cannot turn a clean diff into missing verification evidence.

State and Data Semantics:
- Failure, skip and flaky classifications remain visible and do not become pass through summary normalization.

Error Semantics:
- Missing closeout field, contradictory command result or source/build evidence conflation is an actionable review blocker.
- A test runner failure stays failed/blocked in evidence and closeout.

Idempotency / Concurrency:
- Re-review after a fix appends/resolves findings without deleting past evidence references.

Side Effects and Observability:
- Review records link findings to SPEC/TEST/ISSUE/rule IDs and evidence paths.

Risk and Gate Impact:
- Risk tier: P1
- Required evidence: focused test results, normalized verification evidence where selected, and review record.
- Gate impact: blocking before Issue status advancement.

Acceptance Mapping:
- AC-R003-003
- AC-R003-005

### SPEC-R003-S02-003 Decision Ownership Is Reviewed at the Correct Layer

Implements:
- REQ-R003-004

Public Seam:
- Completion Record, child Spec, platform Design and Review record.
- Observable response or state boundary: `Alternatives considered` appears only in the correct owner artifact and is linked from dependent artifacts.

Preconditions:
- The Issue has identified whether its decision is implementation-local, contract-level or durable cross-requirement truth.

Given / When / Then:
- Given: an Issue has multiple genuine implementation choices.
- When: it closes.
- Then: Completion Record records the alternatives and reason; it does not create a Note.
- Given: an alternative changes public contract or durable architecture.
- When: the reviewer identifies it.
- Then: the Issue blocks or links to the owning Spec/Design instead of silently deciding it locally.

Authorization:
- Allowed actors / roles: implementation owner records local choices; architecture owner decides cross-package ownership.
- Forbidden actors / tenant boundary: no workflow skill manufactures decision files to pass a check.

State and Data Semantics:
- Existing Decision/Tradeoff fields retain their meaning; the new alternatives field makes the rejected choice explicit.

Error Semantics:
- Ambiguous or duplicate ownership is blocked and assigned to the architecture owner.

Idempotency / Concurrency:
- Not applicable.

Side Effects and Observability:
- The closeout and Sync Handoff link the canonical owner path.

Risk and Gate Impact:
- Risk tier: P1
- Required evidence: review of canonical link and no parallel Note tree.
- Gate impact: blocking only for public, compatibility, security or durable workflow choices.

Acceptance Mapping:
- AC-R003-004

### SPEC-R003-S02-004 Sync Handoff Uses One Vocabulary

Implements:
- REQ-R003-001
- REQ-R003-002
- REQ-R003-003
- REQ-R003-004
- REQ-R003-005

Public Seam:
- `## Sync Handoff` template and CI Record `sync_handoff_status`.
- Observable response or state boundary: semantic changes declare profile, affected surfaces, checked/updated/waived neighbors and open risks in one concise record.

Preconditions:
- Changed surface and owned artifacts are known from preflight and execution.

Given / When / Then:
- Given: a semantic change affects rules, templates, skills, workflows, tests, CI gates or evidence.
- When: review or shipping handoff is produced.
- Then: Sync Handoff identifies the change profile, affected observable surfaces and neighbor decisions; missing required sync evidence yields partial/fail rather than pass.
- Given: a mechanical-only change.
- When: a CI Record is written.
- Then: `not_applicable` includes the applicability rationale.

Authorization:
- Allowed actors / roles: named owner roles supply surface-level facts; `pola`/reviewer synthesize cross-surface judgment.
- Forbidden actors / tenant boundary: no role marks a semantic change pass solely because a local command succeeded.

State and Data Semantics:
- `sync_handoff_status` remains `pass | partial | fail | not_applicable`; no new state enum is added.

Error Semantics:
- Missing neighbor action/rationale is `partial` or `fail`; a waiver records owner and rationale.

Idempotency / Concurrency:
- Updating a handoff replaces only current-task facts and preserves referenced user-owned CI Record fields.

Side Effects and Observability:
- Handoff output remains concise, source-linked and suitable for review/ship input.

Risk and Gate Impact:
- Risk tier: P1
- Required evidence: Sync Handoff plus S03 fixture/check output.
- Gate impact: blocking before merge/ship when a selected neighboring surface is missing.

Acceptance Mapping:
- AC-R003-008

## 5. Data and Interface Contracts (conditional)

Data model, persistence, migration, and backward compatibility:
- Workflow Markdown fields are additive. Existing Completion Records and CI Records remain valid until an R003 check explicitly selects a new Issue.

API / IPC / CLI / event contract:
- `loop-it`, `review-it`, `ship-it` and Sync Handoff share S01 heading/field names; they expose no network API.

## 6. Technical Constraints (conditional)

| Area | Contract or `Not applicable` with rationale |
|---|---|
| Security | Handoffs and closeouts include safe references only; never raw credentials, PII or model transcripts. |
| Performance | Additional document checks run before focused execution and are deterministic; no full regression is implied. |
| Compatibility / migration / rollback | Existing user-owned `ship-it` modifications are preserved. New constraints activate for R003 issues and future generated templates. |
| Agent behavior | Use the approved R003 16-case fixture set. Retain profile, preflight fields, surface rows, closeout fields and Gate decisions. Uncertainty, missing consumer entry or unsupported evidence triggers owner handoff rather than completion. |

## 7. Change Delta

### Added
- Preflight/closeout enforcement in execution and review guidance.
- A common Sync Handoff vocabulary.

### Modified
- `loop-it`, `review-it`, Sync Handoff and compatible ship documentation consume S01 fields.

### Removed
- None.

### Unchanged Guarantees
- Issue state machine, test/verification ownership, QA acceptance ownership, external Git authorization and registered role boundaries remain unchanged; verification method: workflow fixture tests and review of updated skills.

## 8. Spec Ready Check

- [x] Each behavior maps to REQ and AC with a public seam and observable result.
- [x] State, data, errors, authorization, side effects, observability, and applicable constraints are explicit.
- [x] Change compatibility and migration behavior are explicit when applicable.
- [x] No blocking Open Question remains.
