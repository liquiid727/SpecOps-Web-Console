# SpecOS Project Instructions

Treat specs, rules, tests, and generated artifacts as one traceable delivery chain.

## Source Of Truth

1. Read human-authored drafts in `spec-draft/`.
2. Read stable platform and system design from `design/`.
3. Read epic, release, and dependency planning from `specs/roadmap.md`.
4. Implement from feature specs under `specs/<SPEC-ID>-<slug>/`.
5. Keep review evidence in `reviews/` and test evidence in `tests/`.
6. Keep rules in `rules/` and agent responsibilities in `ai/agents/`.

## Delivery Rules

- Preserve human-authored files unless an explicit overwrite is requested.
- Keep generated artifacts traceable to a draft, spec, or rule.
- Cover empty, loading, success, and failure states for user-facing flows.
- Record assumptions when a requirement is ambiguous.
