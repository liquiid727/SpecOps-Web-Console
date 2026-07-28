# Lens Fitting Agent Instructions

This project uses SpecOS as the delivery backbone for an eyewear fitting product.

## Source Of Truth

1. Start from `.prd/idea/lens-fitting-idea.md`.
2. Read the accepted branch specs under `.features/current/`.
3. Use `.features/changes/lens-fitting-mvp/` for the active MVP change package.
4. Derive execution from `.issues/`, `code/`, `tests/`, and `deploy/`.

## Delivery Chain

```text
Idea -> Spec Draft -> Canonical Spec -> Task Graph IR -> Code -> Verified Release
```

This is the artifact chain. Agents are invoked as compiler-layer implementations:

- Product Architect compiles `Idea -> Spec Draft`.
- Spec Editor compiles `Spec Draft -> Canonical Spec + Task Graph IR`.
- Frontend and Backend execution contexts consume Task Graph nodes.
- QA Agent verifies Code against Task Graph and Spec refs.
- CI / Deploy gates consume verification evidence for release.

These compiler roles map onto the SpecOS layered agent model: `pola` coordinates, the four main agents (`architecture-agent`, `implementation-agent`, `testing-agent`, `qa-agent`) own their stages, and specialists such as `spec-editor`, `frontend-agent`, `backend-agent`, `ci-editor`, and `deployment-agent` run as on-demand subagents under their managing main agent.

## Rules

- Do not write accepted truth directly into `.features/current/` without review.
- Keep Product, Architecture, Database, API, and UI decisions traceable to the idea or active change.
- Keep implementation notes under `code/`, verification under `tests/`, and rollout notes under `deploy/`.
- Record assumptions instead of inventing optometry, payment, inventory, or compliance facts.
