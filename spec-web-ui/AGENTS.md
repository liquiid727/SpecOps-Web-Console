# Spec Web UI Agent Instructions

## Scope

This file applies to all files under `spec-web-ui/`.

## UI Design Role

- Use `.agents/roles/ui-design-agent.md` for user-facing UI structure, visual hierarchy, interaction states, responsive behavior, and design-system decisions.
- Use `.codex/skills/specos-ui-design/SKILL.md` when changing screens, layouts, components, copy hierarchy, or handoff notes in this frontend project.
- Use `.skills/tool-config-ui/SKILL.md` for tool-style configuration pages such as agent settings, skill configuration, rules, policy editors, switchboards, and dangerous operations.
- Keep UI work traceable to `rules/frontend/react-workbench-delivery.md`, `rules/ui/pencil-prototype-ui.md`, an accepted `spec/` bundle, or a draft under `spec-draft/`.

## Frontend Delivery Rules

- Cover empty, loading, success, and failure states for user-facing flows.
- For configuration pages, separate read-only status, editable draft, validation result, and applied state.
- Prefer reusable page sections and stable component vocabulary over one-off visual patterns.
- Keep flow names, labels, and state names aligned with the related spec or draft.
- Record assumptions when UI source material is incomplete or draft-only.

## Validation

- Run `npm run test` from `spec-web-ui/` when UI behavior or data rendering changes.
- Run `npm run build` from `spec-web-ui/` when routes, layouts, or production-rendered components change.
- For documentation-only UI role/skill changes, manually check links and naming consistency.
