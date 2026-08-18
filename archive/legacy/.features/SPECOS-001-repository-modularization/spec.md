# SPECOS-001 Repository Modularization

## Meta

- status: accepted
- design: `design/specos-repository-modularization.md`
- change type: architecture and behavior-preserving refactor

## Goal

Organize SpecOS by runtime configuration, reusable assets, product modules, and
application adapters so Catalog, Bundle, and Installer behavior have explicit
ownership.

## Why This Exists

The current structure causes shotgun surgery. Export behavior is spread across
the Web application, root asset directories, catalog JSON, CLI installation
logic, and tests. Reusable assets are also confused with host runtime
configuration.

## Out Of Scope

- changing Web routes or user-visible export behavior
- changing stable role, team, template, or rule installation paths
- changing CLI validation or installation semantics
- moving an application directory while it contains unrelated active changes

## Deliverables

- `packages/bundler` with a pure bundle-planning interface
- `packages/catalog` with catalog values and pure catalog behavior
- `packages/installer` with bundle installation behavior
- module-owned Catalog and Bundler configuration
- `assets/agents`, `assets/skills`, and `assets/templates` as reusable sources
- feature-owned Web adapters for Catalog and Export behavior
- normalization of legacy Web-internal Skill targets to `skills/developer/`
- updated repository documentation and path tracing

## Domain

- Runtime configuration activates behavior for the current repository.
- Reusable assets are selectable source material.
- Catalog describes and resolves reusable assets.
- Bundler converts a project selection into an immutable bundle plan.
- Installer validates and applies a bundle plan to a target project.

Source paths and installation target paths are separate values.

## Application

The Web application loads assets through a file-system adapter, calls Catalog
queries, builds a Bundle plan, and writes the plan to its workspace.

The CLI continues to validate and install the resulting bundle format.

## Repository

Follow `design/specos-repository-modularization.md`. Packages cannot import from
application directories. `.agents/` and `.rules/` remain at repository root.

## API

No external network API changes.

The Bundler module exposes:

```ts
buildBundlePlan(project, selectedAssets, issueSummary): BundlePlan
```

The Catalog module exposes pure filtering, recommendation, comparison, and
workspace ordering functions.

## Database Impact

None.

## Error Semantics

- invalid or empty bundle manifests retain their existing errors
- missing asset source files continue to fail export generation
- unsafe paths continue to be rejected by the Web file-system adapter

## Test Plan

- retain all existing Web characterization tests
- add package-level tests for install-target resolution and bundle planning
- run root package tests and builds
- run Web tests and production build
- search for stale internal source paths after asset migration

## Definition Of Done

- Catalog and Bundler behavior no longer originates in a generic Web `lib` file
- Bundler install rules have a module-owned configuration location
- reusable team pack source files live under `assets/agents/teams`
- all catalog references resolve
- existing tests and builds pass
