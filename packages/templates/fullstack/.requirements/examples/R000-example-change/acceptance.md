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

# Requirement Acceptance — Department Restriction（变更示例）

> 本记录为结构示例。证据路径是说明性引用，不代表本仓库真实执行输出。

## Required Spec Package Decisions

| Spec Package | Covers | Decision | Acceptance Record |
|---|---|---|---|
| S01 | REQ-R000-001 | accepted | ./specs/S01-department-filter/acceptance.md |

## PRD Acceptance Criteria

| Acceptance Criterion | Evidence / Spec Acceptance | Result |
|---|---|---|
| AC-R000-001 | S01 department-filter acceptance | verified |

## Product / UAT Decision

Decision:
- accepted

Blocking Open Questions:
- None; department source availability is an approved runtime prerequisite.

Residual Risk:
- Department data freshness remains an operational concern.

Waiver:
- None

## Requirement Done Check

- [x] Every required Spec Package is accepted.
- [x] Every PRD Acceptance Criterion is verified.
- [x] No blocking Open Question remains.
- [x] Promotion decision is allowed.
| AC-R000-002 | S01 no-department acceptance | verified |

## Change Safety Check

- [x] affects includes R001.
- [x] S01 Change Delta declares Unchanged Guarantees.
- [x] Regression evidence covers unchanged authentication and token rotation behavior.
- [x] No unrelated behavior is changed.

## Product / UAT Decision

Decision:
- accepted

Blocking Open Questions:
- None for the demonstrated authority-source assumption.

Residual Risk:
- Department source availability must be monitored in production.

Waiver:
- None
