# Spec Web UI Agent Instructions

## Scope

This file applies to all files under `spec-web-ui/`.

## UI Design Role

- Use `.agents/roles/ui-design-agent.md` as the shared UI role prompt, and read `.agents/modes/<mode>/roles/ui-design-agent.md` when a project mode introduces UI-specific delivery differences.
- Use `.codex/skills/specos-ui-design/SKILL.md` when changing screens, layouts, components, copy hierarchy, or handoff notes in this frontend project.
- Use `.codex/skills/specos-ui-design/SKILL.md` for SpecOS configuration pages, policy editors, switchboards, tables, and dangerous operations.
- Keep UI work traceable to `rules/frontend/react-workbench-delivery.md`, `rules/ui/design-governance.md`, `rules/ui/pencil-prototype-ui.md`, a platform design doc under `design/`, or a Requirement Package under `.requirements/requirements/R0NN-<slug>/` (prd.md / spec.md / test.md / issues.md).

## Frontend Delivery Rules

- Cover empty, loading, success, and failure states for user-facing flows.
- For configuration pages, separate read-only status, editable PRD, validation result, and applied state.
- Prefer reusable page sections and stable component vocabulary over one-off visual patterns.
- Keep flow names, labels, and state names aligned with the related PRD or Feature Spec.
- Record assumptions when UI source material is incomplete or draft-only.

## Validation

- Run `npm run test` from `spec-web-ui/` when UI behavior or data rendering changes.
- Run `npm run build` from `spec-web-ui/` when routes, layouts, or production-rendered components change.
- For documentation-only UI role/skill changes, manually check links and naming consistency.
