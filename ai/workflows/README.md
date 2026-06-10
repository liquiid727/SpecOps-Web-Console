# Workflows

Use this directory for documented orchestration flows that connect prompts, agent roles, review stages, and execution gates.

## Idea To Spec Intake

Raw product ideas should enter the chain through an intent compiler before formal spec normalization:

`Idea -> Spec Draft -> Canonical Spec -> Task Graph IR -> Code -> Verified Release`

Product Architect output is draft-level evidence for the Spec branches. It may recommend `spec-draft/<stable-id>.md` and `specs/changes/<change-id>/`, but it must not promote accepted truth into `specs/current/`.

The main chain is an artifact chain, not an agent chain. Agents are stage implementations of compiler layers:

- `Idea -> Spec Draft`: `product-architect-agent` acts as the Intent Compiler.
- `Spec Draft -> Canonical Spec + Task Graph IR`: `spec-editor` acts as the Spec Compiler.
- `Task Graph IR -> Code`: execution runs contextual capability sets such as frontend or backend.
- `Code -> Verified Release`: `qa-agent`, `ci-editor`, and `reviewer` act as verification and release compilers.

Narrow specialists such as UI design, domain, OpenAPI, migration, Bruno, Playwright, performance, and concurrency agents are loaded as capability sets only when a Task Graph node needs their narrower context.

## Test Console Workflow

The `test-console-v1.yaml` workflow documents the minimal independent verification loop:

`accepted spec -> test-plan -> API/Scenario execution -> normalized result -> report UI`
