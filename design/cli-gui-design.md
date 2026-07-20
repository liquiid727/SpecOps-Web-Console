# CLI GUI Design

## Scope

This design owns the local CLI GUI in `cli-gui/`. The GUI is a desktop-style session workbench for launching, naming, resuming, stopping, and deleting local Codex, Claude, or custom CLI sessions.

## Layout Model

The primary UI follows the same hierarchy as session-first coding apps such as Claude Code and Codex App:

- Left rail: session management, session selection, workspace grouping, and compact CLI profile visibility.
- Center stage: the selected session name, runtime status, primary session actions, and the terminal surface.
- Right rail: session context, launch controls, workspace registration, and CLI profile setup.

Workspaces and profiles support session creation, but they must not dominate the main surface. The active user task is always represented as a named session.

## Design Principles

- Session-first: the active task, rather than the workspace or CLI profile, is the primary object in the main surface.
- Local-first: workspace data, session history, terminal output, and Git inspection remain local to the registered workspace boundary.
- Terminal-native: the transcript improves readability, but the raw terminal remains the fidelity source and compatibility fallback.
- Calm and dense: use restrained contrast, compact spacing, and clear state indicators for repeated operational use.
- Reuse before invention: extend the local component vocabulary and semantic CSS tokens before adding page-specific markup or styles.

## Visual Language

The current visual language is dark, neutral, compact, and terminal-native. The semantic token values below are the current baseline implemented in `cli-gui/client/styles.css`. New UI should consume these tokens instead of introducing equivalent raw values.

### Color Tokens

| Token | Value | Purpose |
| --- | --- | --- |
| `--canvas` | `#0d0d0e` | Application background and code surfaces |
| `--rail` | `#111112` | Utility rail |
| `--navigator` | `#151516` | Session and inspector rails |
| `--surface` | `#19191b` | Cards, controls, and terminal chrome |
| `--surface-raised` | `#1f1f22` | Raised surfaces |
| `--surface-hover` | `#242428` | Hover state |
| `--surface-selected` | `#29292e` | Selected session and active tab |
| `--terminal` | `#101011` | Raw terminal surface |
| `--overlay` | `#1b1b1e` | Dialogs, drawers, and context menus |
| `--border` | `#2a2a2e` | Default dividers and borders |
| `--border-strong` | `#3a3a40` | Emphasized control borders |
| `--text` | `#f0efec` | Primary text |
| `--text-secondary` | `#bbb9b3` | Secondary text |
| `--muted` | `#7e7c77` | Supporting text and inactive controls |
| `--faint` | `#5c5a56` | Low-priority metadata |
| `--accent` | `#d97757` | Primary action and brand accent |
| `--accent-hover` | `#e68766` | Primary action hover |
| `--focus` | `#e99a7f` | Keyboard focus ring |
| `--running` | `#6cc49a` | Running/connected state |
| `--starting` | `#d9b56f` | Starting/readonly state |
| `--danger` | `#e06972` | Error and destructive state |
| `--danger-muted` | `#3c2226` | Error and destructive surface |

### Type, Shape, and Density

- Use `Inter`, then the platform UI sans-serif stack, for application copy.
- Use `SFMono-Regular`, `Consolas`, or an equivalent monospace stack for paths, commands, diffs, and terminal content.
- Keep the hierarchy compact: primary workspace headings are approximately 17px, panel headings 15px, body copy 11-12px, and metadata/labels 9-10px.
- Use `--radius: 10px` for primary surfaces and `--radius-small: 7px` for controls. Smaller 5-8px radii are acceptable for compact menu and code elements.
- Use borders and surface changes to establish hierarchy. Shadows are reserved for floating menus, drawers, dialogs, and the terminal surface.
- Use status dots, badges, and icons to make state scannable. Do not rely on color alone for destructive, readonly, or runtime state.

## Responsive Layout

The desktop baseline uses these dimensions from `cli-gui/client/styles.css`:

- Utility rail: `58px`.
- Session navigator: `264px`.
- Session inspector: `324px`.
- Center stage: remaining flexible width.

Responsive behavior is part of the design contract:

- At `1279px` and below, the inspector becomes a right-side drawer with a backdrop.
- At `899px` and below, the session navigator becomes a left-side drawer with a backdrop.
- At `639px` and below, the utility rail reduces to `50px`, dialog/drawer surfaces become full-screen, and secondary status labels collapse to preserve the active task surface.
- `prefers-reduced-motion` disables non-essential transitions and animations.

## Component Vocabulary

Reusable primitives are kept local to `cli-gui/client/components/` until a stable shared package is justified.

| Component | Responsibility |
| --- | --- |
| `ui/Icon` | Central SVG icon names and consistent icon sizing/stroke treatment |
| `ui/Overlay` | Dialog/drawer shell, backdrop dismissal, Escape handling, and focus containment |
| `ActionDialog` | Confirmable rename, resume, delete, and other explicit actions |
| `StatusBadge` | Consistent runtime and organization status presentation |
| `LanguageToggle` | Persistent English/Chinese language switch |
| `SessionNavigator` | Workspace grouping, session selection, ordering, and lifecycle actions |
| `SessionWorkspace` | Session toolbar, transcript/terminal views, and prompt composer surface |
| `SessionInspector` | Workspace context, files, preview, diff, and Git inspection |
| `WorkspaceProfileManager` | Local workspace and CLI profile configuration |

New components should reuse these primitives, use semantic class names, and add a focused component test when they introduce a new state or interaction pattern.

## Interaction and Accessibility

- Every icon-only control must have an accessible name and a tooltip/title when its meaning is not obvious.
- Focus-visible controls use the `--focus` ring and must remain visible on dark surfaces.
- Dialogs and drawers trap focus, close on Escape, restore focus to the triggering control, and support backdrop dismissal where safe.
- Destructive actions require explicit confirmation; readonly mode disables local write and CLI-launch actions rather than hiding the reason.
- UI copy is English-first but must have matching `en` and `zh` entries in `cli-gui/client/i18n.tsx`.
- Keyboard shortcuts currently include `Cmd/Ctrl+B` for the navigator and `Cmd/Ctrl+Shift+I` for the inspector. Shortcuts must not interfere with text inputs, dialogs, or the terminal.

## Source of Truth and Drift Prevention

- This document is the durable design source for CLI GUI layout, visual language, component vocabulary, responsive behavior, and interaction rules.
- `cli-gui/client/styles.css` is the implementation of the tokens and breakpoints above. Changes to a token, layout dimension, breakpoint, or shared primitive must update this document in the same change.
- `cli-gui/client/components/` is the implementation source for the component vocabulary. Feature components should not duplicate an existing primitive's behavior or visual tokens.
- Feature specs and PRDs may add requirements, but should reference this document instead of redefining the entire workbench design.
- Layout or shared-component changes require client tests for the affected state and a browser check at desktop and narrow widths.

## Session Management

Every session has a user-visible name and is selectable from the left rail. The active session exposes rename, resume or stop, and delete controls. Session rows show runtime state and recent activity so multiple local CLI jobs remain distinguishable.

## States

- Empty: the center stage prompts the user to create a named session from the launchpad.
- Loading: the app shows a minimal loading surface while `/api/state` resolves.
- Success: the three-column workbench renders sessions, terminal, and context details.
- Failure: API or runtime failures are shown in the stage-level alert with a dismiss action.

## Validation

UI changes should run `npm run test` and `npm run build` from `cli-gui/`. Layout changes should include a client test that confirms the session rail, conversation stage, context rail, and session naming controls are present.
