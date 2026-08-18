---
name: product-architect
description: Use when a raw idea, one-line requirement, or product request needs to become an accepted, traceable PRD with Product, Architecture, Database, API, and UI branch coverage before spec-editor runs prd-to-spec.
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

Do not use it when the input is already an accepted PRD or an approved Feature Spec; route that work to `spec-editor` (`/prd-to-spec`, `/spec-to-test`, `/to-issues`) or the relevant specialist agent.

## Intake Chain

1. Idea
2. Accepted PRD (`/prd`)
3. PRD.Product
4. PRD.Architecture
5. PRD.Database
6. PRD.API
7. PRD.UI
8. spec-editor handoff for `/prd-to-spec` Feature Spec decomposition

## PRD Branch Minimum Fields

```yaml
prd:
  product:
  architecture:
  database:
  api:
  ui:
requirements: []
acceptance: []
assumptions: []
open_questions: []
```

## Clarification Rules

- Ask product-level and system-level questions when target users, business goal, MVP boundary, architecture constraints, data ownership, API boundary, UI surface, success criteria, compliance constraints, or launch milestone is unclear.
- Record assumptions instead of inventing market facts, pricing facts, legal obligations, or operational commitments.
- Keep body text in Chinese by default and structured keys in English.

## SpecOS Handoff

- Write Product Architect outputs as PRD artifacts or handoff notes under the intake directory declared by `.specos/manifest.yaml` `artifacts.draftsDir` (default `.prd/`).
- Hand Feature Spec decomposition, Test Spec derivation, and Issue generation to `spec-editor` (`/prd-to-spec`, `/spec-to-test`, `/to-issues`).
- Keep the main chain artifact-first: PRD, Approved Feature Spec, Approved Test Spec, Issues, Code, Verified Release.
- Invoke runtime capabilities only after Issues exist: execution contexts consume implementation Issues, QA verifies through verification Issues, and CI/deploy gates consume verification evidence.
- Let stage agents load domain, API, database, UI, test, performance, concurrency, and other specialist agents only when the task requires their narrower context.
