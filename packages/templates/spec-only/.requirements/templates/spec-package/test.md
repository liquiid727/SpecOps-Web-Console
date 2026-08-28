---
requirement: R001
spec_package: S01
test_spec_id: TEST-R001-S01
source_prd: ../../prd.md
source_spec: ./spec.md
source_spec_id: SPEC-R001-S01
source_spec_version: 1.0.0
source_spec_hash: <sha256-or-immutable-revision>
version: 1.0.0
status: draft # draft | review | approved | stale | superseded
owner: <testing-owner>
qualityProfile: <backend-api | frontend-ui | fullstack-flow | data-migration | agent-workflow>
riskTier: P1 # P0 | P1 | P2
---

# Test Design — S01 <Spec Package Name>

## 0. Coverage Matrix

| Requirement | Spec | Test | Category | Level | Required Evidence | Gate Impact |
|---|---|---|---|---|---|---|
| REQ-R001-001 | SPEC-R001-S01-001 | TEST-R001-S01-001 | Happy path | Integration | normalized result + trace | blocking |

> This is a verification design. Execution outcomes belong in
> `./evidence/{plans,schedules,runs,gates,artifacts}/` and are referenced by
> `acceptance.md`; do not write final PASS/FAIL results here.

## 1. Test Data and Environment

- Fixture / seed: ...
- Dependency mode: real | containerized | stubbed | recorded
- Environment and configuration: ...
- Cleanup / isolation: ...
- PII and secrets handling: ...
- Baseline or commit under test: ...

## 2. Test Scenarios

### TEST-R001-S01-001 <Happy Path>

Covers:
- REQ-R001-001
- SPEC-R001-S01-001
- AC-R001-001

Category: Happy path
Level: Integration
Required Evidence: normalized result + trace
Gate Impact: blocking

Given:
- ...

When:
- ...

Then:
- ...
- Observable assertion: ...
- Error / side-effect assertion: ...

### TEST-R001-S01-002 <Negative / Invariant>

Covers:
- INV-R001-001
- SPEC-R001-S01-001

Category: Negative / Invariant
Level: Integration
Required Evidence: normalized result + log
Gate Impact: blocking

Given:
- ...

When:
- ...

Then:
- Operation fails with: ...
- System state remains valid: ...
- No illegal side effect occurs: ...

## 3. CI/CD Gate Matrix

| Stage | Scope | Required Checks | Agent Eval | Evidence | Blocking |
|---|---|---|---|---|---|
| PR | changed scope | unit + critical path | N/A or 20–50 smoke cases | gate report | yes |
| Merge / nightly | full scope | regression + contract + performance baseline | N/A or full Eval | normalized run | P0/P1 |
| Pre-production / canary | release scope | sampled online evaluation + trajectory alerts | when applicable | promotion evidence | P0/P1 |
| Production | live traffic | trace + metrics + logs + degradation/handoff | when applicable | incident/runtime evidence | policy-defined |

## 4. Agent Eval Plan (conditional)

> Include when `qualityProfile: agent-workflow` or the Spec declares Agent
> behavior; otherwise write `Not applicable`.

- PR smoke dataset / cases (20–50): ...
- Merge / nightly full dataset: ...
- Success metrics and thresholds: ...
- Online sampling method and rate: ...
- Trajectory fields and anomaly alerts: ...
- Automatic degradation assertion: ...
- Human handoff assertion and owner: ...
- Human reviewer for AI-generated cases: ...

## 5. QA Exploratory Cases

- External failure, timeout, cancellation: ...
- Retry, duplicate, and re-entry: ...
- Permission / tenant boundary: ...
- Empty, loading, or recovery state: ...
- For Agent behavior, adversarial or low-confidence inputs: ...

## 6. Exit Criteria

- [ ] Every P0/P1 mapped REQ and SPEC has one or more TEST mappings.
- [ ] Every applicable BR, INV, EDGE, and AC has a verification method.
- [ ] Required automated, contract, performance, Agent Eval, and exploratory checks are identified or marked not applicable with rationale.
- [ ] Evidence type and gate impact are explicit for every blocking test.
- [ ] AI-generated case drafts have human coverage and assertion review.
- [ ] Test Design is bound to the exact approved Spec version and hash.
