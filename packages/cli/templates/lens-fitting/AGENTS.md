# Lens Fitting Agent Instructions

This project uses SpecOS as the delivery backbone for an eyewear fitting product.

## Source Of Truth

1. Start from `spec-draft/idea/lens-fitting-idea.md`.
2. Read the accepted branch specs under `specs/current/`.
3. Use `specs/changes/lens-fitting-mvp/` for the active MVP change package.
4. Derive execution from `tasks/`, `code/`, `tests/`, and `deploy/`.

## Delivery Chain

```text
Idea -> Spec(Product, Architecture, Database, API, UI) -> Task -> Code -> Test -> Deploy
```

This is the artifact chain. Agents are invoked at the stage boundary:

- Product Architect and Spec Editor work on `Idea -> Spec`.
- Task planning turns the Spec branches into executable work.
- Frontend and Backend agents are invoked when `Task -> Code` starts.
- QA Agent is invoked when `Code -> Test` starts.
- CI / Deploy gates are invoked when `Test -> Deploy` starts.

## Rules

- Do not write accepted truth directly into `specs/current/` without review.
- Keep Product, Architecture, Database, API, and UI decisions traceable to the idea or active change.
- Keep implementation notes under `code/`, verification under `tests/`, and rollout notes under `deploy/`.
- Record assumptions instead of inventing optometry, payment, inventory, or compliance facts.
