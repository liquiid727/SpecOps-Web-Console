---
id: R001
title: <Requirement Title>
type: feature # feature | change | bug | refactor
version: 1.0.0
status: draft # draft | review | approved | implementing | accepted | blocked | done
priority: P1
owner: <owner>
created_at: YYYY-MM-DD
updated_at: YYYY-MM-DD
affects: []
---

# PRD — <Requirement Title>

## 1. Background

为什么现在需要这个需求？
当前用户、业务或系统遇到了什么问题？

## 2. Goals

- G-R001-001: ...
- G-R001-002: ...

## 3. Non-Goals

- NG-R001-001: ...

## 4. Actors

### ACT-R001-001 <Actor>

允许：
- ...

禁止：
- ...

## 5. Scope

### In Scope
- ...

### Out of Scope
- ...

## 6. User / Business Flow

### FLOW-R001-001 <Flow Name>

```text
Actor
  ↓
Action
  ↓
System Behavior
  ↓
Outcome
```

## 7. Functional Requirements

### REQ-R001-001 <Requirement Name>

System MUST ...

Actor:
- ...

Trigger:
- ...

Expected:
- ...

Observable Result:
- ...

Agent Behavior Contract (conditional):
- Success metric(s): ...
- Dataset / sampled-input source and version: ...
- Passing threshold: ...
- Trajectory fields and anomaly signals: ...
- Automatic degradation and human handoff threshold: ...

### REQ-R001-002 <Requirement Name>

...

## 8. Business Rules

- BR-R001-001: ...
- BR-R001-002: ...

## 9. Lifecycle / State Expectations

如适用：

```text
PENDING
├── APPROVED
├── REJECTED
└── CANCELLED
```

## 10. Edge Cases

| ID | Case | Expected Behavior |
|---|---|---|
| EDGE-R001-001 | ... | ... |

## 11. Invariants / Forbidden Behavior

- INV-R001-001: System MUST NOT ...
- INV-R001-002: System MUST ...

## 12. Acceptance Criteria

- AC-R001-001: Given ..., When ..., Then ...
- AC-R001-002: Given ..., When ..., Then ...

> For Agent behavior, each applicable AC must also identify the success metric,
> Dataset/sample version, passing threshold, and human handoff condition. For
> ordinary behavior, record `Not applicable` rather than inventing an Agent
> evaluation requirement.

## 13. Spec Package Decomposition

### S01 <Spec Package Name>

Covers:
- REQ-R001-001
- REQ-R001-002

Business Outcome:
- ...

Path:
- ./specs/S01-<slug>/

### S02 <Spec Package Name>

Covers:
- REQ-R001-003

Business Outcome:
- ...

Path:
- ./specs/S02-<slug>/

## 14. Open Questions

| ID | Question | Blocking | Decision / Approver | Status |
|---|---|---|---|---|
| Q-R001-001 | ... | true | ... | open |

> Open Question 未确认前，Agent MUST NOT 自行作为已确认需求实现。
