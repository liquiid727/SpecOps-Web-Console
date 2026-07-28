# SPECOS-001 Repository Modularization Implementation

## Status

Core module and reusable-asset migration complete. Application-root migration
remains intentionally deferred.

## Implemented

- Added `@specos/catalog` for Catalog values, filtering, ranking, and comparison.
- Moved Catalog registry and preset configuration to `packages/catalog/config/`.
- Added `@specos/bundler` with the pure `buildBundlePlan(...)` interface.
- Moved install-target configuration to
  `packages/bundler/src/config/install-targets.ts`.
- Added `@specos/installer` and routed CLI Bundle installation through it.
- Moved reusable role sources to `assets/agents/roles/`.
- Moved reusable team packs to `assets/agents/teams/`.
- Moved reusable Skill sources to `assets/skills/`.
- Moved reusable template sources to `assets/templates/specs/`.
- Separated Catalog source paths from Bundle target paths through
  `contentFiles`.
- Moved Web Catalog and Export adapters under `spec-web-ui/features/`.

## Compatibility

- Web routes are unchanged.
- CLI command names and success/error messages are unchanged.
- Team Packs still install under `agent-teams/`.
- Agent roles still install under `ai/agents/`.
- Catalog Skills now install under the canonical `skills/developer/` target.
- `.agents/` remains the active host-routing entrypoint.

## Deferred

- Moving `spec-web-ui/`, `cli-gui/`, and `test-console/` under `apps/`.

This is deferred because all three are application adapters already, while
`cli-gui/` currently contains extensive unrelated uncommitted changes. Moving
that tree in the same change would make ownership and review history ambiguous.

## Validation

- `@specos/catalog`: package tests and build
- `@specos/bundler`: package tests and build
- `@specos/installer`: package tests and build
- `spec-web-ui`: tests and production build
- CLI Bundle install workflow: focused test

The complete CLI suite currently has one pre-existing failure because the
working tree has deleted `current/`, while the Agent Kit export fixture still
requires that directory.

## Sync Handoff

source_spec_or_rule: `specs/SPECOS-001-repository-modularization/spec.md`

changed_surface:

- `design/`, `specs/`, `implementation/`
- `packages/catalog/`, `packages/bundler/`, `packages/installer/`
- `assets/`
- `spec-web-ui/features/`, Catalog configuration, and Bundle paths
- CLI Bundle installation adapter

neighbor_assets_checked:

- `.agents/`: updated the Product Architect reusable Skill source reference
- Catalog manifests: source paths resolve under `assets/`
- Bundle targets: role, team, template, and Skill targets remain explicit
- Web tracing: includes `assets/` and Catalog configuration
- CLI install flow: focused workflow test passes

updated_assets:

- `readme.md`
- `spec-web-ui/next.config.ts`
- Catalog and Export tests
- package manifests and lockfiles

waived_assets:

- application-root move to `apps/`: deferred to avoid mixing with active
  unrelated `cli-gui` work
- `current/`: not restored because its deletion predates and is outside this
  refactor

open_sync_risks:

- root `rules/` remain canonical and are not duplicated under `assets/`
- the application-root move still requires a dedicated mechanical migration

owner_agent: `architecture-agent`

next_gate: `review`
