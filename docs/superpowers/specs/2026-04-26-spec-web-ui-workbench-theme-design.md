# Spec Web UI Workbench Theme Design

Date: 2026-04-26
Status: Draft design approved for implementation
Source: `readme.md`, `.rules/project.md`, `rules/frontend/react-workbench-delivery.md`, `rules/ui/pencil-prototype-ui.md`, `spec-web-ui/AGENTS.md`

## Purpose

Refactor `spec-web-ui` away from the current glassy, low-contrast surface system into a sharper workbench UI that reads like a system tool. The new direction uses monochrome foundations:

- dark mode anchored in near-black
- light mode anchored in white
- primary visual grouping through window-like section shells
- macOS-style red/yellow/green traffic lights only on first-level sections

The intent is not to redesign product flows or content structure. The intent is to make regions easier to distinguish, improve visual hierarchy, and create a more stable shared shell for `discover`, `projects`, `drafts`, and `exports`.

## Visual Direction

### Base palette

- Dark theme: black/charcoal canvas, dark panel surfaces, light text, neutral borders
- Light theme: white/off-white canvas, white panels, dark text, neutral borders
- Accent color: keep one restrained product accent for links, focused inputs, and selected states
- Semantic colors: red, yellow, and green reserved for status and traffic-light markers

### Surface hierarchy

The UI should have three clear visual layers:

1. `workbench shell`
2. `window section`
3. `panel / row / field`

The current glass blur, colored glows, and closely-valued tinted cards should be removed or heavily reduced. Boundaries should come from contrast, borders, spacing, and titles instead of ambient effects.

### Section grouping

First-level page regions become `window sections`:

- section titlebar
- traffic-light cluster on the left
- title and short descriptor in the header
- content body separated by a border

Second-level cards stay simpler and should not repeat the traffic-light motif.

## Affected Screens

- `/`
- `/discover`
- `/projects`
- `/drafts`
- `/exports`

Shared shell and reusable styling primitives must change before page-level replacements.

## Component Rules

### Shell

- Global header becomes a tool-style titlebar rather than a floating translucent nav
- Main layout keeps the current route structure and spacing envelope

### Window sections

Use on major page regions only:

- hero and summary sections
- filter rails
- main results containers
- large create/review/export blocks

### Panels and rows

Use for:

- metric cards
- list items
- form groups
- asset rows
- export entries

These surfaces should be monochrome by default. Emphasis comes from layout, border strength, and type hierarchy.

### Buttons and fields

- Primary button: dark-on-light or light-on-dark inversion
- Secondary button: bordered neutral button
- Inputs/selects: strong border, explicit focus ring, no glass sheen

## State Coverage

The refactor must preserve or improve empty/loading/success/failure readability:

- empty: explicit copy and action, not blank containers
- loading: simple skeleton or placeholder blocks
- success: restrained inline confirmation
- failure: border/status treatment with readable copy and retry affordance where relevant

## Responsive Behavior

- Desktop keeps multi-panel workbench composition
- Tablet stacks side rails below headers where needed
- Mobile keeps the same visual language but collapses to single-column windows

Traffic-light titlebars remain, but spacing becomes more compact on smaller screens.

## File Focus

Likely implementation touches:

- `spec-web-ui/app/globals.css`
- `spec-web-ui/lib/theme.ts`
- `spec-web-ui/components/layout/app-shell.tsx`
- `spec-web-ui/components/layout/site-nav.tsx`
- `spec-web-ui/components/layout/theme-mode-toggle.tsx`
- `spec-web-ui/components/ui/{badge,button,card}.tsx`
- route files under `spec-web-ui/app/`
- route-specific row/list components where the old glass classes are still encoded

## Validation

- `cd spec-web-ui && npm run test`
- `cd spec-web-ui && npm run build`
- browser review of light and dark themes on the five primary routes

## Assumptions

- This is draft-only UI work traced to rules and current frontend implementation, not to a finalized accepted UI spec package
- Existing data flow, actions, and route behavior stay unchanged
- No new dependencies will be added for styling
