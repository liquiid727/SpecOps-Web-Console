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

## Do's and Don'ts

Do reuse the library, use semantic tokens, preserve EN/ZH layouts, write keyboard and ARIA tests, and update this document together with tokens and component tests when the visual contract changes.

Do not add raw `button`, `input`, `textarea`, or `select` elements to business components; hard-code visual values; copy component CSS into `qoder.css`; hide focus outlines; encode meaning by color alone; or introduce page-specific interaction behavior that belongs in a primitive.
