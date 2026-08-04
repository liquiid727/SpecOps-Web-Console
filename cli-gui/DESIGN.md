---
version: "alpha"
name: "SpecOS CLI GUI — Qoder"
description: "Normative visual contract for the standalone Product AI OS CLI workspace launcher."
colors:
  primary: "#111111"
  on-primary: "#FFFFFF"
  secondary: "#6B6B6B"
  tertiary: "#9CA3AF"
  neutral: "#F6F6F6"
  surface: "#FFFFFF"
  surface-hover: "#F2F2F2"
  surface-selected: "#EBEBEB"
  border: "#E6E6E6"
  border-strong: "#D1D5DB"
  focus: "#2563EB"
  success: "#22C55E"
  warning: "#F59E0B"
  danger: "#EF4444"
typography:
  body-md:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
  heading-lg:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.2
  heading-sm:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.4
  mono:
    fontFamily: "SFMono-Regular, SF Mono, ui-monospace, Menlo, Consolas, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  xs: "5px"
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
  3xl: "32px"
components:
  app-canvas:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 12px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 12px"
  button-hover:
    backgroundColor: "{colors.surface-hover}"
    textColor: "{colors.primary}"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 12px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.lg}"
    padding: "16px"
  menu:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: "4px"
  selected-row:
    backgroundColor: "{colors.surface-selected}"
    textColor: "{colors.primary}"
  muted-copy:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.secondary}"
    typography: "{typography.body-sm}"
  focus-ring:
    backgroundColor: "{colors.focus}"
    textColor: "{colors.on-primary}"
  status-success:
    backgroundColor: "{colors.success}"
    textColor: "{colors.primary}"
  status-warning:
    backgroundColor: "{colors.warning}"
    textColor: "{colors.primary}"
  status-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.primary}"
  divider:
    backgroundColor: "{colors.border}"
    textColor: "{colors.primary}"
  divider-strong:
    backgroundColor: "{colors.border-strong}"
    textColor: "{colors.primary}"
  status-stopped:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.primary}"
---

## Overview

The CLI GUI is a quiet, compact AI workbench. `qoder-light` is the normative baseline: neutral surfaces, restrained hierarchy, one dark action color, and status color used only when state has meaning. This document is the visual source of truth; CSS themes and components implement it.

Every frontend task must first read this file and the barrel exports in `client/components/ui/index.ts` and `client/components/patterns/index.ts`. Search for an existing component before creating one. Extend a semantic variant when behavior is shared; do not clone markup or CSS.

Classic, Neo, and Qoder Dark are alternate presentations. They may change values but must implement the same semantic color, typography, spacing, radius, elevation, focus, motion, and component-state contract.

## Colors

Primary text and actions use `primary`; `surface` is the panel canvas and `neutral` is the application canvas. Secondary and tertiary are for metadata only. Focus, success, warning, and danger must never be the sole carrier of meaning—pair them with text, icon, or status semantics.

Themes map every semantic variable declared by `qoder-light.css`. Do not place hex, rgb, hsl, oklch, or named colors in TSX or page CSS. New colors require a semantic token here and corresponding values in every theme.

## Typography

Use the system sans stack for fast native rendering and reliable EN/ZH coverage. Body copy is 13px; compact controls and metadata are 12px or 11px. The 28px display size is reserved for Quest Home. Use the mono stack for commands, paths, timestamps, terminal output, and code only.

All visible copy comes from i18n call sites. English and Chinese must preserve hierarchy without clipping; controls must accommodate the longer locale rather than abbreviating essential meaning.

## Layout

The desktop shell uses a 44px title bar, 286px full-height left sidebar, flexible center column, and 360px inspector. Standard spacing follows the 4px scale in front matter. Dense lists use 4–8px gaps; content groups use 12–20px; major page breathing room uses 24–32px.

Responsive contracts:

- At 1280px and above, keep sidebar, center, and inspector visible when enabled.
- Below 900px, sidebar and inspector become focus-trapped drawers with dismiss backdrops.
- Below 640px, stack headers/actions, preserve a minimum 44px touch target where space permits, and avoid horizontal page scrolling.
- The settings drawer is left-anchored on desktop to match its sidebar entry; confirmation and session dialogs remain centered. Below 640px, the drawer becomes full viewport.

Every user-facing data flow defines empty, loading, success, and failure states. Loading must not erase stable context; failures expose a translated recovery action when retry is possible.

## Elevation & Depth

Depth is subtle: borders establish most hierarchy. Use `--shadow-sm` for cards, `--shadow-pop` for menus and floating controls, and `--shadow-drawer` for modal drawers. Do not add one-off shadows. Overlays must keep content legible and restore focus to their trigger on close.

## Shapes

Controls use 6–8px radii, cards use 10px, composer and larger containers may use 12px, and pills/avatars use the full radius. Shape communicates component family, not decoration; do not mix radii within one control group.

## Components

Base components live in `client/components/ui/`: Button, IconButton, TextField, TextArea, Tabs, Menu, Badge, Card, EmptyState, Icon, Select, Overlay, and Feedback. Patterns live in `client/components/patterns/`: ViewHeader, SectionHeader, AsyncState, ResourceRow, SettingsSection, and DialogActions.

Business components must use these exports instead of native interactive elements. Base components accept native properties, `ref`, `className`, and semantic variants, but must not import session, workspace, API, or other domain types. Visible labels are supplied by translated callers.

Chat-mode transcript cards render the structured component payload when available, covering user/assistant messages, thinking, code blocks, tool and command activity, file changes, approvals, progress, usage, turn status, diagnostics, and terminal-output fallbacks. Terminal mode remains the raw replay contract.

Button, IconButton, TextField, TextArea, Badge, Card, Tabs, and Menu expose an explicit transparent compatibility mode. In that mode they preserve caller DOM classes without injecting layout, size, padding, or display rules; use it while migrating established Qoder surfaces whose page CSS already owns the visual contract.

Tabs implement roving focus with Arrow keys, Home, and End. Menus implement roving focus, Escape, outside dismissal, and trigger focus restoration. Dialogs trap focus, close on Escape when safe, expose ARIA naming, and restore focus. Disabled and loading states remain distinguishable and suppress duplicate actions.

Maintain WCAG 2.2 AA contrast for normal text and visible keyboard focus. Interactive controls require accessible names. Honor `prefers-reduced-motion`: decorative transitions must be removed while state changes remain understandable.

## CLI GUI Component Governance

The CLI GUI uses three layers. Each layer has a narrower responsibility and a
one-way dependency direction:

```text
Primitive -> Pattern -> Domain Component -> ClientRuntime port
```

- **Primitive**: accessible DOM behavior, semantic tokens, focus, sizing, and
  native-compatible props. Primitives do not know Session, Workspace, Turn,
  Attempt, API, WebSocket, Tauri, or vendor protocol types.
- **Pattern**: reusable composition for async state, section headers, resource
  rows, dialogs, settings sections, and action groups. Patterns own layout and
  state presentation but not domain decisions.
- **Domain Component**: Transcript, Message, Tool, Approval, Diff, Attempt,
  Diagnostic, Session, Workspace, and Quest flows. Domain components consume
  runtime ports and translated view models; they never implement transport logic.

### Primitive Responsibilities

| Primitive | Responsibility | Required behavior |
|---|---|---|
| Button/IconButton | Explicit commands and icon actions | loading/disabled/pending, accessible name, tooltip for unfamiliar icon |
| TextField/TextArea | Text entry and validation | label/description/error association, IME-safe input, focus ring |
| Select/Menu | Finite option and command lists | keyboard roving focus, Escape, outside dismissal, trigger restoration |
| Tabs | Peer view navigation | `role=tablist/tab/tabpanel`, Arrow/Home/End, active-panel association |
| Overlay | Dialog/drawer/backdrop boundary | focus trap, Escape policy, labelled title, focus return |
| Feedback/AsyncState | Status and recovery presentation | empty/loading/success/failure/offline/reconnecting/readonly/pending |
| Card/Badge | Framed repeated item or compact status | semantic status text/icon, bounded text, no business action policy |
| Icon | Consistent visual symbol | use the existing icon library, no meaning by color alone |

Business components must not add a local native `button`, `input`, `textarea`,
`select`, Dialog, Menu, Tabs, Card, or EmptyState implementation when a primitive
or pattern exists.

### Domain Component Boundaries

| Domain component | Reads | Owns | Does not own |
|---|---|---|---|
| Transcript/Message | projected TranscriptEvent | message grouping, markdown-safe display, scroll policy | vendor parsing, persistence, route choice |
| Tool/Command/File | normalized tool/file projection | collapsed details, copy, bounded output | process execution, workspace writes |
| Approval | approval view model | pending/decided/expired/replay affordance | authorization policy or duplicate settlement |
| Diff/Diagnostic | read-only inspection/diagnostic projection | truncation, binary, error, and recovery copy | Git mutation, arbitrary paths, raw errors |
| Attempt/Session | persisted Attempt/Session projection | lifecycle labels, retry/refresh affordance | fallback decision, execution state mutation policy |
| Quest/Settings | readiness/provider/preferences projections | form state, translated feedback, focus | secret values, backend capability invention |

### Required UI States

Every primary domain component declares and tests the following state set:

| State | Presentation rule |
|---|---|
| Empty | Explain the next valid action without losing surrounding navigation |
| Loading | Preserve stable content; expose progress or skeleton and suppress duplicates |
| Success | Show the server-backed fact and its source/status when useful |
| Failure | Show translated error, stable recovery action, and no fake success state |
| Offline | Make unavailable mutations explicit; keep readable cached facts |
| Reconnecting | Show retry/reconnect progress without duplicating transcript items |
| Readonly | Disable mutations and explain why; do not hide the data surface |
| Pending | Freeze duplicate commands, retain focus, and expose completion/failure transition |

Approval additionally supports `pending`, `submitting`, `decided`, `expired`, and
`replay`. Attempt additionally supports `primary`, `fallback`, `confirmation`,
`exhausted`, `cancelled`, and `completed`. Diff additionally supports `binary`,
`truncated`, `non-git`, and `scope-error`.

### Copy, Focus, And Responsive Rules

- All visible copy is in `client/i18n.tsx`; EN and ZH keys are added together.
  Dynamic text uses named placeholders and must wrap long paths, model names,
  error codes, and translated labels without clipping or overlap.
- Focus order follows the visual workflow. Dialogs and drawers restore focus to
  their trigger; pending actions keep focus stable; destructive actions require
  an explicit confirmation path.
- Use semantic labels, `aria-describedby` for field errors, `aria-live` for
  non-destructive status updates, and visible text/icon in addition to color.
- `prefers-reduced-motion: reduce` removes decorative transitions while retaining
  state visibility. No interaction may depend on animation completion.
- At 1280px, keep the three-column workbench when enabled. At 900px, use focus-trapped
  drawers; at 640px, stack actions and preserve a 44px touch target where possible.
  Narrow screens use drill-in navigation and must not horizontally scroll.

### Tokens And Layers

Use semantic tokens from this file and the theme files. The baseline values are:

| Token group | Contract |
|---|---|
| Spacing | 4px base scale: 4/8/12/16/20/24/32px |
| Control size | 36px default height; 44px minimum touch target where space permits |
| Radius | controls 6-8px; cards/panels use the existing 8-10px system; pills full |
| Focus | `--color-focus` with a visible 2px ring and sufficient contrast |
| Status | success `#22C55E`, warning `#F59E0B`, danger `#EF4444`, stopped/muted `#9CA3AF`; always pair with text/icon |
| Layer | base 0, sticky shell 10, drawer 30, dialog 40, tooltip 50, toast 60 |
| Text | body 13px, compact metadata 12px, mono for paths/commands/timestamps only |

Do not create page-local z-index values, one-off colors, negative letter spacing,
or viewport-scaled font sizes. Content containers must define a stable min/max
dimension so pending labels, icons, and translated text do not shift the layout.

### Component Evidence Contract

| Contract | Evidence |
|---|---|
| Primitive behavior | Vitest/DOM contract: role, accessible name, keyboard path, disabled/pending behavior |
| Pattern state | Component test: empty/loading/success/failure/offline/reconnecting/readonly/pending |
| Domain behavior | Runtime fixture or port contract; no mocked transport hidden inside component |
| Browser workflow | Chrome trace and screenshot for P0/P1 flow, second interaction, and responsive viewport |
| Visual stability | Screenshot evidence tied to `requirementId`; no screenshot-only pass |
| Performance | normalized performance result for 50k transcript/delta/diff targets when declared |

Business components must call ClientRuntime ports or a domain hook. Direct imports
of HTTP clients, WebSocket constructors, `window.__TAURI__`/Tauri invoke, raw
browser controls, `child_process`, and vendor protocol types are prohibited.

## Do's and Don'ts

Do reuse the library, use semantic tokens, preserve EN/ZH layouts, write keyboard and ARIA tests, and update this document together with tokens and component tests when the visual contract changes.

Do not add raw `button`, `input`, `textarea`, or `select` elements to business components; hard-code visual values; copy component CSS into `qoder.css`; hide focus outlines; encode meaning by color alone; or introduce page-specific interaction behavior that belongs in a primitive.
