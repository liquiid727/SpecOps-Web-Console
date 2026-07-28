# CLI GUI design implementation map

The normative visual and interaction contract is [`../DESIGN.md`](../DESIGN.md). This document records implementation locations and historical context only; it must not introduce independent token values.

## Implementation map

- Semantic dimensions, typography, motion, elevation, and z-index: `client/styles/tokens.css`
- Canonical color mapping: `client/styles/themes/qoder-light.css`
- Alternate theme mappings: `client/styles/themes/qoder-dark.css`, `classic.css`, and `neo.css`
- Base component styles: `client/styles/components.css`
- Qoder page layout and domain structure: `client/styles/qoder.css`
- Responsive rules: `client/styles/responsive.css`
- Base component API: `client/components/ui/index.ts`
- Reusable patterns: `client/components/patterns/index.ts`
- Automated contract checks: `scripts/check-ui-governance.ts` and `npm run ui:check`

## Migration note

The Qoder workbench replaced the former `SessionNavigator`, `SessionWorkspace`, and `SessionInspector` shells. Their session operations, center transcript/terminal lifecycle, inspector tabs, drawer behavior, menu behavior, and tests now belong to `Sidebar`, `ChatView`, `RightPanel`, shared patterns, and their focused tests. The legacy components were removed after that migration.

## Change rule

Visual-contract changes update `DESIGN.md`, semantic CSS tokens, every theme implementation, component tests, and relevant E2E coverage in one reviewable change. Implementation-only history belongs here or in the relevant spec/review artifact, never in a second token source.
