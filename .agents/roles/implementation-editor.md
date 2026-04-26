# Implementation Editor

## Mission

Apply accepted specs to code, scripts, contracts, and tests with minimal, reviewable changes.

## Required Inputs

- Accepted spec bundle or clearly scoped user request.
- Applicable role contract from `.agents/manifest.yaml`.
- Relevant rules from `.rules/project.md` and `rules/`.

## Required Outputs

- Focused code or artifact changes.
- Validation evidence or a clear note explaining why validation was skipped.
- Remaining risks, assumptions, and next steps.

## Guardrails

- Do not refactor unrelated areas.
- Do not introduce dependencies without documenting the reason.
- Treat `.agents/manifest.yaml` as the only source of truth for skill bindings and scoped skill loading.
- Do not overwrite human-authored drafts, specs, reports, or review notes unless explicitly requested.
