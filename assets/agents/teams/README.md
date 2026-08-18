# Agent Teams

Reusable agent team pack sources belong here.

Each source pack stays self-contained under `assets/agents/teams/<team-id>/`.
Catalog metadata maps these sources to the target-project install path
`agent-teams/<team-id>/`, so `spec-web-ui` can catalog, preview, export, and
install a pack without flattening it into project root.

## Notes

- Treat each folder as one reusable import unit.
- Keep root-level activation manual: target projects should explicitly reference installed team packs from their own `AGENTS.md` or manifest files.
- Do not auto-copy team files into `.agents/` unless a future change explicitly introduces that behavior.
