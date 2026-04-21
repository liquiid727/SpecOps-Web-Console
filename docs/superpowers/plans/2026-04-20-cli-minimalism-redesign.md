# CLI Minimalism Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the shell, home, discover, and exports UI around a developer CLI minimalism aesthetic while preserving the current data, action, and export logic.

**Architecture:** Keep the existing Next.js routes, server actions, and catalog/export/project helpers intact. Replace the current dashboard-style visual system with a dark shell layout, breadcrumb navigation, command-style section headers, denser list rows, and review panels that align with the approved reference direction.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS, server actions, Vitest

---

### File Map

**Create**
- `spec-web-ui/lib/shell.ts`
- `spec-web-ui/tests/shell.test.ts`

**Modify**
- `spec-web-ui/app/globals.css`
- `spec-web-ui/tailwind.config.ts`
- `spec-web-ui/components/layout/app-shell.tsx`
- `spec-web-ui/components/layout/site-nav.tsx`
- `spec-web-ui/components/ui/button.tsx`
- `spec-web-ui/components/ui/card.tsx`
- `spec-web-ui/components/ui/badge.tsx`
- `spec-web-ui/app/page.tsx`
- `spec-web-ui/app/discover/page.tsx`
- `spec-web-ui/app/projects/[projectId]/exports/page.tsx`
- `spec-web-ui/components/exports/export-review-client.tsx`

### Task 1: Shell Helpers And Theme Foundation
- [ ] Add failing tests for breadcrumb and shell heading helpers.
- [ ] Implement the helpers in `spec-web-ui/lib/shell.ts`.
- [ ] Replace global colors, fonts, borders, and panel tokens in `globals.css` and `tailwind.config.ts`.
- [ ] Update base UI primitives (`button`, `card`, `badge`) to follow the new shell language.

### Task 2: App Shell And Home
- [ ] Replace the sticky marketing header with a shell-style header and breadcrumb path.
- [ ] Rebuild the home page around a README-style intro, large search entry point, left-side filters/resources, and right-side results/project panels.

### Task 3: Discover Restructure
- [ ] Keep all existing filtering, favorites, presets, compare-set, and add-to-project actions.
- [ ] Rebuild the page into a shell search layout with:
  - top search command area
  - left filter rail and compact saved panels
  - right dense result list
  - shell-style empty state and command headers
- [ ] Keep drag-sort and undo behaviors intact.

### Task 4: Exports Restructure
- [ ] Rebuild the export page summary into a shell review header.
- [ ] Restyle the review client into left navigation/controls, center diff list, right handoff/todo/review panels.
- [ ] Preserve decisions, notes, markdown preview, todo toggles, and asset backlinks.

### Task 5: Verification
- [ ] Run targeted tests for new helpers.
- [ ] Run full `npm test`.
- [ ] Run `npm run build`.
- [ ] Verify the dev server responds on `127.0.0.1:3000`.
