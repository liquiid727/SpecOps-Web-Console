# Agent Team Catalog Export

## Meta

- Domain: `specos`
- Feature: `agent-team-catalog-export`
- Source Draft: direct user clarification in current Codex thread
- Status: proposed

## Goal

Make reusable agent team packs first-class `spec-web-ui` assets so teams can browse, select, export, and install them into target projects without flattening team files into project root.

## Non-Goals

- This change does not auto-rewrite project root `AGENTS.md`.
- This change does not merge imported team files into `.agents/` automatically.
- This change does not add a hosted runtime that executes team routing rules.

## Behavior

1. Reusable team packs live under `agent-teams/<team-id>/`.
2. `spec-web-ui` catalogs them as asset type `agent_team`.
3. Users can browse them from a dedicated `/agent-teams` route and through existing discover detail pages.
4. Project workspaces can select `agent_team` assets alongside rules, templates, and agent roles.
5. Export snapshots include the selected `agent-teams/...` files for review.
6. Generated `.specos-bundle` payloads install those files into `agent-teams/<team-id>/...` inside the target project.
7. Review and install guidance must state that projects should explicitly reference the installed team pack rather than assuming root-level activation.

## Package Shape

```text
agent-teams/<team-id>/
  README.md
  AGENTS.md
  <team-files...>
```

Each imported team pack stays self-contained in one directory and may include governance specs, registries, catalogs, and supporting notes.

## First Slice

The first implementation slice provides:

- `agent-teams/` repository convention
- `agent_team` catalog asset type
- `/agent-teams` browse route in `spec-web-ui`
- workspace selection and export support
- bundle install support that preserves the namespaced install target
