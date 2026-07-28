# Artifact Locations

## Purpose

Keep every spec-chain artifact (PRD, Feature Spec, Test Spec, Issue) in one predictable, configurable location so skills, agents, and humans never invent ad-hoc paths.

## Single Source Of Truth

`.specos/manifest.yaml` `artifacts` is the only authoritative declaration of artifact directories:

```yaml
artifacts:
  draftsDir: .prd          # PRD intake documents
  specsDir: .features      # Feature Specs, Test Specs, roadmap
  issuesDir: .issues       # local Markdown issues
  testsDir: tests          # executable test assets (plans, schedules, scenarios)
  resultsDir: tests/results
```

## Default Layout

```text
.prd/
  prd-<slug>.md
.features/
  roadmap.md
  <SPEC-ID>-<slug>/
    spec.md
    test-spec.md
.issues/
  issue-NNN-<slug>.md
tests/
  plans/  schedules/  results/  scenarios/
```

## Path Resolution Order

Every skill that reads or writes spec-chain artifacts must resolve paths in this order:

1. An explicit location the user gives in the current request.
2. `.specos/manifest.yaml` `artifacts` values.
3. Legacy convention detection: existing populated `spec-draft/`, `specs/`, or `tests/specs/` directories.
4. Built-in defaults: `.prd/`, `.features/`, `.issues/`.

Never invent a new directory outside this order.

## Customization Protocol

When the user asks for a non-default location, the skill must:

1. Write the new value back to the matching `.specos/manifest.yaml` `artifacts` key so the choice is durable.
2. Record one project configuration memory (category `project_environment_configuration`) stating where PRD/Spec/Issue artifacts live in this project.
3. Use only the manifest for all later reads and writes; do not guess per session.

## Legacy Locations

- `spec-draft/` and `specs/` hold pre-standardization content; keep them readable, do not add new artifacts there.
- `tasks/prd-*.md` is a fallback naming from older skill versions; treat it as legacy detection input only.
