# SpecOS Specs

> Legacy location. New Feature Specs, Test Specs, and the roadmap go to the directory declared by `.specos/manifest.yaml` `artifacts.specsDir` (default `.features/`); see `rules/shared/artifact-locations.md`.

`specs/` is the feature-spec layer of SpecOS.

The canonical structure is:

```text
specs/
  roadmap.md
  _rules/
  _template/
  RP-001-event-ingestion/
    spec.md
  RP-002-decision-api/
    spec.md
  ...
```

## Directory Meaning

- `roadmap.md`: the only canonical epic, release, order, and dependency index
- `_rules/`: spec naming, slicing, and field conventions
- `_template/`: canonical spec templates
- `RP-xxx-<slug>/spec.md`: one small feature spec per directory

Epic grouping does not become a nested directory structure. Keep feature specs flat by spec id and use `roadmap.md` plus spec metadata to express epic membership and ordering.

## Convention Mapping

This repository uses the flat `specs/<SPEC-ID>-<slug>/` layout described above (`RP-xxx` in examples; any stable spec id prefix such as `SPECOS-001` follows the same rule). SpecOS engine templates under `packages/cli/templates/` express the same lifecycle with a different layout: `specs/current/` holds the accepted canonical baseline, `specs/changes/<change-id>/` holds in-flight change packages, and `tasks/task-graph.yaml` holds the derived Task Graph IR. Pick one layout per project and do not mix the two inside the same `specs/` tree.

## Lifecycle

```text
spec-draft/
  -> design/<platform>-design.md
  -> specs/roadmap.md
  -> specs/<SPEC-ID>-<slug>/spec.md (approved, versioned)
     ├── implementation/<SPEC-ID>-<slug>/
     └── tests/specs/<SPEC-ID>.test-spec.md
            -> tests/plans/ and tests/schedules/
     -> reviews/<SPEC-ID>-<slug>/
     -> ship
```

## Feature Spec Rules

- One feature spec = one reviewable feature slice
- Prefer narrow slices like `Decision API`, not broad buckets like `Decision Engine`
- Dependencies must be listed by spec id
- Prerequisites must list upstream identities or contracts already provided
- Deliverables and definition of done must be explicit
- Every approved spec must carry a stable `spec_id`, `spec_version`, covered requirement ids, quality profile, and approval evidence
- Independent verification is derived from the approved Feature Spec by `spec-to-test`; a Test Spec for an older source version is stale
