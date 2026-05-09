# Specs

SpecOS keeps formal spec work under `specs/`.

The structure follows an OpenSpec-inspired current/change/archive model, but it remains SpecOS-owned:

- `current/`: accepted and active system facts. Implementation, test, and review agents should treat this as the default source of truth.
- `changes/`: proposed or in-progress business changes. Each change should live in its own folder until accepted.
- `archive/`: completed changes after they have been merged into `current/`.
- `_rules/`: spec governance and normalization rules.
- `_template/`: reusable spec bundle templates.

Recommended lifecycle:

```text
spec-draft/
  -> specs/changes/<change-id>/
  -> tests / implementation / review
  -> specs/current/
  -> specs/archive/<change-id>/
```

Spec bundles should keep both human-readable Markdown and machine-readable YAML when applicable. Other agents should prefer YAML from `specs/current/` unless they are explicitly working on a proposed change under `specs/changes/`.
