---
name: ddd-layering-governance
description: Use when a task needs DDD layering guidance, thin application orchestration, domain-owned validation, VO/entity/domain service modeling, or enum/value-object refactors that remove magic values from business flows.
---

# DDD Layering Governance

Use this skill to guide design, implementation, refactoring, or review work that depends on clear DDD layering and domain modeling boundaries.

This skill explains:

- how to split responsibilities across `domain`, `application`, `interfaces`, and `infrastructure`
- how to keep `application` thin and orchestration-focused
- where business validation should live
- when to model business values as VO, entity behavior, or domain service logic
- how to remove magic values by introducing typed enums, value objects, or constructors

This skill does not own product-specific workflows, bounded-context state machines, or repository-private conventions. If a task depends on one product's state machine truth, use this skill only for the generic layering and modeling rules, then defer product rules to that product's own source of truth.

## Read This First

1. Read `references/layering-rules.md` for layer ownership and thin-application rules.
2. Read `references/domain-modeling-rules.md` for VO, entity, domain service, and enum/value-object guidance.
3. Read `references/anti-patterns.md` when reviewing or refactoring code with unclear ownership.
4. Read `references/review-checklist.md` when you need a compact implementation or review checklist.

## Core Rules

- `application` owns orchestration, transactions, retries, idempotency coordination, and external integration flow control. It should not become the canonical home of business legality rules.
- `domain` owns entities, value objects, domain services, invariants, business normalization, and business legality.
- Business validation should enter through domain APIs such as `ParseXxx`, `NormalizeXxx`, `NewXxx`, or `IsValid`.
- Business statuses, types, modes, providers, channels, and similar values should be modeled as typed enums, value objects, or typed constants instead of raw strings or integers scattered across layers.
- `domain service` is for business rules that belong to the domain but do not fit cleanly inside one entity or one value object.
- `interfaces` should handle transport concerns only: parsing, binding, serialization, and transport-level error mapping.
- `infrastructure` should implement storage and integrations without redefining business truth.

## Workflow

1. Decide whether the problem is mainly a layering problem or a domain modeling problem.
2. If the problem is about ownership between `domain`, `application`, `interfaces`, or `infrastructure`, start with `references/layering-rules.md`.
3. If the problem is about statuses, types, validation, entity behavior, or magic values, start with `references/domain-modeling-rules.md`.
4. Use `references/anti-patterns.md` to classify what is wrong before proposing a fix.
5. Use `references/review-checklist.md` to produce a concise review or implementation decision.

## Output Expectations

When applying this skill, prefer outputs that include:

- a clear layering decision
- the recommended modeling home for the rule or value
- any anti-patterns found
- the suggested code landing zone
- any follow-up docs or specs that should be updated in the adopter repository
