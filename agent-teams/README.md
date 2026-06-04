# Agent Teams

Reusable agent team packs belong here.

Each team pack should stay self-contained under `agent-teams/<team-id>/` so `spec-web-ui` can catalog, preview, export, and install it without flattening files into project root.

## Notes

- Treat each folder as one reusable import unit.
- Keep root-level activation manual: target projects should explicitly reference installed team packs from their own `AGENTS.md` or manifest files.
- Do not auto-copy team files into `.agents/` unless a future change explicitly introduces that behavior.
