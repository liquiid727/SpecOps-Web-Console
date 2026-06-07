# Nested Agent Orchestration

## Meta

- Domain: `specos`
- Feature: `nested-agent-orchestration`
- Source Draft: direct user implementation request in current Codex thread
- Status: proposed

## Goal

Make the SpecOS agent system explicit about how a new project uses `AGENTS.md`, `.agents/manifest.yaml`, route previews, primary agents, supporting agents, and the `pola` coordinator for nested host-side multi-agent work.

## Non-Goals

- This change does not implement a hosted multi-agent runtime.
- This change does not add an unregistered `architecture-agent`.
- This change does not move role registration into `AGENTS.md`.

## Requirements

1. `AGENTS.md` must name `pola` as the coordinator and keep project-level behavior separate from the agent registry.
2. `.agents/manifest.yaml` remains the only source of truth for role registration, prompt assembly, scoped skills, context includes, owned surfaces, and expected outputs.
3. `.agents/README.md` must document nested dispatch from entry agent to primary agent to bounded supporting agents.
4. Architecture, domain-boundary, and cross-surface risk requests should route to `ddd-domain-agent` as the primary role.
5. `route-request` and `classify-request` must remain routing previews; they should not claim to execute agents.
6. Host-side runtimes may run 2 to 4 supporting agents, but `pola` must merge findings and reject false positives before returning the final recommendation.

## Acceptance

- Route logic recognizes architecture/domain requests and returns `ddd-domain-agent` as primary for architecture orchestration prompts.
- The workflow is documented under `ai/workflows/`.
- Project and Codex instructions describe the coordinator and registry boundaries.
- Tests cover the architecture routing behavior.
