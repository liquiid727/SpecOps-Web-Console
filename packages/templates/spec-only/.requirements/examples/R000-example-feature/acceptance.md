---
requirement: R000
source_prd: ./prd.md
source_index: ./index.yaml
source_prd_version: 1.0.0
decision: accepted
qa_owner: qa-agent
product_approver: example-product-owner
accepted_at: 2026-08-13
promotion: allowed
---

# Requirement Acceptance — Enterprise SSO Login（示例）

> 本记录展示汇总关系；证据路径为示例引用，不是仓库真实运行输出。

## Required Spec Package Decisions

| Spec Package | Covers | Decision | Acceptance Record |
|---|---|---|---|
| S01 | REQ-R000-001, REQ-R000-002 | accepted | ./specs/S01-sso-login/acceptance.md |
| S02 | REQ-R000-002 | accepted | ./specs/S02-session-management/acceptance.md |

## PRD Acceptance Criteria

| Acceptance Criterion | Evidence / Spec Acceptance | Result |
|---|---|---|
| AC-R000-001 | S01 callback + S02 session acceptance | verified |
| AC-R000-002 | S01 invalid-state acceptance | verified |

## Product / UAT Decision

Decision:
- accepted

Blocking Open Questions:
- None for the demonstrated default policy.

Residual Risk:
- Session duration per subsystem remains a future product decision.

Waiver:
- None

## Requirement Done Check

- [x] Every required Spec Package is accepted.
- [x] Every PRD Acceptance Criterion is verified.
- [x] No blocking Open Question remains.
- [x] Promotion decision is allowed.
