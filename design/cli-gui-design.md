# CLI GUI Design

## Scope

This design owns the local CLI GUI in `cli-gui/`. The GUI is a desktop-style session workbench for launching, naming, resuming, stopping, and deleting local Codex, Claude, or custom CLI sessions.

## Layout Model

The primary UI follows the same hierarchy as session-first coding apps such as Claude Code and Codex App:

- Left rail: session management, session selection, workspace grouping, and compact CLI profile visibility.
- Center stage: the selected session name, runtime status, primary session actions, and the terminal surface.
- Right rail: session context, launch controls, workspace registration, and CLI profile setup.

Workspaces and profiles support session creation, but they must not dominate the main surface. The active user task is always represented as a named session.

## Session Management

Every session has a user-visible name and is selectable from the left rail. The active session exposes rename, resume or stop, and delete controls. Session rows show runtime state and recent activity so multiple local CLI jobs remain distinguishable.

## States

- Empty: the center stage prompts the user to create a named session from the launchpad.
- Loading: the app shows a minimal loading surface while `/api/state` resolves.
- Success: the three-column workbench renders sessions, terminal, and context details.
- Failure: API or runtime failures are shown in the stage-level alert with a dismiss action.

## Validation

UI changes should run `npm run test` and `npm run build` from `cli-gui/`. Layout changes should include a client test that confirms the session rail, conversation stage, context rail, and session naming controls are present.
