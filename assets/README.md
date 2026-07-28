# Reusable Assets

`assets/` contains reusable source material that Catalog can preview and Bundler
can export. These files do not activate runtime behavior for this repository.

```text
assets/
  agents/
    roles/       individually selectable role sources
    teams/       namespaced team packs
  skills/        reusable skill sources
  templates/
    specs/       reusable PRD, Feature Spec, workflow, and handoff templates
```

Catalog manifests keep source paths separate from installation targets:

- sources point into `assets/`
- role targets normally point into `ai/agents/`
- team targets point into `agent-teams/`
- skill targets point into `skills/developer/`
- template targets point at their canonical target-project directories

Active local routing remains under `.agents/`; canonical project rules remain
under `rules/`.
