# Architecture Context

## Status

This file records accepted architecture facts and placement rules for SpecOS. Proposed architecture changes should start in a Change Workspace under `specs/changes/<change-id>/` and update Project Memory only after acceptance.

## Architectural Model

SpecOS uses its own project-memory delivery model:

- `specs/current/`: Project Memory with accepted baseline facts.
- `specs/changes/<change-id>/`: Change Workspace with contract, task plan, active work context, and evidence.
- `specs/archive/<change-id>/`: Evidence Archive after accepted facts update Project Memory.

Agent work is routed through `.agents/manifest.yaml`. The manifest defines role prompts, canonical agent descriptions, scoped skills, context includes, owned surfaces, and expected outputs.

## Agent Context Boundaries

- `.agents/roles/` contains local role execution contracts.
- `ai/agents/` contains canonical agent responsibilities.
- `.agents/manifest.yaml` is the routing and context assembly source of truth.
- Role prompts should describe how an agent works; they should not duplicate project background or accepted system facts.
- Stable project, architecture, and domain context belongs under Project Memory in `specs/current/`.

## Workflow Boundaries

- `spec-draft/` captures early human-authored intent and exploratory requirements.
- `specs/changes/<change-id>/` captures active SpecOS contracts, task plans, assumptions, design notes, generated artifacts, and review evidence for a bounded change.
- `tests/` captures scenario, API, UI, result, and test-plan assets tied to specs.
- `ai/workflows/` documents orchestration flows that connect prompts, agent roles, review stages, gates, and QA acceptance.
- `rules/` and `.rules/` define reusable governance and compact agent-facing rule entrypoints.

## Promotion Rule

Agents should not write directly to `specs/current/` for new work. Promote content into `specs/current/` only after the related change has implementation, independent test, review, QA acceptance, and release gate evidence.

## Open Questions

- How much workflow execution should be encoded as YAML versus implemented by the host runtime?
- Which normalized artifact schemas should be required before a change can be promoted?
