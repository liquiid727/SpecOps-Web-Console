# CLI GUI Delivery Record

This record tracks the implementation evidence for the CLI GUI workbench. Issue markdown checkboxes were not used as completion evidence and were left unchanged.

## Implemented Scope

- Baseline MVP work for issues #1-#13: loopback-only bootstrap, injectable server lifecycle, workspace/profile/session persistence, direct argument-array PTYs, WebSocket terminal transport, xterm integration, session confirmation/recovery, structured API errors, readonly policy, and isolated temporary-fixture coverage.
- Backend protocol and security work for issues #14-#22: schema-v2 state, validated migration and backup, corruption protection, readonly zero-write behavior, exact Host/Origin/CSRF checks, PTY start locks and generations, confirmed session creation, lifecycle metadata, optimistic revisions, organizational actions, and atomic section ordering.
- Transcript and session protocol work for issues #23-#30: bounded JSONL persistence, incomplete-tail recovery, retention and Fork-prefix protection, lifecycle/error capture, paged replay, gap-free live subscription, idempotent composer delivery, Fork lineage, profile adapters, and typed local-web client transport.
- Profile adapter validation follows the installed CLI contracts: Claude Code uses its supported permission/model flags and exposes no fabricated `--mode`; Codex separates approval and sandbox flags; unsupported values are rejected instead of silently dropped.
- Workbench UI work for issues #31-#40: versioned preferences, responsive shell/drawers, grouping and lifecycle filters, accessible context actions with confirmation, pointer/keyboard ordering, structured transcript and sanitized GFM, composer controls, capability-driven selectors, and raw terminal view.
- Workspace and inspector work for issues #41-#45: canonical path and picker intent validation, deterministic picker fixture, Git-driven bounded file visibility, safe previews and language limits, typed Git status/diff errors, and lazy linked inspector tabs with refresh controls.

## Verification

- `npm test`: passed, 18 test files and 54 tests.
- `npm run build`: passed.
- `npm run test:e2e`: uses the local `ego-browser` runner with an in-runtime disposable fixture server and covers shell/responsive, Chat-first, multi-turn, cancellation, terminal replay, reload/archive, downgrade, and theme persistence flows.
- `npm run test:e2e:playwright`: retains the full disposable Playwright suite for environments that allow Playwright Chromium to launch.
- `npm run smoke:real-cli`: passed with authenticated Codex and Claude fixed-prompt checks, four concurrent real Codex/Claude PTYs in isolated temporary data and HOME directories, resize, Ctrl+C input, stop, recovery, and abnormal-exit lifecycle checks.
- All fixtures use temporary directories. No real CLI output, credentials, or source-repository state is persisted.

## Delivery Boundaries

Issue markdown checkboxes remain unchanged. Completion is based on the implementation, tests, build, browser fixture, and real smoke evidence above. The pre-existing uncommitted `cli-gui/doc/cli-gui-design.md` change was preserved. No commit, push, or remote issue mutation was performed.
