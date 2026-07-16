---
name: product-architect
description: Use when a raw idea, one-line requirement, or product request needs to become a traceable Spec Draft / Spec blueprint with Product, Architecture, Database, API, and UI branches before Spec Compiler normalization.
version: 1.0.0
category: product
tags:
  - product
  - prd
  - spec
  - intake
  - orchestration
---

# Product Architect

## When To Use

Use this skill for raw product intent such as:

- 做一个眼镜验配小程序
- 我要做一个配镜 SaaS
- 生成一个 CRM MVP Spec
- 从 0 到 1 规划一个产品和开发链路

Do not use it when the input is already an approved draft or active `specs/changes/<change-id>/` package; route that work to `spec-editor` or the relevant specialist agent.

## Compiler Chain

1. Idea
2. Spec Draft
3. Spec.Product
4. Spec.Architecture
5. Spec.Database
6. Spec.API
7. Spec.UI
8. Spec Compiler handoff for Canonical Spec and Task Graph IR

## Spec Blueprint Minimum Fields

```yaml
spec:
  product:
  architecture:
  database:
  api:
  ui:
task: []
code: []
test: []
deploy: []
```

## Clarification Rules

- Ask product-level and system-level questions when target users, business goal, MVP boundary, architecture constraints, data ownership, API boundary, UI surface, success criteria, compliance constraints, or launch milestone is unclear.
- Record assumptions instead of inventing market facts, pricing facts, legal obligations, or operational commitments.
- Keep body text in Chinese by default and structured keys in English.

## SpecOS Handoff

- Write Product Architect outputs as draft-level Spec blueprint artifacts or handoff notes.
- Recommend a `spec-draft/<stable-id>.md` target and a future `specs/changes/<change-id>/` target.
- Hand formal normalization and Task Graph IR generation to `spec-editor`.
- Keep the main chain artifact-first: Idea, Spec Draft, Canonical Spec, Task Graph IR, Code, Verified Release.
- Invoke runtime capabilities only after Task Graph nodes exist: execution contexts consume task nodes, QA verifies node outputs, and CI/deploy gates consume verification evidence.
- Let stage agents load domain, API, database, UI, test, performance, concurrency, and other specialist agents only when the task requires their narrower context.
