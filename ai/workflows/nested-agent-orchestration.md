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
2. Resolve `projectMode` from `.specos/manifest.yaml`, then load `.agents/modes/<projectMode>/manifest.overlay.yaml`.
3. Load only the selected main primary role's manifest metadata, shared prompt pair, mode overlay prompt pair when present, declared skills, and context includes.
4. If the main primary role needs help, create 2 to 4 specialist tasks with strict boundaries. `buildSpecialistDispatchPlan(...)` is the reusable host-side helper for this compression step.
5. Each specialist task must name the manifest role, source spec or rule, inspectable surfaces, exact question, expected short output, and non-goals.
6. Specialist agents return concise findings with preconditions, root cause or design risk, and recommended action.
7. `pola` filters duplicated or local-only findings, identifies false positives, and emits one consolidated recommendation.
8. If the task makes a semantic change, `pola` applies `sync-handoff-gateway.md` before CI, PR, release, or promotion claims and records which neighboring assets were updated or waived.

When a host persists `route-request` output, it should validate that payload before agent startup. Use `validateRouteRequestOutput(...)` directly in-process, or call `validate-route-output --file <path> --format <full|dispatch-json|primary-json|execution-plan-json>` for a deterministic CLI check that matches the same core schema rules.

When a host wants the preview object, it should prefer `buildValidatedRouteRequestOutput(...)` so the route projection is built and checked through the same path as the CLI. That helper now supports `full`, `dispatch-json`, `primary-json`, and `execution-plan-json`. When a host wants the runtime object instead of the preview object, it should prefer `buildValidatedAgentExecutionPlan(...)`. That helper builds the execution plan, prompt assembly, primary envelope, and specialist envelopes, then validates the assembled object before dispatch. If the host needs a narrow schema contract for the prompt-assembly layer, use `buildHostPromptAssemblySchema(...)`. If it needs a narrow schema contract for the envelope layer, use `buildDispatchPromptEnvelopeSchema(...)`, or the role-specific aliases `buildPrimaryDispatchPromptEnvelopeSchema(...)` and `buildSpecialistDispatchPromptEnvelopeSchema(...)`. If it needs a narrow schema contract for the runtime object, use `buildExecutionPlanOutputSchema(...)`. These schema helpers all return the shared `ArtifactShapeSchema` shape, so host code can consume `artifact`, `rootType`, and field-list metadata consistently across assembly, envelope, and execution-plan artifacts. If it needs a validation helper with execution-plan naming instead of route-output naming, use `validateExecutionPlanOutput(...)`. If it wants envelope validation with role semantics instead of a generic dispatch name, use `validatePrimaryDispatchPromptEnvelope(...)` for the main agent payload and `validateSpecialistDispatchPromptEnvelope(...)` for specialist payloads. Hosts that assemble roles manually can validate narrower pieces with `validateHostPromptAssembly(...)`, `validateAgentExecutionPlan(...)`, and `validateDispatchPromptEnvelope(...)`.

If a host persists the execution plan itself, it should validate that file before startup with `validateExecutionPlanOutput(...)` in-process or `validate-execution-plan --file <path>` from the CLI.

## Canonical Artifact Flow

```text
docs/spec-modes/ -> current/ -> spec-draft/ -> design/ -> specs/roadmap.md -> specs/<SPEC-ID>-<slug>/spec.md -> implementation/ -> reviews/ -> tests/
```

## Architecture Requests

Architecture, DDD, domain-boundary, invariant, migration-impact, and cross-surface risk requests should use `architecture-agent` as the main primary role. `ddd-domain-agent` is a specialist for bounded contexts, invariants, and domain risk.

Main agents:

- `architecture-agent`: spec impact, architecture decisions, domain/API/data/UI/test/deployment impact mapping.
- `implementation-agent`: frontend and backend execution coordination; independent testing stays outside this role.
- `deployment-agent`: CI, release gates, deployment readiness, and delivery evidence handoff.
- `testing-agent`: independent verification, evidence orchestration, and QA acceptance readiness.

Typical specialist agents:

- `spec-editor`: draft-to-design, roadmap, and feature-spec shaping.
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

- active project mode and current delivery context used
- overlay manifest and role prompt load order used
- source design doc, feature spec, draft, rule, or current context used
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
