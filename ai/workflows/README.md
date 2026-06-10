# Workflows

Use this directory for documented orchestration flows that connect prompts, agent roles, review stages, and execution gates.

## Idea To Spec Intake

Raw product ideas should enter the chain through `product-architect-agent` before formal spec normalization:

`Idea -> Spec(Product, Architecture, Database, API, UI) -> Task -> Code -> Test -> Deploy`

Product Architect output is draft-level evidence for the Spec branches. It may recommend `spec-draft/<stable-id>.md` and `specs/changes/<change-id>/`, but it must not promote accepted truth into `specs/current/`.

The main chain is an artifact chain, not an agent chain. Agents are invoked by stage:

- `Idea -> Spec`: `product-architect-agent` drafts the blueprint; `spec-editor` normalizes it.
- `Spec -> Task`: planning turns the accepted branches into executable work.
- `Task -> Code`: execution invokes `frontend-agent` and `backend-agent` as needed.
- `Code -> Test`: verification invokes `qa-agent`, which may route to specialist test agents.
- `Test -> Deploy`: release invokes `ci-editor` and deploy/review gates.

Narrow specialists such as UI design, domain, OpenAPI, migration, Bruno, Playwright, performance, and concurrency agents are loaded by those stage agents only when their context is needed.

## Test Console Workflow

The `test-console-v1.yaml` workflow documents the minimal independent verification loop:

`accepted spec -> test-plan -> API/Scenario execution -> normalized result -> report UI`
