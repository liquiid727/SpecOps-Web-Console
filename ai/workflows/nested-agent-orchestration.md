# Nested Agent Orchestration

## Status

Accepted workflow contract for host-side multi-agent execution. This file describes how a runtime should use SpecOS agent roles; it does not implement a hosted agent runner.

## Goal

Let a new project reuse the SpecOS agent system without turning `AGENTS.md` into a large prompt registry. Project-level instructions stay in `AGENTS.md`; main-agent hierarchy, role registration, prompt assembly, scoped skills, context includes, ownership, and outputs stay in `.agents/manifest.yaml`.

## Roles

SpecOS uses a layered model: `pola` (coordinator) routes to one of four main agents (`tier: main`), and each main agent opens its `tier: specialist` roles on demand as subagents.

- `pola`: coordinator. Owns intake, routing preview, subagent task boundaries, report merge, false-positive filtering, and the final actionable recommendation. Never a dispatch target.
- entry agent: reads `AGENTS.md`, `.codex/instructions.md`, and `.agents/manifest.yaml`, then classifies the request.
- main primary agent: one of `architecture-agent`, `implementation-agent`, `testing-agent`, or `qa-agent`.
- intake specialist: `product-architect-agent` compiles raw ideas into accepted PRDs (`/prd`) before `spec-editor` runs `/prd-to-spec`; both are managed by `architecture-agent`.
- specialist agents: registered `tier: specialist` roles with a `managed_by` main agent. They answer bounded questions and are activated on demand by their managing main agent, not pre-dispatched.
- host runtime: starts agents, controls parallelism, and returns reports to `pola`.

## Dispatch Contract

1. Run or mentally apply `route-request --request "<text>"`.
2. Resolve `projectMode` from `.specos/manifest.yaml`, then load `.agents/modes/<projectMode>/manifest.overlay.yaml`.
3. Load only the selected main primary role's manifest metadata, shared prompt pair, mode overlay prompt pair when present, declared skills, and context includes.
4. If the main primary role needs help, create 2 to 4 specialist issues with strict boundaries. `buildSpecialistDispatchPlan(...)` is the reusable host-side helper for this compression step.
5. Each specialist task must name the manifest role, source spec or rule, inspectable surfaces, exact question, expected short output, and non-goals.
6. Specialist agents return concise findings with preconditions, root cause or design risk, and recommended action.
7. `pola` filters duplicated or local-only findings, identifies false positives, and emits one consolidated recommendation.
8. If the task makes a semantic change, `pola` applies `sync-handoff-gateway.md` before CI, PR, release, or promotion claims and records which neighboring assets were updated or waived.

When a host persists `route-request` output, it should validate that payload before agent startup. Use `validateRouteRequestOutput(...)` directly in-process, or call `validate-route-output --file <path> --format <full|dispatch-json|primary-json|execution-plan-json>` for a deterministic CLI check that matches the same core schema rules.

When a host wants the preview object, it should prefer `buildValidatedRouteRequestOutput(...)` so the route projection is built and checked through the same path as the CLI. That helper now supports `full`, `dispatch-json`, `primary-json`, and `execution-plan-json`. When a host wants the runtime object instead of the preview object, it should prefer `buildValidatedAgentExecutionPlan(...)`. That helper builds the execution plan, prompt assembly, primary envelope, and specialist envelopes, then validates the assembled object before dispatch. If the host needs a narrow schema contract for the prompt-assembly layer, use `buildHostPromptAssemblySchema(...)`. If it needs a narrow schema contract for the envelope layer, use `buildDispatchPromptEnvelopeSchema(...)`, or the role-specific aliases `buildPrimaryDispatchPromptEnvelopeSchema(...)` and `buildSpecialistDispatchPromptEnvelopeSchema(...)`. If it needs a narrow schema contract for the runtime object, use `buildExecutionPlanOutputSchema(...)`. These schema helpers all return the shared `ArtifactShapeSchema` shape, so host code can consume `artifact`, `rootType`, and field-list metadata consistently across assembly, envelope, and execution-plan artifacts. If it needs a validation helper with execution-plan naming instead of route-output naming, use `validateExecutionPlanOutput(...)`. If it wants envelope validation with role semantics instead of a generic dispatch name, use `validatePrimaryDispatchPromptEnvelope(...)` for the main agent payload and `validateSpecialistDispatchPromptEnvelope(...)` for specialist payloads. Hosts that assemble roles manually can validate narrower pieces with `validateHostPromptAssembly(...)`, `validateAgentExecutionPlan(...)`, and `validateDispatchPromptEnvelope(...)`.

If a host persists the execution plan itself, it should validate that file before startup with `validateExecutionPlanOutput(...)` in-process or `validate-execution-plan --file <path>` from the CLI.

## Canonical Artifact Flow

```text
Idea -> PRD (.requirements/) -> Feature Spec (.requirements/) -> Test Spec (.requirements/) -> Issues (.requirements/requirements/R0NN-<slug>/issues.md) -> implementation -> review-it -> note-it -> ship-it
```

Stage ownership follows `ai/workflows/README.md` and `skills/developer/README.md`: `product-architect-agent` owns `Idea -> PRD`, and `spec-editor` owns `PRD -> Approved Feature Spec` plus Issue generation (`/prd-to-spec`, `/spec-to-test`, `/to-issues`). Artifact locations are declared by `.specos/manifest.yaml` `artifacts` and `rules/shared/artifact-locations.md`. Under GoalSpec (Agent-Native SDLC), one requirement maps to one Requirement Package (`.requirements/requirements/R0NN-<slug>/{prd,spec,test,issues}.md`); do not mix this co-located package layout with the retired global-dir model (archived read-only under `archive/legacy/`).

## Architecture Requests

Architecture, DDD, domain-boundary, invariant, migration-impact, and cross-surface risk requests should use `architecture-agent` as the main primary role. `ddd-domain-agent` is a specialist for bounded contexts, invariants, and domain risk.

Main agents:

- `architecture-agent`: spec impact, architecture decisions, domain/API/data/UI/test/deployment impact mapping.
- `implementation-agent`: frontend and backend execution coordination; independent testing stays outside this role.
- `testing-agent`: independent verification and evidence orchestration.
- `qa-agent`: QA acceptance, final quality decision, and release/deployment readiness.

Specialist agents grouped by managing main agent:

- Managed by `architecture-agent`:
  - `product-architect-agent`: idea intake and accepted PRD production.
  - `spec-editor`: draft-to-design, roadmap, and feature-spec shaping.
  - `ddd-domain-agent`: bounded contexts, invariants, and domain risk.
  - `openapi-agent`: API contract and error semantics.
  - `db-migration-agent`: schema, migration, compatibility, rollout, and rollback.
- Managed by `implementation-agent`:
  - `frontend-agent`: frontend delivery orchestration for the UI branch of a change package.
  - `backend-agent`: backend delivery orchestration for Architecture, Database, and API branches.
  - `implementation-editor`: focused code and artifact edits from approved specs.
  - `ui-design-agent`: user-facing state, copy, workflow, and responsive behavior.
  - `execution-editor`: local scripts and workflow wiring.
- Managed by `testing-agent`:
  - `test-editor`: coverage model, independent verification split, API scenario assertions, test-plan structure, and Bruno execution assets.
  - `unit-test-agent`: implementation-coupled unit coverage analysis.
  - `playwright-test-agent`: browser behavior, UI state coverage, traces, and flaky risk under the testing track.
  - `e2e-test-agent`: business journey coverage.
  - `performance-test-agent`: latency, throughput, SLO, and baseline risk.
  - `concurrency-test-agent`: idempotency, duplicate submission, locking, and final-state invariants.
  - `specialized-check-agent`: focused specialized checks.
- Managed by `qa-agent`:
  - `reviewer`: final cross-rule risk review.
  - `ci-editor`: release gates and reproducible validation commands.
  - `deployment-agent`: deployment readiness evidence, rollout order, and rollback criteria.

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
