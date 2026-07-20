# CLI GUI Session Workbench Sync Handoff

## Sync Handoff
source_spec_or_rule: design/cli-gui-design.md
changed_surface:
  - cli-gui/README.md
  - cli-gui/client/main.tsx
  - cli-gui/client/styles.css
  - cli-gui/client/main.test.tsx
  - cli-gui/vitest.config.ts
  - design/cli-gui-design.md
neighbor_assets_checked:
  - ai/workflows/sync-handoff-gateway.md: design changes require neighbor asset checks.
  - cli-gui/README.md: updated public GUI URL language so 3000 is the only user-facing app URL.
  - cli-gui/client/main.test.tsx: added layout regression coverage for the three-column session workbench and for hiding the internal 3001 backend port.
  - cli-gui/package-lock.json: restored to HEAD to exclude dependency install noise.
updated_assets:
  - design/cli-gui-design.md
  - cli-gui/README.md
  - cli-gui/client/main.test.tsx
waived_assets:
  - specs/roadmap.md: no roadmap scope or milestone changed; this is a UI implementation alignment for the existing cli-gui surface.
  - specs/: no accepted feature spec exists for this branch-local GUI iteration, and the durable design doc now owns the layout decision.
  - rules/: no governance rule changed; existing UI and CI rules were followed.
open_sync_risks:
  - none
owner_agent: pola
next_gate: ci
