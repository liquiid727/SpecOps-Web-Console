# Nested Agent Orchestration

## Meta

- Domain: `specos`
- Feature: `nested-agent-orchestration`
- Source Draft: direct user implementation request in current Codex thread
- Status: proposed

## Goal

Make the SpecOS agent system explicit about how a new project uses `AGENTS.md`, `.agents/manifest.yaml`, route previews, main primary agents, specialist agents, and the `pola` coordinator for nested host-side multi-agent work.

## Non-Goals

- This change does not implement a hosted multi-agent runtime.
- This change does not move role registration into `AGENTS.md`.
- This change does not add frontend implementation specialists for state management, component rendering, interaction, styling, or API integration until those roles are explicitly registered.

## Requirements

1. `AGENTS.md` must name `pola` as the coordinator and keep project-level behavior separate from the agent registry.
2. `.agents/manifest.yaml` remains the only source of truth for main-agent hierarchy, role registration, prompt assembly, scoped skills, context includes, owned surfaces, and expected outputs.
3. `.agents/README.md` must document nested dispatch from entry agent to main primary agent to bounded specialist agents.
4. The registered main primary agents are `architecture-agent`, `implementation-agent`, `deployment-agent`, and `testing-agent`.
5. Architecture, domain-boundary, and cross-surface risk requests should route to `architecture-agent` as the main primary role, with `ddd-domain-agent` as a domain specialist.
6. `playwright-test-agent` belongs to the testing track as a browser/UI verification specialist, not under frontend implementation.
7. `route-request` and `classify-request` must remain routing previews; they should not claim to execute agents.
8. Host-side runtimes may run 2 to 4 specialist agents, but `pola` must merge findings and reject false positives before returning the final recommendation.

## Acceptance

- Route logic recognizes architecture/domain requests and returns `architecture-agent` as primary for architecture orchestration prompts.
- Route logic returns `testing-agent` as primary for testing and QA acceptance prompts.
- Route logic returns `implementation-agent` as primary for implementation prompts and `deployment-agent` as primary for CI/release prompts.
- The workflow is documented under `ai/workflows/`.
- Project and Codex instructions describe the coordinator and registry boundaries.
- Tests cover the architecture routing behavior.
