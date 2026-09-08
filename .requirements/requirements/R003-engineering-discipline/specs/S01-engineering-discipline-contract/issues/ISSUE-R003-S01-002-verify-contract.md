---
id: ISSUE-R003-S01-002
requirement: R003
spec_package: S01
kind: verification
track: verification
primary_spec: SPEC-R003-S01-003
source_spec: ../spec.md
source_spec_id: SPEC-R003-S01
source_spec_version: 1.0.0
source_spec_hash: 600922fc4505f551952502c6be4f5379aa568df6c45dfe4756201f9b49c0071d
source_test: ../test.md
source_test_id: TEST-R003-S01
source_test_version: 1.0.0
source_test_hash: 5e1ba8dbdf1385ee082af16834b3a7c55d1c5a1f59f807cc80fdee3cbbe12741
status: verified
priority: P1
owner: testing-agent
depends_on:
  - ISSUE-R003-S01-001
change_profile: cross-surface
---

# ISSUE-R003-S01-002 — Verify Engineering Discipline Contract

## Covers

- REQ-R003-001
- REQ-R003-002
- REQ-R003-003
- REQ-R003-004
- REQ-R003-005
- SPEC-R003-S01-001
- SPEC-R003-S01-002
- SPEC-R003-S01-003
- SPEC-R003-S01-004
- SPEC-R003-S01-005
- TEST-R003-S01-001
- TEST-R003-S01-002
- TEST-R003-S01-003
- TEST-R003-S01-004
- TEST-R003-S01-005

## Goal

独立验证 S01 的 canonical/mirror 合同性、字段语义和单一真源边界。

## Scope

### Must

- 运行 template consistency suite 和 manifest check。
- 审查新的 rule/standard/template 交叉链接、Decision owner mapping 和 `.agents/notes/` 非引入约束。
- 把执行结果归一化到 S01 `evidence/` 并注册到 `evidence/index.yaml`。

### Must Not

- 不修改规则、模板、实现或用户已有 dirty changes。
- 不把局部 template test 声称为 R003 root acceptance。

## Expected Areas (conditional)

- `scripts/checks/goalspec-template-consistency.test.mjs` | S01 rules/templates | `evidence/{runs,artifacts}/`

## Execution Preflight

Change Profile:
- cross-surface

Applicability Rationale:
- Verifies a rules/templates/generated-mirror contract across multiple consumers.

Confirmed Facts:
- S01 implementation Issue owns template/rule writes; consistency script already asserts declared mirrors.

Unverified Assumptions:
- The new check assertions accurately represent all required mirrors; command output will establish this.

Production Consumers / Real Entry Paths:
- Node test runner executes the repository’s template consistency check; Catalog and intake are represented by real mirror/template paths.

Affected Surfaces and Planned Checks:

| Surface | Consumer / real entry | Planned verification | Required evidence | Gate impact |
|---|---|---|---|---|
| source | rule/template readers | inspect cross-links and owner mapping | review record | blocking |
| generated-output | template mirrors | `node --test scripts/checks/goalspec-template-consistency.test.mjs` | normalized run | blocking |
| cli-config | manifest and workspace discovery | `node packages/cli/dist/main.js check` | normalized run | warning |

Unrelated Worktree Changes:
- Existing user-owned ship-it/CI Record/Catalog changes are not included in this verification scope.

Human Decisions Required:
- None.

## Tasks

- [ ] Run the declared test and check commands.
- [ ] Review owner mapping, links and absence of parallel Note artifacts.
- [ ] Create normalized result, register `evidence/index.yaml`, update Completion Record and child `review.md`.

## Acceptance Criteria

- Given canonical template changes, When the suite runs, Then all mirror comparisons and required field assertions pass.
- Given the new rule, When reviewed, Then it preserves GoalSpec ownership and does not introduce a mode or Note tree.

## Validation

- [ ] `node --test scripts/checks/goalspec-template-consistency.test.mjs`
- [ ] `node packages/cli/dist/main.js check`
- [ ] Evidence normalized and registered in `evidence/index.yaml`
- [ ] No unexplained Spec Deviation

## Dependencies

Depends On:

- ISSUE-R003-S01-001

Blocks:

- ISSUE-R003-S02-001

## Required Evidence

- Evidence type: normalized-result + review report
- Gate impact: blocking
- Location: ../evidence/runs/s01-contract-verification.json
- Must include: TEST, SPEC/version, ISSUE, commit, environment, time, result

## Completion Record

Status: verified
Implemented By: Fairy
Completed At: 2026-09-06
PR / Commit: None — local uncommitted execution
Changed Files: S01 evidence manifest, gate report and review record.
Tests Executed: `node --test scripts/checks/goalspec-template-consistency.test.mjs` (pass); `node packages/cli/dist/main.js check` (pass); S01 preflight checker (pass).
Evidence References: ./evidence/artifacts/S01-engineering-discipline-contract.2026-09-06T002435Z.run.json; ./evidence/gates/S01-engineering-discipline-contract.R003.gate-report.json.
Design Decisions: Verification uses existing Node consistency test as the real template-mirror consumer.
Alternatives Considered: N/A — execution method follows approved Test Design.
Tradeoffs: Evidence remains local working-tree evidence because the user did not request a commit.
Checks Skipped: None.
Verified Behavior: Template contract, mirror consistency and manifest/workflow validation all passed.
Known Limitations / Residual Risk: Evidence needs rerun on a committed revision before an external release workflow.
Intentionally Untouched: S02/S03 implementation and user-owned dirty files.
AI Draft Review: Reviewed against TEST-R003-S01 scenarios and evidence manifest.
Spec Deviation: None
Open Questions: None
