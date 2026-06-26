# Nested Agent Orchestration

## Status

Accepted workflow contract for host-side multi-agent execution. This file describes how a runtime should use SpecOS agent roles; it does not implement a hosted agent runner.

## Goal

Let a new project reuse the SpecOS agent system without turning `AGENTS.md` into a large prompt registry. Project-level instructions stay in `AGENTS.md`; main-agent hierarchy, role registration, prompt assembly, scoped skills, context includes, ownership, and outputs stay in `.agents/manifest.yaml`.

## Roles

- `pola`: coordinator. Owns intake, routing preview, subagent task boundaries, report merge, false-positive filtering, and the final actionable recommendation.
- entry agent: reads `AGENTS.md`, `.codex/instructions.md`, and `.agents/manifest.yaml`, then classifies the request.
- main primary agent: one of `architecture-agent`, `implementation-agent`, `deployment-agent`, or `testing-agent`.
- specialist agents: registered roles that answer bounded questions for surfaces outside the main primary agent ownership.
- host runtime: starts agents, controls parallelism, and returns reports to `pola`.

## Dispatch Contract

1. Run or mentally apply `route-request --request "<text>"`.
2. Load only the selected main primary role's manifest metadata, role prompt, canonical prompt, declared skills, and context includes.
3. If the main primary role needs help, create 2 to 4 specialist tasks with strict boundaries.
4. Each specialist task must name the manifest role, source spec or rule, inspectable surfaces, exact question, expected short output, and non-goals.
5. Specialist agents return concise findings with preconditions, root cause or design risk, and recommended action.
6. `pola` filters duplicated or local-only findings, identifies false positives, and emits one consolidated recommendation.
7. If the task makes a semantic change, `pola` applies `sync-handoff-gateway.md` before CI, PR, release, or promotion claims and records which neighboring assets were updated or waived.

## Architecture Requests

Architecture, DDD, domain-boundary, invariant, migration-impact, and cross-surface risk requests should use `architecture-agent` as the main primary role. `ddd-domain-agent` is a specialist for bounded contexts, invariants, and domain risk.

Main agents:

- `architecture-agent`: spec impact, architecture decisions, domain/API/data/UI/test/deployment impact mapping.
- `implementation-agent`: frontend and backend execution coordination; independent testing stays outside this role.
- `deployment-agent`: CI, release gates, deployment readiness, and delivery evidence handoff.
- `testing-agent`: independent verification, evidence orchestration, and QA acceptance readiness.

Typical specialist agents:

- `spec-editor`: draft-to-Contract shaping and active Change Workspace structure.
- `ddd-domain-agent`: bounded contexts, invariants, and domain risk.
- `openapi-agent`: API contract and error semantics.
- `db-migration-agent`: schema, migration, compatibility, rollout, and rollback.
- `ui-design-agent`: user-facing state, copy, workflow, and responsive behavior.
- `unit-test-agent`: implementation-coupled unit coverage analysis.
- `test-editor`: coverage model and independent verification split.
- `test-editor`: API scenario assertions, test-plan structure, and Bruno execution assets.
- `playwright-test-agent`: browser behavior, UI state coverage, traces, and flaky risk under the testing track.
- `e2e-test-agent`: business journey coverage.
- `performance-test-agent`: latency, throughput, SLO, and baseline risk.
- `concurrency-test-agent`: idempotency, duplicate submission, locking, and final-state invariants.
- `ci-editor`: release gates and reproducible validation commands.
- `reviewer`: final cross-rule risk review.
- `qa-agent`: acceptance decision after evidence exists.

## Output Shape

`pola` should return:

- source spec, draft, rule, or current context used
- main primary agent and specialist agents considered
- actionable findings to execute
- findings rejected as false positives or out of scope
- sync handoff status for affected specs, rules, agents, workflows, tests, and CI gates
- required preconditions before implementation
- validation and acceptance gates

## Non-Goals

- Do not execute agents from `route-request` or `classify-request`; they are routing previews.
- Do not invent roles that are absent from `.agents/manifest.yaml`.
- Do not merge all skills into one broad main agent.
- Do not paste every subagent report into the final answer.
