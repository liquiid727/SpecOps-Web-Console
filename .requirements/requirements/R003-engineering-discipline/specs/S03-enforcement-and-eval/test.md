---
requirement: R003
spec_package: S03
test_spec_id: TEST-R003-S03
source_prd: ../../prd.md
source_spec: ./spec.md
source_spec_id: SPEC-R003-S03
source_spec_version: 1.0.0
source_spec_hash: c93c94715da4f71578c7241e3ff3d39e0b49137b8705d500bfc3376257b2db00
version: 1.0.0
status: approved
owner: testing-agent
qualityProfile: agent-workflow
riskTier: P1
approval: user-authorized direct execution on 2026-09-06
---

# Test Design — S03 Enforcement and Eval

## 1. Purpose and Scope

This document proves the engineering-discipline CLI check is deterministic,
selects only one canonical child package, blocks missing R003 contract fields,
and leaves QA/release evidence ownership to existing gates.

### In Scope

- CLI selector/phase parsing, report generation, stable errors and Issue parsing.
- At least 16 controlled fixture cases and their expected exits/report status.
- README and CI rerun documentation.

### Out of Scope

- LLM classifier quality beyond explicit fixture content, remote CI execution, production release decision and Test Console UI.

## 2. Coverage Matrix

| Requirement | Spec | Test | Category / level | Required Evidence | Gate Impact |
|---|---|---|---|---|---|
| REQ-R003-006 | SPEC-R003-S03-001 | TEST-R003-S03-001 | CLI / unit | Node test output + report | blocking |
| REQ-R003-003 | SPEC-R003-S03-002 | TEST-R003-S03-002 | CLI / contract | multi-surface fixtures | blocking |
| REQ-R003-005, REQ-R003-006 | SPEC-R003-S03-003 | TEST-R003-S03-003 | CLI / contract | closeout fixtures | blocking |

## 3. Test Environment and Data

- Fixture / seed / accounts: `R003 engineering-discipline fixtures v1`, created by the Node test in isolated temporary directories.
- Dependency mode: real local filesystem and `node:test`; no external process except the checker subprocess.
- Environment, feature flags, and configuration: temporary requirements root with child selector paths; no network.
- Isolation and cleanup: each test uses an OS temporary directory and deletes only its own fixture directory.
- PII / secrets handling: fixture content uses only synthetic paths and values.
- Baseline or commit under test: current R003 working tree revision.

## 4. Test Scenarios

### TEST-R003-S03-001 Selector and Phase Contract

Covers:
- REQ-R003-006
- SPEC-R003-S03-001
- AC-R003-006

Category / Level:
- Unit / CLI

Required Evidence / Gate Impact:
- `node --test scripts/checks/engineering-discipline.test.mjs` / blocking

Given:
- Invalid selectors and an unsupported phase.

When:
- The checker executes.

Then:
- It exits non-zero with `SPECOS_ENGINEERING_DISCIPLINE_SELECTOR_INVALID` or phase error and does not treat a fallback path as valid.

### TEST-R003-S03-002 Applicability and Preflight Fixtures

Covers:
- REQ-R003-006
- SPEC-R003-S03-001
- BR-R003-003
- EDGE-R003-001
- EDGE-R003-003
- AC-R003-001

Category / Level:
- Unit / CLI fixture

Required Evidence / Gate Impact:
- 8 valid/invalid profile and preflight cases / blocking

Given:
- Mechanical, behavior, cross-surface and high-risk Issue fixture variants.

When:
- Preflight validation executes.

Then:
- Valid cases pass; missing profile, invalid profile, empty mechanical rationale, missing fact, missing assumption, missing consumer and missing human decision cases block with stable codes.

### TEST-R003-S03-003 Surface Matrix Fixtures

Covers:
- REQ-R003-003
- SPEC-R003-S03-002
- BR-R003-006
- EDGE-R003-002
- AC-R003-003

Category / Level:
- Unit / CLI fixture

Required Evidence / Gate Impact:
- 4 surface-plan cases / blocking

Given:
- Source-only, source-plus-build, missing real entry and missing verification rows.

When:
- Preflight validation executes.

Then:
- Separate valid rows pass; an unsupported/empty row blocks and report includes the affected Issue/path.

### TEST-R003-S03-004 Closeout Fixtures and Report Determinism

Covers:
- REQ-R003-005
- REQ-R003-006
- SPEC-R003-S03-003
- INV-R003-002
- AC-R003-005
- AC-R003-006
- AC-R003-008

Category / Level:
- Unit / CLI fixture

Required Evidence / Gate Impact:
- 4 closeout cases, report shape and repeat-run assertion / blocking

Given:
- Complete, missing skipped, missing verified/risk/untouched and unsupported QA/release claim fixtures.

When:
- Closeout validation executes twice against each fixture.

Then:
- Expected status/error code is identical; report has schemaVersion, selector, phase, status, issues and errors; invalid closeouts never pass.

## 5. Required Coverage and Regression

Applicable coverage:
- Unit: selector, enum, heading/table and closeout parsing.
- Integration: subprocess execution, report write, nested child-package discovery.
- Contract: 16 fixture cases with exact expected status/error codes.
- Failure injection: invalid selector, unreadable/malformed issue and missing required fields.
- Security: report never includes fixture secrets (fixtures contain none) and uses relative paths.
- Performance: bounded local fixture suite; assert no full repository scan.
- E2E/manual, API, browser/UI, migration and concurrency: Not applicable — local deterministic file check.

Regression scope:
- Existing `spec-test-gates.test.mjs`, new `engineering-discipline.test.mjs`, template consistency test, and command documentation.

## 6. Affected Observable Surfaces

| Surface | Consumer / real entry | Planned verification | Required evidence | Gate impact |
|---|---|---|---|---|
| source | Node module parser/checker | direct Node test imports/subprocess runs | Node test output | blocking |
| cli-config | `node scripts/checks/engineering-discipline.mjs <selector>` | valid/invalid selector and phase subprocess tests | JSON gate report | blocking |
| generated-output | `evidence/gates/engineering-discipline.<phase>.json` | parse report after each fixture run | report artifact assertion | blocking |
| persistence-protocol | child Issue Markdown/YAML contract | malformed/missing heading and stable code fixtures | Node test output | blocking |

## 7. Evidence, Gates, and Flaky Policy

| Stage | Scope | Required Checks | Evidence | Blocking |
|---|---|---|---|---|
| PR | checker and fixtures | `node --test scripts/checks/engineering-discipline.test.mjs` | normalized run + raw stdout | yes |
| Merge / nightly | R003 discipline | checker + template consistency + spec-test gates where evidence applies | normalized run | P1 |
| Pre-production | Not applicable | no deployed runtime surface | rationale | no |

Flaky result policy:
- Temporary-directory cleanup failure or filesystem race is recorded as flaky/blocked; it is never retried into PASS without classification.

## 8. Agent Eval Plan

- Dataset: `R003 engineering-discipline fixtures v1`, exactly 16 or more labeled fixture documents.
- PR smoke selection: all fixtures because they are local and bounded.
- Full selection: the same full fixture set on merge/nightly until a larger controlled corpus exists.
- Metrics/threshold: expected status/error correctness 100%; semantic/high-risk false-N/A 0; classification/evidence-choice correctness at least 90% for labeled cases.
- Online sampling: Not applicable — checker does not make external user-impacting decisions.
- Trajectory alerts: unknown profile, parser ambiguity, report schema mismatch or unexpectedly passing invalid fixture blocks the gate.
- Degradation/handoff: command exits non-zero and delegates to testing-agent/reviewer; it never repairs artifacts automatically.
- Human review: testing-agent reviews fixture labels, assertions, risk tier and any future dataset policy change.

## 9. Exit Criteria

- [ ] Every P1 mapped REQ and SPEC has scenario coverage.
- [ ] At least 16 labeled fixture cases cover all profiles and required invalid conditions.
- [ ] Every blocking case produces expected stable status/error code and report shape.
- [ ] Existing gate checker behavior remains unchanged.
- [ ] Evidence is bound to the current Spec version/hash and commit.
- [ ] No unresolved P0/P1 defect remains.
