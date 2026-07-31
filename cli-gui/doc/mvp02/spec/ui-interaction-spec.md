# SPEC: UI and Interaction

> Parent: [architecture-spec.md](./architecture-spec.md)
> PRD requirements: TR-001–TR-008, FR-TR-1–FR-TR-10

## 1. Primary Journey

```text
Quest Home -> Open Folder/Recent -> Engine -> Model/Permission
           -> write task -> create Session -> stream first turn
```

Session names are generated from the task summary. Executable paths, argv, and
raw Profiles live in Advanced Settings.

## 2. Readiness UI

Each Codex/Claude card shows installation, version compatibility,
authentication, selected transport, capabilities, and an actionable
remediation. Login uses an in-app Setup Terminal or browser flow. Missing CLI
shows platform-specific installation documentation.

Every readiness load supports loading, ready, attention, failure, and retry.

## 3. Chat

- Chat is enabled only when readiness and capabilities support structured turns.
- Text streams immediately; tool, command, file, progress, approval, and error
  events render as typed blocks.
- Raw/tool detail is collapsed by default.
- Stop is visible while running; Retry is explicit after failure/interruption.
- User scroll disables auto-follow and reveals “Back to latest”.
- Long transcripts use windowing or segmented rendering.
- Completion, failure, and approval wait may produce desktop notifications.

## 4. Composer

- Multiline; Enter sends; Shift+Enter inserts a newline.
- Engine/model and permission labels state when changes take effect.
- Only `default` and a real, read-only `plan` mode are visible in MVP02.
- Spec/Goal and unresolved context entry points are hidden.
- A running turn permits editing the next draft but prevents duplicate submit.
- Stop, approval wait, offline, read-only, and limits use plain-language state.
- Voice, polish, compact, undo, and recovery are visible only when functional.

## 5. Approval

An approval card includes operation, target, source, risk, and expiration. The
first Allow/Deny action freezes the card. Replayed and expired approvals remain
understandable. High-permission defaults require explicit confirmation.

## 6. Runtime Monitor

The right rail exposes only data-backed tabs:

- Summary: Engine, model, transport, workspace, branch, elapsed time, usage.
- Progress: current phase/tool and recently completed steps.
- Artifacts: files changed in the current turn.
- Files: scoped tree and read-only preview.
- Diff: per-file staged/unstaged read-only diff.
- Terminal: advanced/setup/fallback only.

Review or Spec tabs are hidden until they have real data.

## 7. Session Management

List rows show Engine, Workspace, lifecycle, approval wait, and last activity.
Supported actions: Rename, Pin, Archive, Complete, Fork, Stop, Resume, Delete.
Filters cover Workspace, Engine, status, and name. Resume distinguishes native
continuation from rebuilt context.

## 8. Accessibility and i18n

All new copy ships in English and Chinese in the same change. Controls have
keyboard focus and labels, status is not color-only, reduced motion is
respected, and Chinese IME composition never submits prematurely.

## 9. Responsive Behavior

Desktop keeps the three-column workbench. Narrow clients use drill-in Session,
Chat, and Monitor views while preserving the same actions and state labels.

