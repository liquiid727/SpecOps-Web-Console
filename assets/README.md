# Reusable Assets

`assets/` contains reusable source material that Catalog can preview in the
local configuration workbench. These files do not activate runtime behavior for this repository.

```text
assets/
  agents/
    roles/       individually selectable role sources
    teams/       namespaced team packs
  skills/        reusable skill sources
  engineering-packs/
    go/           versioned Go project baseline and CLI contract
    react/        future React project baseline
    python/       future Python project baseline
  templates/
    specs/       reusable PRD, Feature Spec, workflow, and handoff templates
```

Catalog manifests keep source paths separate from installation targets:

- sources point into `assets/`
- role targets normally point into `ai/agents/`
- team targets point into `agent-teams/`
- skill targets point into `skills/developer/`
- template targets point at their canonical target-project directories
- engineering packs combine these assets behind versioned `asset.json` and
  `pack.json` manifests; their Web UI entrypoint is `/engineering-packs`

Active local routing remains under `.agents/`; canonical project rules remain
under `rules/`.

Catalog direction grouping is maintained separately in
`packages/catalog/config/asset-directions.yaml`. It maps asset IDs to product,
business, frontend, backend, operations, and QA without moving or duplicating
the source assets in this directory.
