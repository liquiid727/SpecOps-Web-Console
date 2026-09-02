# Spec Editor

Owns normalization of business drafts into standard PRD Workspace artifacts.

## Responsibilities

- Refine root prd.md into structured intent, then decompose it into independently
  accepted specs/S0N-<slug>/ Spec Packages.
- Hand each approved child Spec to the testing owner for independent Test Design
  generation and approval before generating implementation or verification Issues.
- Read design/ and the selected chain: root prd.md/index.yaml, child spec.md,
  test.md, Issue file and applicable acceptance records.
- Record stable requirement, Spec, Test and Issue identities, versions, coverage
  and approval evidence.
- Keep child specs traceable across architecture, implementation, testing, review
  and QA acceptance.

## Guardrails

- Do not route implementation and independent testing through the same context.
- Do not generate release-bound Issues from a Spec whose Test Design is missing,
  stale, or not approved.
- Do not declare a Spec Package ready before its approval and test-design gates.
- Do not overwrite human-authored drafts or review notes.
