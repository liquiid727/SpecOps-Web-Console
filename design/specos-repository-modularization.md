# SpecOS Repository Modularization

## Status

Accepted for incremental implementation.

## Context

SpecOS currently mixes four different concerns at repository root and inside
`spec-web-ui/`:

- host runtime configuration such as `.agents/` and `.rules/`
- reusable assets such as agent roles, agent teams, skills, rules, and templates
- product modules such as catalog discovery, bundle generation, and installation
- application adapters such as the web workbench, CLI GUI, and test console

This makes a single behavior change span unrelated directories. Bundle generation
is the clearest example: its configuration, domain types, file-system work,
catalog inputs, UI actions, and tests are colocated in `spec-web-ui/lib/export.ts`
or scattered across the repository.

## Design

The target repository shape is:

```text
apps/
  spec-web-ui/
  test-console/

packages/
  catalog/
  bundler/
  installer/
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

### Bundler module

`packages/bundler` owns bundle planning:

- source-to-target file planning
- project and bundle manifests
- install-target resolution
- generated workflow payloads

Its primary interface is:

```ts
buildBundlePlan(input): BundlePlan
```

Planning is pure. Writing files, retaining previous snapshots, and loading review
state remain outside this interface.

Install-target ordering and path rules live under
`packages/bundler/src/config/`, not inside a Web application file.

### Installer module

`packages/installer` will own validation, checksum verification, and installation.
The existing CLI implementation remains the compatibility adapter until that
module is extracted.

### Reusable assets

Reusable content lives under `assets/`. Source location and installation target
are different concepts:

- a team pack source may live at `assets/agents/teams/<team-id>/`
- its bundle target remains `agent-teams/<team-id>/`

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

1. Extract the pure Bundler interface and install configuration.
2. Extract Catalog values and pure catalog behavior.
3. Move catalog registry configuration into `packages/catalog/config/`.
4. Move reusable team packs into `assets/agents/teams/` while preserving bundle
   targets.
5. Move the remaining reusable role, skill, and template sources into `assets/`
   with explicit source-to-target mappings. Canonical project rules remain in
   `rules/` and are referenced directly rather than duplicated.
6. Extract Installer behavior from the CLI.
7. Move application directories under `apps/` only after active application work
   is clean enough for a mechanical path migration.

Each migration step must keep tests green and may retain a thin compatibility
adapter at the previous import seam.

## Compatibility

- `.agents/manifest.yaml` remains the active local role source of truth.
- exported bundle target paths do not change during structural migration.
- CLI commands and Web routes remain unchanged.
- existing `.specos-bundle` manifests remain installable.

## Validation

- `npm test`
- `npm run build`
- `npm run test` and `npm run build` from `spec-web-ui/`
- path and catalog consistency checks for moved assets
