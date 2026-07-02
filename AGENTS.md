# SpecOS Agent Instructions

## Project Intent

SpecOS is a Spec-Driven AI IDE. Agents must treat specs, rules, tests, and generated artifacts as one traceable delivery chain instead of isolated files.

## Source Of Truth

Read context in this order before changing behavior:

1. `README.md` or `readme.md` for product intent.
2. `rules/` and `.rules/` for engineering governance.
3. `docs/spec-modes/` and `current/` for active project mode and delivery state.
4. `spec-draft/` for human-authored draft intent.
5. `design/` for stable platform and system design truth.
6. `specs/roadmap.md` and feature specs under `specs/`.
7. `implementation/`, `reviews/`, and `tests/` for delivery evidence.
8. `ai/agents/` and `.agents/` for role-specific responsibilities.

## Required Workflow

- Start from a design doc, roadmap entry, or feature spec, or clearly state that the work is draft-only.
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
- Nested dispatch is allowed only through registered roles. Main primary roles are `architecture-agent`, `implementation-agent`, `deployment-agent`, and `testing-agent`; they may propose bounded work for registered specialist roles such as spec, domain, API, migration, UI design, unit, browser, E2E, performance, concurrency, CI, review, or QA agents.

## Repository Boundaries

- `rules/`: canonical reusable rule documents.
- `.rules/`: agent-facing rule index and execution policy.
- `ai/`: prompt, workflow, agent, and reviewer assets for SpecOS orchestration.
- `.agents/`: local agent manifests and role routing for coding assistants.
- `.codex/`: Codex-specific local configuration and operating notes.
- `spec-draft/`: intake drafts that may still be incomplete or exploratory.
- `current/`: active delivery workspace and handoff state for the current mode.
- `design/`: stable platform and system design documents. One canonical design doc per platform or system.
- `specs/`: roadmap, feature specs, spec rules, and spec templates.
- `implementation/`: implementation handoff and status by spec id.
- `reviews/`: structured review evidence by spec id.
- `tests/`: spec-driven verification assets and scenario test templates.
- `docs/spec-modes/`: documented project operating modes such as `LiteSpec` and `EnterpriseSpec`.
- `spec-web-ui/`: Next.js UI for SpecOS.

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
