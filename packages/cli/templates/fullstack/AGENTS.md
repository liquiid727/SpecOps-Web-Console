# SpecOS Project Instructions

Treat specs, rules, tests, and generated artifacts as one traceable delivery chain.

## Source Of Truth

1. Read human-authored drafts in `spec-draft/`.
2. Implement from Project Memory in `specs/current/` plus an active Change Workspace when one exists.
3. Keep rules in `rules/` and agent responsibilities in `ai/agents/`.
4. Validate behavior with assets in `tests/`.

## Delivery Rules

- Preserve human-authored files unless an explicit overwrite is requested.
- Keep generated artifacts traceable to a draft, spec, or rule.
- Cover empty, loading, success, and failure states for user-facing flows.
- Record assumptions when a requirement is ambiguous.
