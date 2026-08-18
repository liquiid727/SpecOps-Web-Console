---
id: R001
title: <Requirement Title>
type: feature # feature | change | bug | refactor
status: draft # draft | review | approved | implementing | done
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

## 13. Feature Decomposition

### F01 <Feature Name>

Covers:
- REQ-R001-001
- REQ-R001-002

Business Outcome:
- ...

### F02 <Feature Name>

Covers:
- REQ-R001-003

Business Outcome:
- ...

## 14. Open Questions

- Q-R001-001: ...

> Open Question 未确认前，Agent MUST NOT 自行作为已确认需求实现。
