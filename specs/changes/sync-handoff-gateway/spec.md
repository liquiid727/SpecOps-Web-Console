# Sync Handoff Gateway

## Meta

- Domain: `specos`
- Feature: `sync-handoff-gateway`
- Source Draft: direct user request for handoff and CI gateway synchronization governance
- Status: proposed

## Goal

Prevent specs, agent prompts, rules, tests, workflow notes, and CI gates from drifting when one surface changes without its neighboring assets being reviewed.

## Non-Goals

- This change does not implement a hosted multi-agent runtime.
- This change does not replace `.agents/manifest.yaml` as the role registry.
- This change does not require every documentation edit to update every neighboring file.
- This change does not make the first slice a hard script-only gate; semantic sync still requires `pola` and role-owner judgment.

## Requirements

1. Semantic changes to specs, rules, agent roles, canonical agent descriptions, scoped skills, workflows, tests, or CI checks must produce a `Sync Handoff` or explicitly state why sync is not applicable.
2. The handoff must list the changed surface, source spec/rule, neighboring assets checked, assets updated, waived assets, open sync risks, owner agent, and next gate.
3. `pola` owns final synthesis: it filters false positives, decides which sync items are actionable, and prevents raw subagent findings from becoming unreviewed requirements.
4. `team-ci-agent` must treat missing sync evidence for semantic changes as at least a partial CI state and must expose that status in the `CI Record`.
5. The gateway must preserve the existing ownership split:
   - `.agents/manifest.yaml` remains the role and skill registry.
   - `.agents/roles/` remains local execution contract ownership.
   - `ai/agents/` remains canonical role responsibility ownership.
   - `ai/workflows/` remains orchestration contract ownership.
   - `rules/` and `.rules/` remain reusable governance ownership.
   - `specs/changes/` and `specs/current/` remain spec lifecycle ownership.

## Acceptance

- A reusable sync handoff workflow exists under `ai/workflows/`.
- A stable `Sync Handoff` template exists for agents and coworkers.
- `team-ci-agent` and its `CI Record` template include sync handoff status and evidence.
- Orchestration and release gate docs reference the handoff before CI/PR/release claims.
