---
requirement: R003
spec_package: S03
spec_id: SPEC-R003-S03
title: Enforcement and Eval
source_prd: ../../prd.md
source_prd_version: 1.0.0
version: 1.0.0
status: approved
owner: testing-agent
qualityProfile: agent-workflow
riskTier: P1
depends_on:
  - S01
  - S02
approval: user-authorized direct execution on 2026-09-06
---

# Spec Package S03 — Enforcement and Eval

## 1. Objective and Traceability

Business Outcome:
- New R003-era Issues can be checked deterministically for applicability, preflight, surface-plan and closeout contracts; fixtures prove both allowed and blocked outcomes.

| PRD Requirement | Contract Behavior | Acceptance Criterion | Risk |
|---|---|---|---|
| REQ-R003-006 | SPEC-R003-S03-001 | AC-R003-001, AC-R003-006 | P1 |
| REQ-R003-003 | SPEC-R003-S03-002 | AC-R003-003 | P1 |
| REQ-R003-005 | SPEC-R003-S03-003 | AC-R003-005, AC-R003-008 | P1 |

## 2. Existing System Analysis

Relevant modules / interfaces / data / conventions:
- `scripts/checks/spec-test-gates.mjs` validates one child selector and writes a gate report under its child `evidence/gates/` directory.
- `scripts/checks/*.test.mjs` use Node's built-in test runner and `spawnSync` for CLI behavior.
- `rules/ci/spec-release-gates.md` defines PR fast, verification, release and promote gates.
- `packages/core` already validates manifest/artifact structure but does not parse R003 Issue content.

Existing constraints and architecture decisions:
- The check must work with the configured requirements root and canonical child selector form, not a hard-coded one-off path.
- It must not decide QA acceptance, modify production code, or mark failure as pass.
- It must preserve old artifacts by enforcing S01 fields only on explicitly selected R003 child packages or Issues that opt into `change_profile`.

## 3. Scope and Architecture

### In Scope

- `scripts/checks/engineering-discipline.mjs` with a child selector and `--phase preflight | closeout`.
- Stable machine-readable error codes and a JSON report written under the selected package `evidence/gates/`.
- Node test fixtures covering at least 16 categorized cases, including valid and invalid mechanical/semantic/high-risk conditions.
- Documentation for local rerun and CI gate placement.

### Out of Scope

- LLM-based classification of arbitrary prose changes.
- Automatic rewriting of Issues, preflights, closeouts or Sync Handoffs.
- Replacement of `spec-test-gates.mjs`, schema migrations or Test Console UI work.

Architecture and component responsibilities:
- `engineering-discipline.mjs`: discovers selected child Issues, parses frontmatter/headings and writes a deterministic report.
- `engineering-discipline.test.mjs`: creates controlled fixtures and asserts process result/error codes/report shape.
- `scripts/checks/README.md`: names the command, selection boundary and failure semantics.
- Existing `spec-test-gates.mjs`: remains the formal normalized evidence/release-readiness checker.

## 4. Contract Behaviors

### SPEC-R003-S03-001 Validate Change Profile and Preflight

Implements:
- REQ-R003-006

Public Seam:
- CLI: `node scripts/checks/engineering-discipline.mjs <R0NN-slug/S0N-slug> --phase preflight`.
- Observable response or state boundary: exits 0 only when each selected opted-in Issue has a valid profile and required preflight fields.

Preconditions:
- The selector resolves under the repository's configured requirements root and contains at least one Issue with `change_profile`.

Given / When / Then:
- Given: a semantic/high-risk Issue with all S01 preflight headings, a non-empty consumer entry and at least one surface row.
- When: preflight validation runs.
- Then: it exits 0 and writes a `ready` report.
- Given: a semantic/high-risk Issue missing a profile, consumer/entry, surface, or mandatory preflight field.
- When: validation runs.
- Then: it exits non-zero, names stable error code(s), and writes a `blocked` report.
- Given: a mechanical Issue.
- When: validation runs.
- Then: it passes only with a non-empty applicability rationale.

Authorization:
- Allowed actors / roles: local developer, CI and registered test/QA roles may run the command.
- Forbidden actors / tenant boundary: command users cannot use it to write QA acceptance or alter the selected Issue.

State and Data Semantics:
- `--phase preflight` checks `change_profile`, `Applicability Rationale`, and S01 preflight fields.
- The command emits `schemaVersion`, selector, phase, checked issue paths, result and error list; no fixture or production state is rewritten.

Error Semantics:
- Invalid selector: `SPECOS_ENGINEERING_DISCIPLINE_SELECTOR_INVALID`.
- Missing profile/rationale/preflight/surface: a stable `SPECOS_ENGINEERING_DISCIPLINE_*` error code; the report status is `blocked`.
- File/parse failure: report a stable blocking error with a safe relative path.

Idempotency / Concurrency:
- Same input and phase produce equivalent status and error codes. Rewriting the current phase report is safe; reports never overwrite raw execution evidence.

Side Effects and Observability:
- Writes `evidence/gates/engineering-discipline.<phase>.json`; stdout includes the selector and status; stderr includes blocking codes only.

Risk and Gate Impact:
- Risk tier: P1
- Required evidence: Node CLI test results and one normalized R003 package report per phase.
- Gate impact: blocking for opted-in R003 Issues before execution.

Acceptance Mapping:
- AC-R003-001
- AC-R003-006

### SPEC-R003-S03-002 Validate Surface Plans

Implements:
- REQ-R003-003

Public Seam:
- Same CLI in preflight phase validates an `Affected Surfaces and Planned Checks` table.
- Observable response or state boundary: every semantic/high-risk Issue names at least one supported surface, consumer/real entry and planned verification.

Preconditions:
- An Issue has a non-mechanical profile and S01 Issue template headings.

Given / When / Then:
- Given: a source/build dual-surface Issue.
- When: preflight validation runs.
- Then: source and build/release rows are independently present with non-empty real entries and planned verification.
- Given: a declared surface row omits consumer entry or verification.
- When: validation runs.
- Then: it blocks with the surface error code.

Authorization:
- Allowed actors / roles: Issue and test owners may declare rows; reviewer/QA can enforce them.
- Forbidden actors / tenant boundary: a check cannot infer a real entry from a test filename.

State and Data Semantics:
- Supported surface names are the S01 closed set; case normalization is documented and deterministic.

Error Semantics:
- Unknown surface, empty entry or empty planned check is blocking. `Not applicable` is only valid when the complete table records the reason and another applicable surface exists.

Idempotency / Concurrency:
- Not applicable beyond deterministic parsing.

Side Effects and Observability:
- Report includes a count by surface but no command output or secrets.

Risk and Gate Impact:
- Risk tier: P1
- Required evidence: valid/invalid multi-surface fixture tests.
- Gate impact: blocking for R003 preflight validation.

Acceptance Mapping:
- AC-R003-003

### SPEC-R003-S03-003 Validate Honest Closeout

Implements:
- REQ-R003-005
- REQ-R003-006

Public Seam:
- CLI: `node scripts/checks/engineering-discipline.mjs <R0NN-slug/S0N-slug> --phase closeout`.
- Observable response or state boundary: completed/verified opted-in Issues have all S01 closeout fields and no unlabeled claim of release/QA readiness.

Preconditions:
- The selected Issue has status `implemented_pending_verification` or `verified`, or closeout checking is explicitly requested for a blocked Issue.

Given / When / Then:
- Given: an opted-in Issue with all executed/skipped/proved/risk/untouched fields and appropriate evidence reference semantics.
- When: closeout validation runs.
- Then: it exits 0 and reports ready.
- Given: a completed Issue missing a closeout field or claiming QA/release readiness without the owning acceptance/evidence record.
- When: validation runs.
- Then: it exits non-zero with a closeout/unsupported-claim error.

Authorization:
- Allowed actors / roles: Issue owner, reviewer, CI and QA run checks.
- Forbidden actors / tenant boundary: check output cannot change Issue status, acceptance decision or waiver.

State and Data Semantics:
- Completion Record retains raw command/evidence references; the checker sees headings/values only and delegates formal evidence quality to `spec-test-gates.mjs`.

Error Semantics:
- Missing closeout fields, missing mechanical rationale or forbidden claim are blocking and reproducible.
- A missing evidence artifact remains a spec-test/QA concern unless the Issue declares it as a required local evidence reference.

Idempotency / Concurrency:
- Same closeout input yields same error codes; generated gate report updates safely.

Side Effects and Observability:
- Gate report identifies phase, profile, Issue path, errors and status; it does not include raw evidence content.

Risk and Gate Impact:
- Risk tier: P1
- Required evidence: 16-case fixture suite and selected-package closeout report.
- Gate impact: blocking before S02 workflow documentation permits Issue status advancement.

Acceptance Mapping:
- AC-R003-005
- AC-R003-006
- AC-R003-008

## 5. Data and Interface Contracts (conditional)

Data model, persistence, migration, and backward compatibility:
- JSON report schema is additive and local to the selected package `evidence/gates/`. It contains `{ schemaVersion, selector, phase, status, checkedAt, issues, errors }`. Existing `spec-test-gates` report schema remains unchanged.

API / IPC / CLI / event contract:
- Selector format is `<R0NN-slug>/<S0N-slug>`.
- `--phase` defaults to `preflight` and accepts only `preflight` or `closeout`.
- Exit code is 0 for `ready`, 1 for validation/selector failure; stable errors begin `SPECOS_ENGINEERING_DISCIPLINE_`.

## 6. Technical Constraints (conditional)

| Area | Contract or `Not applicable` with rationale |
|---|---|
| Security | Never read, emit or persist secrets/PII; use relative paths only in reports. |
| Performance | Parse only the selected child package; target less than one second for 16 fixtures on a local workstation. |
| Compatibility / migration / rollback | Validate only R003 selected packages or Issues with `change_profile`; historical Workspaces remain untouched. Removing the command does not make existing artifacts unreadable. |
| Agent behavior | Fixture dataset is `R003 engineering-discipline fixtures v1`, with at least 16 cases: four profiles plus invalid/missing-field variants. Required threshold is 100% expected gate result and zero semantic/high-risk false-N/A; retain profile, phase, errors and report path; ambiguous parsing blocks and hands off to test owner. |

## 7. Change Delta

### Added
- An engineering-discipline CLI check, JSON gate report and Node fixture suite.

### Modified
- Checks README and relevant test/gate documentation reference the new preflight/closeout check.

### Removed
- None.

### Unchanged Guarantees
- `spec-test-gates.mjs` remains the authority for normalized release evidence; the new checker validates workflow artifact completeness only; verification method: existing gate tests and new deterministic fixture tests.

## 8. Spec Ready Check

- [x] Each behavior maps to REQ and AC with a public seam and observable result.
- [x] State, data, errors, authorization, side effects, observability, and applicable constraints are explicit.
- [x] Change compatibility and migration behavior are explicit when applicable.
- [x] No blocking Open Question remains.
