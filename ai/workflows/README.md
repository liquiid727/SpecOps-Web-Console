# Workflows

Use this directory for documented orchestration flows that connect prompts, agent roles, review stages, and execution gates.

## PRD To Ship Main Chain

Raw product ideas enter the chain through PRD intake before formal spec decomposition. The canonical main chain is defined by `skills/developer/README.md`:

`PRD -> prd-to-spec -> Approved Feature Spec -> (to-issues implementation track | spec-to-test -> Approved Test Spec -> to-issues verification track) -> loop-it -> review-it -> note-it -> ship-it`

PRD output is intake-level evidence. Artifact locations come from `.specos/manifest.yaml` `artifacts` (default PRD -> `.prd/`, Feature Spec and Test Spec -> `.features/`, local Issues -> `.issues/`; see `rules/shared/artifact-locations.md`). A PRD must not be promoted into an approved Feature Spec baseline without review.

The main chain is an artifact chain, not an agent chain. Agents are stage implementations of the chain:

- `Idea -> PRD`: `product-architect-agent` runs `/prd` intake and produces an accepted PRD.
- `PRD -> Approved Feature Spec`: `spec-editor` runs `/prd-to-spec` and keeps design, roadmap, and feature specs consistent.
- `Approved Feature Spec -> Issues`: `spec-editor` runs `/to-issues` for the implementation track and `/spec-to-test` plus `/to-issues` for the version-bound verification track.
- `Issues -> Code`: execution runs contextual capability sets such as `frontend-agent` and `backend-agent`, optionally driven by `/loop-it`.
- `Code -> Verified Release`: `qa-agent`, `ci-editor`, and `reviewer` close out through `/review-it`, `/note-it`, and `/ship-it` gates.

Narrow specialists such as UI design, domain, OpenAPI, migration, Bruno, Playwright, performance, and concurrency agents are loaded as capability sets only when an Issue needs their narrower context.

## Test Console Workflow

The `test-console-v1.yaml` workflow documents the minimal independent verification loop:

`Feature Spec -> task-plan -> test-plan -> API/Scenario execution -> normalized result -> report UI -> QA acceptance`

`qa-agent` owns the final acceptance pass after implementation, independent test evidence, reviewer findings, and gate reports exist. It does not create test assets or replace CI; it records the final quality decision, blockers, residual risks, waivers, and promotion recommendation.

## Nested Agent Orchestration

`nested-agent-orchestration.md` documents the entry-agent to main-primary-agent to specialist-agent model used by host runtimes. It keeps `.agents/manifest.yaml` as the only role registry, treats `route-request` as a preview, and assigns `pola` responsibility for task boundaries, report merge, and final actionable synthesis.

`sync-handoff-gateway.md` documents the semantic synchronization gate between specs, rules, agents, workflows, tests, checks, and release evidence. Use it before CI, PR, release, or promotion claims whenever a change can affect neighboring assets.
