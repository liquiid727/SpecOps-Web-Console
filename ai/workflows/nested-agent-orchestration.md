# Nested Agent Orchestration

## Status

Accepted workflow contract for host-side multi-agent execution. This file describes how a runtime should use SpecOS agent roles; it does not implement a hosted agent runner.

## Goal

Let a new project reuse the SpecOS agent system without turning `AGENTS.md` into a large prompt registry. Project-level instructions stay in `AGENTS.md`; role registration, prompt assembly, scoped skills, context includes, ownership, and outputs stay in `.agents/manifest.yaml`.

## Roles

- `pola`: coordinator. Owns intake, routing preview, subagent task boundaries, report merge, false-positive filtering, and the final actionable recommendation.
- entry agent: reads `AGENTS.md`, `.codex/instructions.md`, and `.agents/manifest.yaml`, then classifies the request.
- primary agent: the narrowest registered role that owns the main work.
- supporting agents: registered roles that answer bounded questions for surfaces outside the primary agent ownership.
- host runtime: starts agents, controls parallelism, and returns reports to `pola`.

## Dispatch Contract

1. Run or mentally apply `route-request --request "<text>"`.
2. Load only the selected primary role's manifest metadata, role prompt, canonical prompt, declared skills, and context includes.
3. If the primary role needs help, create 2 to 4 supporting tasks with strict boundaries.
4. Each supporting task must name the manifest role, source spec or rule, inspectable surfaces, exact question, expected short output, and non-goals.
5. Supporting agents return concise findings with preconditions, root cause or design risk, and recommended action.
6. `pola` filters duplicated or local-only findings, identifies false positives, and emits one consolidated recommendation.

## Architecture Requests

Architecture, DDD, domain-boundary, invariant, migration-impact, and cross-surface risk requests should use `ddd-domain-agent` as the primary role unless a narrower registered role is clearly better.

Typical supporting agents:

- `openapi-agent`: API contract and error semantics.
- `db-migration-agent`: schema, migration, compatibility, rollout, and rollback.
- `ui-design-agent`: user-facing state, copy, workflow, and responsive behavior.
- `test-editor`: coverage model and independent verification split.
- `performance-test-agent`: latency, throughput, SLO, and baseline risk.
- `concurrency-test-agent`: idempotency, duplicate submission, locking, and final-state invariants.
- `ci-editor`: release gates and reproducible validation commands.
- `reviewer`: final cross-rule risk review.
- `qa-agent`: acceptance decision after evidence exists.

## Output Shape

`pola` should return:

- source spec, draft, rule, or current context used
- primary agent and supporting agents considered
- actionable findings to execute
- findings rejected as false positives or out of scope
- required preconditions before implementation
- validation and acceptance gates

## Non-Goals

- Do not execute agents from `route-request` or `classify-request`; they are routing previews.
- Do not invent roles that are absent from `.agents/manifest.yaml`.
- Do not merge all skills into one broad primary agent.
- Do not paste every subagent report into the final answer.
