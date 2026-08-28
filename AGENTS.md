# SpecOS Agent Instructions

## Project Intent

SpecOS is a Spec-Driven AI IDE. Agents must treat specs, rules, tests, and generated artifacts as one traceable delivery chain instead of isolated files.

## Source Of Truth

Read context in this order before changing behavior:

1. `README.md` or `readme.md` for product intent.
2. `rules/` and `.rules/` for engineering governance.
3. `docs/spec-modes/GoalSpec/` for the Agent-Native SDLC standard.
4. `design/` for stable platform and system design truth.
5. `.requirements/` for active Requirement Workspaces: read root `prd.md` and `index.yaml`, then the selected `specs/S0N-<slug>/spec.md` → `test.md` → `issues/ISSUE-*.md` → `review.md` / `evidence/` / `acceptance.md`.
6. `ai/agents/` and `.agents/` for role-specific responsibilities.

## Required Workflow

- Start from a design doc, feature spec, or a Requirement Package (`prd.md`), or clearly state that the work is draft-only.
- Keep every generated artifact traceable to a spec, draft, or rule.
- Prefer small, reviewable changes over broad rewrites.
- Do not overwrite human-authored drafts, specs, reports, or review notes unless explicitly asked.
- If a requirement is ambiguous, record the assumption or ask before implementation.
- For user-facing flows, cover empty, loading, success, and failure states.
- For backend/API changes, include error semantics, migration impact, and test coverage notes.

## Coordinator And Dispatch

- The default coordinator name is `pola`.
- `pola` classifies the user request, chooses the main primary role from `.agents/manifest.yaml`, and keeps the final answer as one consolidated recommendation instead of a dump of independent agent notes.
- `AGENTS.md` defines project-level behavior and safety rules. It must not become the full agent registry.
- `.agents/manifest.yaml` is the only source of truth for available agent roles, prompt assembly, scoped skills, context includes, ownership, and outputs.
- `route-request` and `classify-request` are deterministic routing previews. They return `primaryAgent`, `supportingAgents`, rules, skills, and required context, but they do not execute agents by themselves.
- Concrete multi-agent execution belongs to the host agent system or workflow runner. When the host supports subagents, `pola` may start 2 to 4 narrowly scoped specialist subagents and then judge which findings are actionable.
- Nested dispatch is allowed only through registered roles. User-routable main roles (`tier: main`) are the four domain leads: `architecture-agent`, `implementation-agent`, `testing-agent`, and `qa-agent`; `pola` is the coordinator above them and is never a dispatch target.
- Every other registered role is `tier: specialist` with a `managed_by` main agent. Specialists (product intake, spec, domain, API, migration, UI design, frontend/backend, focused editors, unit/browser/E2E/performance/concurrency tests, CI, deployment, review) are opened on demand as subagents by their managing main agent, never pre-dispatched as user entrypoints.
- `deployment-agent` is a specialist managed by `qa-agent`; release and deployment readiness decisions belong to `qa-agent`.

## Repository Boundaries

- Artifact locations are declared once in `.specos/manifest.yaml` `artifacts`; see `rules/shared/artifact-locations.md` for the resolution order and customization protocol.
- `.requirements/`: Requirement Workspace root. `requirements/R0NN-<slug>/` holds root `prd.md` / `index.yaml` / `acceptance.md`; each `specs/S0N-<slug>/` holds `spec.md`, `test.md`, one-file-per-Issue, review, acceptance, and evidence.
- `rules/`: canonical reusable rule documents.
- `.rules/`: agent-facing rule index and execution policy.
- `ai/`: prompt, workflow, agent, and reviewer assets for SpecOS orchestration.
- `.agents/`: local agent manifests and role routing for coding assistants.
- `.codex/`: Codex-specific local configuration and operating notes.
- `design/`: stable platform and system design documents. One canonical design doc per platform or system.
- `docs/spec-modes/`: GoalSpec Agent-Native SDLC documentation. There are no selectable project modes or overlays.
- `spec-web-ui/`: Next.js UI for SpecOS.
- Code: Bugrail is a separate repository (`liquiid727/bugrail`, local checkout `~/code/bugrail`). Do not recreate a `bugrail/` submodule or copy its source into this repo.

## Coding Standards

- Keep changes aligned with existing style and file organization.
- Do not add new dependencies without a clear reason and lockfile update.
- Do not commit secrets, provider keys, tokens, generated caches, or local machine paths.
- Use stable names for flows, scenarios, error codes, and generated artifacts.
- Prefer explicit schemas and examples over implicit conventions.

## Validation

- For `spec-web-ui/`, use `npm run test` and `npm run build` from `spec-web-ui/` when relevant.
- For spec/rule changes, verify cross-links and naming consistency manually.
- For generated tests or contracts, keep the command or workflow that produced them documented.

## Communication

- Summaries should name changed files and the spec/rule they support.
- Call out unresolved questions, assumptions, and skipped validation.
- Do not claim completion without evidence from file inspection, tests, or explicit manual verification.
