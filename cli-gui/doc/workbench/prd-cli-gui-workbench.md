# PRD: CLI GUI Three-Column Workspace

## 1. Introduction / Overview

Upgrade the existing Product AI OS CLI GUI into a three-column local AI coding workspace aligned with the interaction model of Claude Code and Codex desktop applications.

The workspace consists of:

- **Left:** workspaces and sessions, including grouping, sorting, lifecycle actions, custom ordering, and Settings.
- **Center:** a message-stream-first transcript, Markdown visualization, prompt composer, permission/mode/model controls, and an alternate raw terminal view.
- **Right:** read-only Preview, Files, Diff, and Git views for the selected workspace.

The feature does not replace the official Claude Code or Codex agent loops. It provides a visual organization, history, interaction, and inspection layer around local CLI processes.

The first implementation remains a localhost Web application. Filesystem, folder-selection, Git, persistence, and PTY capabilities must use transport-neutral interfaces so a later Tauri or equivalent desktop shell can replace the local Web transport.

## 2. Goals

- Deliver a responsive, collapsible three-column workspace consistent with modern Claude Code/Codex app patterns.
- Let users open a local project through a folder chooser without manually entering environment variables.
- Let users create, select, rename, pin, archive, complete, fork, and manually reorder sessions.
- Let users group and sort sessions by project, time, recency, and manual order.
- Persist structured session history so stopped sessions remain reviewable after restart.
- Present terminal activity as a readable message stream without falsely classifying ambiguous PTY output.
- Render recognized Plan, Skill, and other Markdown content safely and readably.
- Let users send prompts through a chat-style composer and view effective permission, mode, and model settings.
- Preserve full raw-terminal access for interactive or unsupported CLI behavior.
- Provide read-only project file, language, file preview, Diff, and Git inspection.
- Expose a stable Settings navigation shell for current and future configuration categories.
- Preserve English and Chinese localization, keyboard accessibility, and read-only deployment behavior.
- Keep domain and capability contracts portable to a future desktop application.

## 3. Product Principles

1. **Message stream first, terminal always available.** The transcript is the primary view; xterm remains the fidelity source and compatibility fallback.
2. **Local-first and workspace-contained.** Session data, file access, and Git inspection remain local and constrained to registered workspace roots.
3. **Do not invent CLI semantics.** Unknown PTY output remains neutral CLI output rather than being mislabeled as an assistant or tool message.
4. **Profile-driven controls.** Model, mode, and permission options reflect capabilities declared by the selected CLI profile.
5. **Git is read-only.** The GUI must not stage, unstage, commit, discard, restore, checkout, merge, reset, pull, push, or stash.
6. **Desktop-ready boundaries, no desktop migration yet.** React feature components must not depend directly on browser-specific or native APIs.
7. **Extend the existing architecture.** Reuse the current component shell, tokenized CSS, i18n, icons, overlays, PTY lifecycle, and serialized local persistence patterns.

## 4. User Stories

### US-001: Version and migrate persisted state

**Description:** As a returning user, I want existing local data migrated safely so that the upgraded workspace does not lose my workspaces, profiles, or sessions.

**Acceptance Criteria:**
- [ ] Persisted application state contains an explicit schema version.
- [ ] Existing unversioned state is recognized as the legacy schema.
- [ ] Migration preserves workspace, profile, session, and timestamp data.
- [ ] New fields receive documented defaults.
- [ ] Invalid state produces a recoverable error and does not silently overwrite the source file.
- [ ] Migration fixtures and server tests pass.

### US-002: Add organizational session metadata

**Description:** As a user, I want session organization to be independent of PTY runtime state so that I can manage completed and archived work accurately.

**Acceptance Criteria:**
- [ ] Runtime status remains `starting`, `running`, `stopped`, or `error`.
- [ ] Organizational status supports `active`, `completed`, and `archived`.
- [ ] Session metadata supports pinned state and manual order.
- [ ] Session metadata can store parent session and fork event references.
- [ ] Existing sessions load with backward-compatible defaults.
- [ ] Shared client/server types and tests use the same contract.

### US-003: Persist structured transcript events

**Description:** As a user, I want session activity saved so that I can reopen a session and review its history after the process or server stops.

**Acceptance Criteria:**
- [ ] Every event has a stable ID, session ID, sequence number, timestamp, kind, source, and raw payload or raw-payload reference.
- [ ] Events are append-only and stored per session.
- [ ] Composer submissions, PTY output, lifecycle transitions, and errors can be recorded.
- [ ] Restarting the server preserves transcript history.
- [ ] Deleting a session removes its transcript through the documented deletion policy.
- [ ] A transcript write failure does not terminate the PTY process.

### US-004: Replay transcript history

**Description:** As a user, I want historical activity loaded before live events so that reopening a session produces a continuous timeline.

**Acceptance Criteria:**
- [ ] A session transcript endpoint returns events in sequence order.
- [ ] The endpoint supports pagination or an `afterSequence` cursor.
- [ ] The response states whether more events are available.
- [ ] Live delivery resumes after the latest replayed sequence.
- [ ] Reconnect does not duplicate events.
- [ ] Empty, partial, complete, and unknown-session cases have tests.

### US-005: Complete the collapsible three-column shell

**Description:** As a user, I want independently collapsible side panels so that I can focus on the conversation or inspect project context as needed.

**Acceptance Criteria:**
- [ ] Utility rail, left navigator, center workspace, and right inspector render as distinct regions.
- [ ] Separate controls collapse and restore the left and right panels.
- [ ] Existing keyboard shortcuts toggle both side panels.
- [ ] The center remains usable with either or both side panels hidden.
- [ ] Narrow layouts render the side panels as accessible drawers with backdrops.
- [ ] Panel visibility preferences survive reload.
- [ ] Verify in browser using dev-browser skill.

### US-006: Open a local workspace through a folder chooser

**Description:** As a user, I want to choose a local project directory so that I do not have to type an absolute path or configure environment variables.

**Acceptance Criteria:**
- [ ] An Open Folder action is available from the left navigation and Settings workspace management.
- [ ] The action calls a platform-neutral directory-picker service.
- [ ] The local Web adapter opens an operating-system folder chooser from a direct user action.
- [ ] Canceling the chooser creates no workspace.
- [ ] The returned absolute path is validated as an accessible directory.
- [ ] Duplicate canonical paths focus the existing workspace or show a clear duplicate message.
- [ ] Manual absolute-path entry remains available as a fallback when native selection is unavailable.
- [ ] The loopback picker endpoint cannot be triggered by arbitrary remote origins.
- [ ] Verify in browser using dev-browser skill.

### US-007: Group and sort sessions

**Description:** As a user, I want multiple session views so that I can find work by project, time, or recent activity.

**Acceptance Criteria:**
- [ ] Project view groups sessions by workspace.
- [ ] Time view uses documented localized buckets such as Today, Yesterday, Previous 7 Days, and Older.
- [ ] Recent view orders sessions by `lastActiveAt` descending.
- [ ] Manual view uses persisted user-defined ordering.
- [ ] Pinned sessions remain visible above ordinary groups.
- [ ] Archived and completed sessions are excluded from the default active view and available through explicit filters.
- [ ] The selected grouping and sort mode persist.
- [ ] Empty groups are not rendered.
- [ ] Verify in browser using dev-browser skill.

### US-008: Add a session context menu

**Description:** As a user, I want session actions in a compact context menu so that I can organize work without opening a separate details screen.

**Acceptance Criteria:**
- [ ] Right-click opens the menu for the targeted session.
- [ ] A keyboard-accessible action button opens the same menu.
- [ ] The menu includes Rename, Pin/Unpin, Archive/Restore, Complete/Reopen, Fork, and Delete.
- [ ] Escape and outside click close the menu.
- [ ] Arrow keys navigate menu items and focus returns to the trigger on close.
- [ ] Destructive or runtime-affecting actions require the documented confirmation.
- [ ] Verify in browser using dev-browser skill.

### US-009: Rename and pin sessions

**Description:** As a user, I want to customize session names and pin important work so that active tasks are recognizable and easy to reach.

**Acceptance Criteria:**
- [ ] Rename rejects empty or whitespace-only names.
- [ ] A successful rename updates all visible session labels without a full reload.
- [ ] Pin state persists after reload.
- [ ] Pinned sessions appear in a separate pinned area.
- [ ] Unpin returns a session to its selected grouping.
- [ ] Rename and pin operations do not change PTY runtime status.

### US-010: Archive and restore sessions

**Description:** As a user, I want inactive sessions archived so that the default session list stays focused without deleting history.

**Acceptance Criteria:**
- [ ] Archived sessions disappear from the default active view.
- [ ] An Archived filter exposes archived sessions.
- [ ] Archived sessions retain transcript, lineage, workspace, and profile metadata.
- [ ] Restoring an archived session returns it to active organization status.
- [ ] Archiving a running session requires confirmation and stops its PTY first.
- [ ] Archived sessions cannot start until restored.
- [ ] Archive state persists after reload.

### US-011: Complete and reopen sessions

**Description:** As a user, I want to mark finished work as complete without archiving or deleting it so that completed tasks remain reviewable.

**Acceptance Criteria:**
- [ ] Completing a stopped session sets organizational status to completed.
- [ ] Completing a running session requires confirmation and stops its PTY first.
- [ ] Completed sessions remain available through a Completed filter or group.
- [ ] Reopen returns a completed session to active organizational status.
- [ ] Completion retains transcript, lineage, workspace, and profile metadata.
- [ ] Completion state persists after reload.

### US-012: Manually reorder sessions

**Description:** As a user, I want to drag sessions into my preferred order so that navigation matches my priorities.

**Acceptance Criteria:**
- [ ] Drag handles appear in Manual sort mode.
- [ ] Dragging reorders sessions within the allowed section.
- [ ] Keyboard controls provide an equivalent move-before/move-after operation.
- [ ] Pinned and unpinned sections maintain independent manual order.
- [ ] Reordering does not change `lastActiveAt`.
- [ ] The order persists after reload.
- [ ] Verify in browser using dev-browser skill.

### US-013: Fork a session

**Description:** As a user, I want to branch from an existing session so that I can try another direction without changing the original task history.

**Acceptance Criteria:**
- [ ] Fork creates a distinct session ID linked to its parent session.
- [ ] The fork stores the latest persisted transcript event as its fork boundary.
- [ ] The fork inherits workspace, CLI profile, and effective permission/mode/model launch configuration.
- [ ] The fork does not reuse or clone the parent PTY process.
- [ ] The fork starts in stopped runtime state and active organizational state.
- [ ] Parent events created after the fork boundary never appear in the child.
- [ ] The newly created fork becomes the selected session.
- [ ] The UI clearly describes Fork as a session/conversation branch, not a Git branch.

### US-014: Render a structured message transcript

**Description:** As a user, I want CLI history shown as readable messages so that I can follow progress without interpreting a raw terminal screen.

**Acceptance Criteria:**
- [ ] Historical events load when a session is selected.
- [ ] Live events append after replay without duplicates.
- [ ] User, neutral CLI output, lifecycle, tool activity, permission request, and error events are visually distinct.
- [ ] Ambiguous PTY output is labeled as CLI output rather than assistant output.
- [ ] A stopped, completed, or archived session remains readable.
- [ ] Loading, empty, reconnecting, truncated, and failure states are visible.
- [ ] Message and code content provide copy controls.
- [ ] Verify in browser using dev-browser skill.

### US-015: Render sanitized Markdown

**Description:** As a user, I want Plan, Skill, and Markdown-rich output rendered visually so that structured responses are easier to read.

**Acceptance Criteria:**
- [ ] Headings, paragraphs, lists, task lists, tables, block quotes, links, inline code, and fenced code blocks render.
- [ ] GitHub-flavored Markdown is supported.
- [ ] Raw HTML is disabled or sanitized.
- [ ] Links accept only safe protocols and external links use safe target attributes.
- [ ] Code blocks preserve whitespace and provide copy controls.
- [ ] Raw source remains accessible for comparison or fallback.
- [ ] Plan, Skill, malicious HTML, malformed Markdown, and oversized-content fixtures have tests.
- [ ] Verify in browser using dev-browser skill.

### US-016: Add the chat-style composer

**Description:** As a user, I want to send prompts from the bottom of the center panel so that CLI interaction feels like a focused conversation.

**Acceptance Criteria:**
- [ ] The composer supports multiline input.
- [ ] Enter submits and Shift+Enter inserts a newline, with both behaviors documented in the UI.
- [ ] Empty or whitespace-only content cannot be submitted.
- [ ] A submission is persisted as a user transcript event.
- [ ] A running session receives the text and required line terminator exactly once.
- [ ] A stopped session offers an explicit start-and-send flow.
- [ ] Sending, disabled, and failure states prevent ambiguous duplicate submission.
- [ ] Composer content is not sent to an archived session.
- [ ] Verify in browser using dev-browser skill.

### US-017: Configure permission, mode, and model

**Description:** As a user, I want visible CLI controls in the composer so that I understand and configure how the selected session runs.

**Acceptance Criteria:**
- [ ] Permission, mode, and model selectors are visible in the composer.
- [ ] Every selector includes a `CLI default` option.
- [ ] Available options come from the selected profile's capability adapter.
- [ ] Unsupported selectors are disabled with a clear explanation.
- [ ] Changes that require a restart are labeled as applying on the next start or fork.
- [ ] Effective values persist with the session.
- [ ] The UI never reports that a setting was applied when no adapter translated it to supported CLI behavior.
- [ ] Verify in browser using dev-browser skill.

### US-018: Retain raw terminal mode

**Description:** As a user, I want an alternate raw terminal view so that interactive commands and output that cannot be represented safely as messages remain usable.

**Acceptance Criteria:**
- [ ] The center provides Transcript and Terminal tabs or an equivalent view switch.
- [ ] Switching views does not create another PTY.
- [ ] Existing keyboard input, Ctrl+C, ANSI output, resize, and WebSocket behavior remain operational.
- [ ] Unrepresentable output offers a direct route to Terminal view.
- [ ] Terminal errors do not erase persisted transcript history.
- [ ] The selected center view persists according to a documented per-session rule.
- [ ] Verify in browser using dev-browser skill.

### US-019: Browse workspace files

**Description:** As a user, I want a project file tree in the right panel so that I can inspect the context used by the selected session.

**Acceptance Criteria:**
- [ ] The Files tab lists entries only within the selected workspace.
- [ ] Directories load incrementally rather than requiring the entire tree at once.
- [ ] `..`, absolute-path substitution, and symlink escape attempts are rejected.
- [ ] Hidden, ignored, generated, and vendor directory behavior is documented.
- [ ] Inaccessible, missing, empty, and oversized directories have explicit states.
- [ ] Selecting a text file opens it in Preview.
- [ ] Verify in browser using dev-browser skill.

### US-020: Show project language summary

**Description:** As a user, I want a language summary so that I can understand the selected project's composition quickly.

**Acceptance Criteria:**
- [ ] Language detection uses a documented file-extension mapping.
- [ ] Results show language and file count or relative share.
- [ ] Generated and vendor directories follow the documented exclusion policy.
- [ ] Unknown extensions do not produce errors.
- [ ] Empty workspaces show a neutral empty state.
- [ ] Scanning uses explicit file-count or time limits and reports partial results.
- [ ] Verify in browser using dev-browser skill.

### US-021: Preview files read-only

**Description:** As a user, I want to preview a selected project file so that I can inspect content without leaving the session or modifying the repository.

**Acceptance Criteria:**
- [ ] Supported text files display with line numbers.
- [ ] The Preview tab clearly states that it is read-only.
- [ ] Oversized files use a bounded preview or explicit refusal.
- [ ] Binary files show metadata instead of corrupted text.
- [ ] A refresh action reloads changed content.
- [ ] No edit or save action is present.
- [ ] Requests cannot escape the registered workspace root.
- [ ] Verify in browser using dev-browser skill.

### US-022: Preview Git diffs read-only

**Description:** As a user, I want to inspect repository changes so that I can understand what the CLI changed without running Git commands manually.

**Acceptance Criteria:**
- [ ] The Diff tab distinguishes unstaged and staged changes.
- [ ] Added, removed, and context lines are visually distinct without relying only on color.
- [ ] Added, deleted, modified, renamed, binary, conflicted, and untracked files have defined presentations.
- [ ] Large diffs show an explicit truncation state.
- [ ] A clean repository shows a clean state.
- [ ] A non-Git workspace shows a neutral state.
- [ ] No stage, unstage, apply, discard, restore, or edit action is present.
- [ ] Verify in browser using dev-browser skill.

### US-023: Show read-only Git status

**Description:** As a user, I want branch and working-tree status so that I can understand repository state at a glance.

**Acceptance Criteria:**
- [ ] The Git tab shows the current branch or detached HEAD.
- [ ] The Git tab shows counts for clean, modified, added, deleted, renamed, untracked, and conflicted files as applicable.
- [ ] Git commands execute with argument arrays and the registered workspace as `cwd`.
- [ ] The server exposes allowlisted inspection operations rather than a generic Git-command endpoint.
- [ ] The adapter exposes no Git mutation method.
- [ ] Refresh updates Git status and Diff views.
- [ ] Verify in browser using dev-browser skill.

### US-024: Add the Settings navigation shell

**Description:** As a user, I want a predictable Settings area so that present and future configuration has a stable home.

**Acceptance Criteria:**
- [ ] A Settings icon and label remain fixed at the bottom of the left navigation or utility rail.
- [ ] Settings lists Pet, Model, Account, Hooks, Git, Environment, Personalization, Appearance, and Shortcuts.
- [ ] Existing workspace and CLI profile management remains functional under an appropriate category.
- [ ] Categories not implemented in this release show intentional placeholder content.
- [ ] Placeholders do not expose fake Save or Apply actions.
- [ ] Category navigation is keyboard accessible and visibly selected.
- [ ] Settings renders as an accessible drawer or dialog at narrow widths.
- [ ] Verify in English and Chinese using dev-browser skill.

### US-025: Preserve localization and accessibility

**Description:** As a user, I want the upgraded workspace usable in English, Chinese, and keyboard-only workflows so that all existing audiences retain access.

**Acceptance Criteria:**
- [ ] Every new user-facing string goes through the existing i18n system.
- [ ] English and Chinese strings ship in the same change.
- [ ] Context menus, dialogs, drawers, tabs, selectors, and file trees support keyboard navigation.
- [ ] Focus is trapped and restored for modal surfaces.
- [ ] Panel controls expose expanded/collapsed state.
- [ ] Drag reorder has a keyboard alternative.
- [ ] Status is not communicated by color alone.
- [ ] Reduced-motion preferences are respected.

### US-026: Add automated browser smoke coverage

**Description:** As a developer, I want browser-level tests so that layout and cross-component workflows are verified beyond jsdom.

**Acceptance Criteria:**
- [ ] Browser test tooling starts the client and local server in an isolated test environment.
- [ ] A smoke test opens or registers a fixture workspace.
- [ ] A smoke test creates and selects a session.
- [ ] A smoke test toggles both side panels and opens Settings.
- [ ] A smoke test verifies Transcript/Terminal switching and composer behavior.
- [ ] A smoke test opens Files, Preview, Diff, and Git views against a disposable fixture repository.
- [ ] Test Git and file operations cannot mutate the source repository.
- [ ] Existing Vitest and build commands remain operational.

## 5. Functional Requirements

### Application shell
- FR-1: The system must present utility rail, session navigator, center workspace, and right inspector as distinct regions.
- FR-2: The system must allow the left panel to be collapsed and restored.
- FR-3: The system must allow the right panel to be collapsed and restored.
- FR-4: The system must render side panels as overlay drawers below their responsive breakpoints.
- FR-5: The system must persist panel visibility preferences.
- FR-6: The system must expose keyboard shortcuts for both side panels.

### Workspace management
- FR-7: The system must provide an Open Folder action.
- FR-8: The system must validate a selected directory before registration.
- FR-9: The system must canonicalize workspace paths.
- FR-10: The system must prevent duplicate workspace registration by canonical path.
- FR-11: The system must provide manual path entry when native selection is unavailable.
- FR-12: The system must preserve workspace deletion protection while sessions reference it.

### Session navigation and lifecycle
- FR-13: The system must allow session creation from the left navigation.
- FR-14: The system must allow session selection from the left navigation.
- FR-15: The system must group sessions by project.
- FR-16: The system must group sessions by localized time bucket.
- FR-17: The system must order sessions by recent activity.
- FR-18: The system must support persisted manual ordering.
- FR-19: The system must present pinned sessions separately.
- FR-20: The system must allow session rename.
- FR-21: The system must allow pin and unpin.
- FR-22: The system must allow archive and restore.
- FR-23: The system must allow complete and reopen.
- FR-24: The system must allow session fork.
- FR-25: The system must expose actions through a keyboard-accessible context menu.
- FR-26: The system must keep Settings accessible at the bottom of navigation.

### Transcript and Markdown
- FR-27: The system must persist composer submissions as transcript events.
- FR-28: The system must persist PTY output as transcript events.
- FR-29: The system must persist lifecycle transitions as transcript events.
- FR-30: The system must replay events in sequence order.
- FR-31: The system must continue live delivery after replay.
- FR-32: The system must deduplicate replayed and live events by event ID.
- FR-33: The system must label ambiguous PTY output as neutral CLI output.
- FR-34: The system must render recognized Markdown through a sanitized renderer.
- FR-35: The system must retain raw source for rendered Markdown.
- FR-36: The system must expose copy actions for message and code content.
- FR-37: The system must show loading, empty, reconnecting, truncation, and failure states.

### Composer and terminal
- FR-38: The system must provide a multiline prompt composer.
- FR-39: The system must send non-empty composer content to the selected running session exactly once.
- FR-40: The system must provide an explicit start-and-send flow for a stopped session.
- FR-41: The system must display a permission selector.
- FR-42: The system must display a mode selector.
- FR-43: The system must display a model selector.
- FR-44: The system must derive selector options from CLI profile capabilities.
- FR-45: The system must explain unsupported selectors.
- FR-46: The system must state when configuration applies on next start.
- FR-47: The system must provide a structured Transcript view.
- FR-48: The system must provide a raw Terminal view.
- FR-49: The system must preserve existing PTY input, Ctrl+C, ANSI, resize, and WebSocket behavior.

### Files, Preview, Diff, and Git
- FR-50: The system must list files within the selected workspace.
- FR-51: The system must reject file paths outside the selected workspace.
- FR-52: The system must reject symlink-based workspace escape.
- FR-53: The system must display detected project languages.
- FR-54: The system must preview supported text files read-only.
- FR-55: The system must show safe states for binary and oversized files.
- FR-56: The system must display unstaged Git diff read-only.
- FR-57: The system must display staged Git diff read-only.
- FR-58: The system must display current branch or detached HEAD state.
- FR-59: The system must display working-tree status categories.
- FR-60: The system must handle non-Git workspaces as a neutral state.
- FR-61: The system must run Git through allowlisted argument-array commands.
- FR-62: The system must not expose any Git mutation operation.

### Settings, compatibility, and quality
- FR-63: The system must show every confirmed Settings category.
- FR-64: The system must label unavailable Settings categories as placeholders.
- FR-65: The system must route every user-facing string through i18n.
- FR-66: The system must provide English and Chinese strings together.
- FR-67: The system must preserve existing read-only deployment behavior.
- FR-68: The system must version persisted application state.
- FR-69: The system must migrate legacy state without data loss.
- FR-70: The system must expose filesystem, Git, directory-picker, persistence, and PTY behavior through platform-neutral capability interfaces.

## 6. Non-Goals / Out of Scope

- Git write operations, including stage, unstage, commit, checkout, branch creation, merge, reset, restore, pull, push, stash, and conflict resolution.
- Editing or saving source files from Preview.
- Replacing VS Code, Cursor, JetBrains, or another IDE.
- Direct Claude API, Codex API, or provider API integration.
- Reimplementing the official Claude Code or Codex agent loop.
- Multi-agent orchestration, workflow execution, RAG, or project knowledge bases.
- Cloud synchronization, collaboration, or multi-user sessions. Remote workspaces over SSH are no longer excluded; they are covered by `prd-cli-gui-project-quest.md`.
- Cloning or attaching to a parent's running PTY during Fork.
- Claiming that arbitrary terminal bytes can always be reconstructed into semantic assistant or tool events.
- Tauri/Electron packaging in this delivery.
- Full implementation of Pet, Account, Hooks, Personalization, Appearance, or other deferred Settings categories; navigation and intentional placeholder states are in scope.
- Star Rail theme, character roles, or agent-persona systems; these require a separate PRD.
- Reverting or wholesale-replacing the existing uncommitted component restructuring.

## 7. Design Considerations

### 7.1 Visual direction

- Use the existing dark tokenized visual system as the base.
- Match Claude Code/Codex interaction density, restrained surfaces, clear hierarchy, compact controls, and conversation-focused center layout without copying proprietary assets.
- Preserve the existing utility rail and extend the navigator and inspector rather than introducing a parallel shell.
- Use existing `Overlay`, `ActionDialog`, icon, button, focus, and responsive drawer patterns.

### 7.2 Session semantics

- Runtime status and organizational status are independent.
- Complete is reversible and distinct from Archive.
- Archive is reversible and removes a session from default active views.
- Archive or Complete on a running session requires confirmation and stops the PTY first.
- Delete remains destructive, requires confirmation, removes session/transcript data according to policy, and never deletes workspace files.

### 7.3 Fork semantics

**[Assumption]** Fork branches the session/conversation at the latest persisted transcript event:

- Child inherits workspace, profile, and effective launch settings.
- Child records `parentSessionId`, `forkEventId`, and `forkedAt`.
- Child starts stopped and receives a new PTY only when started or first prompted.
- Child does not receive later parent events.
- Fork is unrelated to Git branch creation.

### 7.4 Transcript classification

Known composer submissions become user messages. Lifecycle changes and application errors use explicit event kinds. PTY output remains raw and may be grouped or recognized as Markdown, but unknown output must remain neutral CLI output. Raw source is retained for fidelity and troubleshooting.

### 7.5 Settings

Settings must provide a stable information architecture now, but unsupported categories must show honest placeholders rather than nonfunctional controls. Existing workspace and CLI profile management should move into Environment, Workspaces, or another clearly named category.

## 8. Technical Considerations

### 8.1 Existing components to reuse

- `cli-gui/client/app/App.tsx`: top-level state, panel toggles, overlays, session selection.
- `cli-gui/client/components/SessionNavigator.tsx`: left navigation boundary.
- `cli-gui/client/components/SessionWorkspace.tsx`: center workspace replacement point.
- `cli-gui/client/components/SessionInspector.tsx`: right-panel shell.
- `cli-gui/client/components/ui/Overlay.tsx` and `ActionDialog.tsx`: modal/drawer behavior.
- `cli-gui/client/terminal.tsx`: raw xterm and session WebSocket lifecycle.
- `cli-gui/client/styles.css`: tokens, grid, responsive drawers, controls.
- `cli-gui/client/i18n.tsx` and `components/ui/Icon.tsx`: localization and icons.
- `cli-gui/server/domain.ts`: workspace validation and argument-safe command preview.
- `cli-gui/server/store.ts`: serialized writes and atomic temp-file replacement.

### 8.2 Persistence

- Add a versioned state envelope and migration layer before expanding session metadata.
- Store large transcripts outside the aggregate `state.json`; prefer per-session append-oriented storage behind a repository abstraction.
- Define retention, corruption recovery, transcript deletion, and migration behavior in the technical SPEC.

### 8.3 Platform capability boundary

React components call client capability services rather than raw `fetch`, WebSocket, browser picker, Git, or native APIs. The current implementation uses local HTTP/WebSocket adapters; a future desktop adapter can use native invoke/events while retaining domain request/response types.

Required interfaces include:

- Directory picker
- Filesystem inspection
- Git inspection
- PTY/session runtime
- Persistence/transcript repository

### 8.4 Local Web folder picker

A browser-only directory picker does not reliably expose an absolute native path usable as a PTY `cwd`. The current Web phase should use a loopback-only server adapter that invokes the operating-system folder chooser, validates the selected absolute path, and returns it to the client. Manual path entry remains a fallback. The technical SPEC must define supported operating systems and origin/trigger protections.

### 8.5 CLI capability adapters

Mode, permission, and model options must be profile-driven. Generic profiles expose `CLI default` and no unsupported options. Claude/Codex-specific translation belongs in adapters, not scattered UI conditionals. Runtime-incompatible changes apply on next start or Fork unless a verified CLI protocol supports live changes.

### 8.6 Filesystem safety

- Canonicalize the workspace root.
- Resolve requested child paths and reject containment violations.
- Re-check symlink targets.
- Bound file size, directory entries, recursion depth, response size, and scan duration.
- Never accept an arbitrary root path from a file-preview request.

### 8.7 Git safety

Use allowlisted subprocess argument arrays with the registered workspace as `cwd`; do not expose a generic Git command endpoint. Candidate read-only operations include `rev-parse`, `status --porcelain=v2`, `diff --no-ext-diff`, `diff --cached --no-ext-diff`, and `ls-files`.

### 8.8 Markdown safety

Choose a maintained GitHub-flavored Markdown renderer with a sanitization path. Disable or sanitize raw HTML, restrict link protocols, bound document size, and keep raw source available. Syntax highlighting is optional unless added in the technical SPEC.

### 8.9 Testing

- Extend existing Vitest/jsdom component patterns for controls, context menus, grouping, Markdown, composer, and inspector tabs.
- Extract server creation and inject store, PTY, data path, filesystem, picker, and Git adapters so API behavior can be tested without real user data.
- Add browser E2E/visual smoke tooling because jsdom cannot verify responsive grid/drawer behavior.
- Use disposable fixture workspaces and Git repositories; never use the source repository as a mutation-capable fixture.

## 9. Success Metrics

### Workflow
- Median time from launch to selecting a previous session is under 10 seconds in usability testing.
- Median time from launch to creating a session in an existing workspace is under 20 seconds.
- At least 90% of usability-test participants import a workspace without manually typing an absolute path.
- A changed file's Diff can be reached in no more than two right-panel interactions.
- Rename, pin, archive, complete, and Fork are available without opening Settings.

### Reliability and safety
- Legacy migration fixtures show zero workspace, profile, or session data loss.
- At least 90% of persisted test sessions replay correctly after server restart, with a release target of 100% for supported fixtures.
- Reconnect tests produce zero duplicate transcript events.
- Filesystem security tests return zero content outside registered workspace roots.
- Automated command audits detect zero Git mutation operations.
- Existing PTY input, ANSI, Ctrl+C, resize, and session-isolation tests have zero regressions.

### Quality
- All new user-facing copy is available in English and Chinese.
- Context menu, panel toggles, settings, and reorder workflows are keyboard operable.
- Browser smoke tests cover the primary three-column flow before the feature is considered complete.
- `npm test` and `npm run build` pass from `cli-gui/`.
- End-to-end behavior is verified in the running local application using the project browser verification workflow.

## 10. Assumptions

- The application remains single-user and localhost-first.
- macOS is the first required folder-picker platform; additional operating systems are finalized in the technical SPEC.
- Users have supported Claude Code and/or Codex CLI executables installed locally.
- Transcript data remains on the user's machine.
- Archive and Complete are reversible and independent.
- Fork defaults to the latest persisted transcript event.
- Manual ordering applies only when Manual sort is selected.
- Pinned and unpinned sections maintain separate manual order.
- Mode, model, and permission settings are profile-capability-driven.
- Right-panel Git and file features are strictly read-only.
- Deferred Settings categories may ship as explicit placeholders.

## 11. Open Questions

- Which Claude Code and Codex CLI versions are the initial supported capability-adapter targets?
- Should Fork from an arbitrary selected message be included now, or remain a follow-up to latest-event Fork?
- Should fork history physically copy events or reference an immutable parent prefix?
- Should composer input be persisted before PTY delivery or only after confirmed delivery?
- Which operating systems must the native folder picker support in the first release after macOS?
- Which folders should Files and language detection exclude by default, and should `.gitignore` control visibility?
- What are the maximum transcript page, file preview, directory listing, language scan, and Diff sizes?
- Should UI preferences be stored in browser local storage, versioned server state, or split by preference type?
- What secure-erasure behavior is required when deleting transcript data?
- Should model/mode/permission changes ever restart a running session automatically, or always wait for explicit restart/Fork?

## 12. Recommended Delivery Sequence

1. Versioned state, migration, and organizational session metadata.
2. Transcript event persistence, replay, and live-event deduplication.
3. Platform capability interfaces and testable server composition.
4. Three-column shell completion and persisted panel preferences.
5. Open Folder adapter and workspace import flow.
6. Session grouping, context menu, rename, pin, archive, and complete.
7. Manual ordering and Fork.
8. Structured transcript and sanitized Markdown.
9. Composer and profile capability controls.
10. Raw terminal alternate view integration.
11. Files, language summary, and read-only Preview.
12. Read-only Diff and Git status.
13. Settings navigation shell.
14. Browser E2E smoke coverage and cross-feature accessibility/i18n hardening.

---
