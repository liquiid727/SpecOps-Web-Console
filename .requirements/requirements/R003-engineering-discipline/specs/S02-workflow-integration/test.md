---
requirement: R003
spec_package: S02
test_spec_id: TEST-R003-S02
source_prd: ../../prd.md
source_spec: ./spec.md
source_spec_id: SPEC-R003-S02
source_spec_version: 1.0.0
source_spec_hash: 1667af6ca078bff579cd40d2fc41d9982fd0d0b3800724e4d6357f4f4549c19d
version: 1.0.0
status: approved
owner: testing-agent
qualityProfile: agent-workflow
riskTier: P1
approval: user-authorized direct execution on 2026-09-06
---

# Test Design — S02 Workflow Integration

## 1. Purpose and Scope

This document proves that existing execution, review and handoff skills consume
the S01 contract without changing GoalSpec ownership boundaries.

### In Scope

- `loop-it`, `review-it`, Sync Handoff and compatible `ship-it` CI Record wording.
- Preflight-before-write, closeout-before-status, real-entry review and common sync vocabulary.

### Out of Scope

- Running remote Git workflows, QA acceptance creation, Test Console UI, and S03 parser implementation.

## 2. Coverage Matrix

| Requirement | Spec | Test | Category / level | Required Evidence | Gate Impact |
|---|---|---|---|---|---|
| REQ-R003-001, REQ-R003-002 | SPEC-R003-S02-001 | TEST-R003-S02-001 | Documentation contract | review + S03 preflight run | blocking |
| REQ-R003-003, REQ-R003-005 | SPEC-R003-S02-002 | TEST-R003-S02-002 | Documentation contract | review + S03 closeout run | blocking |
| REQ-R003-004 | SPEC-R003-S02-003 | TEST-R003-S02-003 | Review behavior | review record | blocking |
| REQ-R003-001 through REQ-R003-005 | SPEC-R003-S02-004 | TEST-R003-S02-004 | Handoff contract | review + fixture output | blocking |

## 3. Test Environment and Data

- Fixture / seed / accounts: updated skills/workflow documents and R003 Issue fixtures.
- Dependency mode: repository filesystem and Node check runner; no external service.
- Environment, feature flags, and configuration: repository root, current dirty user-owned CI Record/ship-it inputs preserved.
- Isolation and cleanup: no Git staging, commit, push, PR, merge or acceptance write.
- PII / secrets handling: documentation and fixtures only.
- Baseline or commit under test: current R003 working tree revision.

## 4. Test Scenarios

### TEST-R003-S02-001 Loop Preflight Boundary

Covers:
- REQ-R003-001
- REQ-R003-002
- SPEC-R003-S02-001
- AC-R003-002

Category / Level:
- Workflow contract / integration

Required Evidence / Gate Impact:
- S03 preflight report + review record / blocking

Given:
- A semantic R003 Issue that omits a required preflight field.

When:
- The engineering-discipline preflight check and Loop It guidance are inspected.

Then:
- The check blocks and Loop It states that it must stop before execution instead of inventing facts.
- The existing Issue status machine remains unchanged.

### TEST-R003-S02-002 Completion and Real-Entry Review Boundary

Covers:
- REQ-R003-003
- REQ-R003-005
- SPEC-R003-S02-002
- INV-R003-002
- AC-R003-003
- AC-R003-005

Category / Level:
- Workflow contract / integration

Required Evidence / Gate Impact:
- S03 closeout report + review record / blocking

Given:
- A completed R003 Issue with a source/build surface plan and closeout fields.

When:
- `review-it` guidance and the closeout check are applied.

Then:
- The reviewer checks actual consumer/entry evidence and source/artifact separation.
- Focused validation is not described as independent verification, QA acceptance or release readiness.

### TEST-R003-S02-003 Decision Owner Escalation

Covers:
- REQ-R003-004
- SPEC-R003-S02-003
- AC-R003-004

Category / Level:
- Review / manual

Required Evidence / Gate Impact:
- review record / blocking

Given:
- An Issue with a choice that changes durable cross-package behavior.

When:
- Workflow guidance is followed.

Then:
- It links/blocks for the appropriate Design or Spec owner instead of creating a Note or storing architecture truth only in a Completion Record.

### TEST-R003-S02-004 Sync Handoff Status

Covers:
- REQ-R003-001
- REQ-R003-002
- REQ-R003-003
- REQ-R003-004
- REQ-R003-005
- SPEC-R003-S02-004
- AC-R003-008

Category / Level:
- Handoff contract / integration

Required Evidence / Gate Impact:
- reviewed Sync Handoff + S03 report / blocking

Given:
- A semantic rules/templates/skills change with an intentionally unmodified user-owned ship-it surface.

When:
- Sync Handoff is completed.

Then:
- It lists change profile, affected surfaces, neighbors checked, preserved existing user changes, any waiver/reason and open risk.
- It cannot claim `pass` if required neighbor evidence is absent.

## 5. Required Coverage and Regression

Applicable coverage:
- Integration: read real skill/workflow files with S03 fixture parser.
- Contract: source-order, status, ownership and handoff wording review.
- Failure path: missing preflight, missing closeout, missing surface and unsupported claim fixtures.
- Security/performance/migration/concurrency: Not applicable — no runtime protocol or external resource lifecycle changes.

Regression scope:
- S03 fixture suite, `scripts/checks/goalspec-template-consistency.test.mjs`, and focused text assertions added with the workflow changes.

## 6. Affected Observable Surfaces

| Surface | Consumer / real entry | Planned verification | Required evidence | Gate impact |
|---|---|---|---|---|
| source | Codex/host reads `loop-it`, `review-it`, `ship-it`, Sync Handoff | explicit text assertions and human review | Node test + review | blocking |
| cli-config | local `node scripts/checks/engineering-discipline.mjs` run | valid/invalid R003 Issue fixtures | JSON gate report | blocking |
| generated-output | Issue Completion Record and CI Record rendered from templates | inspect generated R003 Issue and preserved CI Record fields | review record | warning |

## 7. Evidence, Gates, and Flaky Policy

| Stage | Scope | Required Checks | Evidence | Blocking |
|---|---|---|---|---|
| PR | S02 documents | focused Node text/fixture tests | normalized run + review | yes |
| Merge / nightly | R003 workflow | S03 full fixture suite | normalized run | P1 |
| Pre-production | Not applicable | no release surface | rationale | no |

Flaky result policy:
- Documentation/fixture failures are deterministic until a specific nondeterministic cause is recorded.

## 8. Agent Eval Plan

- Dataset: `R003 engineering-discipline fixtures v1`, using workflow-facing semantic/high-risk and mechanical cases.
- PR smoke selection: all 16 cases because the suite is local and bounded.
- Passing threshold: expected gate outcome is 100%; false-N/A for semantic/high-risk is 0; no unsupported completion claim fixture passes.
- Retained trajectory: selected Issue, profile, preflight/closeout status, error codes, Sync Handoff status.
- Human review: reviewer/QA verifies that test wording does not promote workflow output to QA acceptance.

## 9. Exit Criteria

- [ ] Every P1 mapped REQ and SPEC has scenario coverage.
- [ ] Missing preflight/closeout/surface/owner cases are blocked by contract or S03 check.
- [ ] Skill/workflow tests and review pass without changing GoalSpec state/ownership meanings.
- [ ] Evidence is bound to the current Spec version/hash and commit.
- [ ] No unresolved P0/P1 defect remains.
