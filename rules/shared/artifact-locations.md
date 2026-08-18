# Artifact Locations

## Purpose

Keep every spec-chain artifact (PRD, Spec, Spec-Test, Issue) in one predictable, configurable location so skills, agents, and humans never invent ad-hoc paths.

## Single Source Of Truth

`.specos/manifest.yaml` `artifacts` is the only authoritative declaration of artifact directories. Under GoalSpec (Agent-Native SDLC), PRD/Spec/Test/Issues are co-located in one Requirement Package per directory:

```yaml
artifacts:
  draftsDir: .requirements   # Requirement Package root (prd.md lives inside each package)
  specsDir: .requirements    # spec.md / test.md live inside each package
  issuesDir: .requirements   # issues.md lives inside each package
  testsDir: .requirements
  resultsDir: .requirements
```

## Default Layout

```text
.requirements/
  README.md
  requirements/
    R0NN-<slug>/
      prd.md
      spec.md
      test.md
      issues.md
  templates/
    prd.md  spec.md  test.md  issues.md
  examples/
    R000-example-<slug>/
      prd.md  spec.md  test.md  issues.md
  skills/
    SKILL.md
```

Historical artifacts from the previous global-dir model (`.prd/`, `.features/`, `.issues/`, `implementation/`, `reviews/`, `tests/`) are archived read-only under `archive/legacy/`.

## Path Resolution Order

Every skill that reads or writes spec-chain artifacts must resolve paths in this order:

1. An explicit location the user gives in the current request.
2. `.specos/manifest.yaml` `artifacts` values.
3. Built-in defaults: `.requirements/`.

Never invent a new directory outside this order.

## Customization Protocol

When the user asks for a non-default location, the skill must:

1. Write the new value back to the matching `.specos/manifest.yaml` `artifacts` key so the choice is durable.
2. Record one project configuration memory (category `project_environment_configuration`) stating where PRD/Spec/Issue artifacts live in this project.
3. Use only the manifest for all later reads and writes; do not guess per session.
