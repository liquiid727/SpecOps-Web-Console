---
name: team-orchestration-baseline
description: Reuse a team-level workflow for routing, planning, handoff, and review without bringing along repository-specific bounded-context agents. Use when a project needs a consistent orchestrator/planner/reviewer/sync style execution baseline.
version: 1.0.0
category: workflow
tags:
  - team
  - orchestration
  - workflow
---

# Team Orchestration Baseline

Use this skill to standardize the execution control plane for repository tasks.

## Workflow

1. Read `references/routing-and-planning.md`.
2. Read `references/handoff-contracts.md`.
3. Read `references/template-mapping.md`.
4. Output routing, task plan, handoff, and reviewer/sync expectations using stable section names.

## Required Rules

- every task starts with routing, then planning
- use stable artifact names for routing, task plan, handoff, findings, and sync handoff
- keep domain-specific backend agents out of the reusable baseline

## Non-Goals

- publishing one repository's bounded-context topology as universal
- forcing one CI or deployment provider
