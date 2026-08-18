# Engineering Packs

Engineering Packs are composable, versioned project baselines. Each pack can
combine constraints, skills, agents, templates, CLI metadata, and future MCP
adapters for one technology direction.

The pack directory is the catalog-facing source. Individual reusable assets
remain in their canonical asset directories and are referenced by pack
manifests instead of being copied.

```text
assets/engineering-packs/
  go/
  react/
  python/
```

The Web UI reads pack manifests and renders them under `/engineering-packs`.
The CLI and bundler consume the same manifest; the UI is not the source of
truth for pack contents.
