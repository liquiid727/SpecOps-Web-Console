# SpecOS Repository Modularization

## Status

Accepted for incremental implementation.

## Context

SpecOS currently mixes four different concerns at repository root and inside
`spec-web-ui/`:

- host runtime configuration such as `.agents/` and `.rules/`
- reusable assets such as agent roles, agent teams, skills, rules, and templates
- product modules such as catalog discovery and local configuration
- application adapters such as the web workbench, CLI GUI, and test console

This makes a single behavior change span unrelated directories. Local
configuration should stay separated from catalog values and application adapters.

## Design

The target repository shape is:

```text
apps/
  spec-web-ui/
  test-console/

packages/
  catalog/
  core/

assets/
  agents/
    roles/
    teams/
  skills/
  templates/

.agents/
.rules/
```

The hidden root directories remain host-facing runtime entrypoints:

- `.agents/` is the active local routing manifest and role contract adapter.
- `.rules/` is the compact local rule adapter.

They must not become storage for reusable catalog assets.

### Catalog module

`packages/catalog` owns catalog types, filtering, ranking, comparison, and
catalog registry configuration. Its interface operates on catalog values and
does not know about React or Next.js.

File-system loading remains an application adapter because the Web workbench and
future remote catalogs may use different storage adapters.

### Reusable assets

Reusable content lives under `assets/`. Source location and catalog location
are different concepts:

- a team pack source may live at `assets/agents/teams/<team-id>/`
- its catalog entry can remain `agent-teams/<team-id>/`

Catalog metadata must represent this explicitly through `contentFiles` rather
than requiring source and target paths to be identical.

## Dependency Direction

```text
apps -> packages -> values/config
                  -> assets (through file-system adapters)

.agents and .rules -> canonical project documents
```

Packages must not import from application directories.

## Migration

1. Extract Catalog values and pure catalog behavior.
2. Move catalog registry configuration into `packages/catalog/config/`.
3. Move reusable team packs into `assets/agents/teams/` while preserving catalog
   identities.
4. Move the remaining reusable role, skill, and template sources into `assets/`
   with explicit source-to-target mappings. Canonical project rules remain in
   `rules/` and are referenced directly rather than duplicated.
5. Move application directories under `apps/` only after active application work
   is clean enough for a mechanical path migration.

Each migration step must keep tests green.

## Compatibility

- `.agents/manifest.yaml` remains the active local role source of truth.
- CLI GoalSpec commands and local configuration routes remain unchanged.

## Validation

- `npm test`
- `npm run build`
- `npm run test` and `npm run build` from `spec-web-ui/`
- path and catalog consistency checks for moved assets
