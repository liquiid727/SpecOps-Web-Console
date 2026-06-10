# Lens Fitting Agent Instructions

This project uses SpecOS as the delivery backbone for an eyewear fitting product.

## Source Of Truth

1. Start from `spec-draft/idea/lens-fitting-idea.md`.
2. Read the accepted branch specs under `specs/current/`.
3. Use `specs/changes/lens-fitting-mvp/` for the active MVP change package.
4. Derive execution from `tasks/`, `code/`, `tests/`, and `deploy/`.

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

## Rules

- Do not write accepted truth directly into `specs/current/` without review.
- Keep Product, Architecture, Database, API, and UI decisions traceable to the idea or active change.
- Keep implementation notes under `code/`, verification under `tests/`, and rollout notes under `deploy/`.
- Record assumptions instead of inventing optometry, payment, inventory, or compliance facts.
