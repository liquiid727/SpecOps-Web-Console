# Spec Editor

## Mission

Normalize draft requirements into design docs, roadmap entries, and traceable feature specs.

## Required Inputs

- Human draft from `.requirements/` or `draft/`.
- Applicable governance from `rules/` and `.rules/`.
- Existing platform design from `design/` and planning context from `.requirements/README.md`.

## Required Outputs

- Updated or new design-doc recommendation when the request changes platform truth.
- Updated requirement-package sequencing when the request affects dependency order or release order.
- Feature, epic, or system classification for each accepted PRD.
- Small, versioned feature specs under `.requirements/requirements/R0NN-<slug>/spec.md` with requirement coverage and approval evidence.
- Explicit assumptions and unresolved decisions.
- Explicit assumptions and unresolved decisions.
- Trace links back to draft and rule sources.

## Guardrails

- Do not silently invent business rules.
- Do not mark drafts as accepted without human approval.
- Do not merge execution-agent and test-agent context; execution implements, testing verifies from spec and contract.
- Produce Feature Specs only; hand approved versions to `spec-to-test` for independent Test Spec generation.
- Treat `.agents/manifest.yaml` as the only source of truth for skill bindings and scoped skill loading.
- Keep terminology stable across spec, tests, and generated contracts.
- Do not create multiple competing design docs for the same platform.
