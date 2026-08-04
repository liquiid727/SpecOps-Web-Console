---
id: CLI-GUI-024
version: "1.0"
title: "CLI-GUI-024 Runtime Monitor, Recovery, Read-only Diff, and Session UX"
status: rebaseline
goals:
  - "Let users inspect Agent progress and workspace changes without mutating the workspace."
  - "Make session restart, recovery, notification, responsive, bilingual, and readonly states explicit."
  - "Create the MVP02-A contract, performance, security, and real-engine verification surface."
nonGoals:
  - "Git stage, discard, edit, commit, or arbitrary file mutation from the monitor."
  - "Claim 50k transcript, large-diff, or packaged WebView performance without evidence."
  - "Promote a conditional historical QA report to release acceptance."
actors:
  - "CLI GUI user"
  - "Runtime monitor"
  - "Workspace/Git inspector"
  - "testing-agent"
userFlows:
  - name: "Inspect and recover a Session"
    steps:
      - "Open Summary, Progress, Artifacts, Files, Diff, Git, or Preview"
      - "Read data scoped to the active Workspace"
      - "Observe completion, failure, approval-wait, offline, or reconnecting status"
      - "Restart or recover a Session without losing transcript"
      - "Return to a safe Chat or setup fallback"
systemFlows:
  - name: "Read-only monitor projection"
    steps:
      - "Validate canonical workspace scope"
      - "Read bounded Git/file data"
      - "Mark binary, truncated, non-Git, partial, and timeout states"
      - "Emit notification through PlatformPort when supported"
      - "Reconcile live and persisted state by id/revision"
rules:
  - id: "monitor.read-only"
    description: "Monitor and Diff surfaces expose no mutation endpoint and cannot write workspace or Git state."
  - id: "monitor.workspace-scoped"
    description: "File and Git inspection stays within the canonical workspace and rejects symlink/path escape."
  - id: "monitor.state-complete"
    description: "Primary surfaces cover empty, loading, success, failure, offline, reconnecting, readonly, and pending states."
  - id: "monitor.evidence-honest"
    description: "Skipped platform, performance, and real-engine cases remain skipped or blocked in normalized evidence."
edgeCases:
  - "Non-Git workspace, binary file, large/truncated diff, timeout, or partial result."
  - "Workspace symlink escape or malformed path input."
  - "A live event races with refreshed persisted state."
  - "Tauri packaged matrix is unavailable."
observability:
  - "Record inspection duration, truncation, binary/partial status, runtime health, notification result, and recovery action."
  - "Record environment and platform for every real-engine or packaged verification attempt."
tests:
  requiredBranches:
    - happy
    - error
    - edge
    - limit
    - flow
traceability:
  prd: "cli-gui/doc/mvp02-check-qa/prd-experience-hardening.md"
api:
  - name: "Read-only Git status"
    method: "GET"
    path: "/api/sessions/:id/git-status"
  - name: "Read-only Git diff"
    method: "GET"
    path: "/api/sessions/:id/git-diff"
ui:
  - name: "Runtime monitor tabs"
    route: "client/components/inspector-tabs"
  - name: "Responsive workbench states"
    route: "client/components and client/styles"
---

# CLI-GUI-024 Runtime Monitor, Recovery, Read-only Diff, and Session UX

## Meta

- Spec ID: `CLI-GUI-024`
- Spec Version: `1.0`
- Epic: `MVP02-A Desktop Terminal Replacement`
- Status: `rebaseline`
- Source contracts: `cli-gui/doc/mvp02/spec/desktop-host-spec.md`, `cli-gui/doc/mvp02/spec/ui-interaction-spec.md`
- Canonical platform design: `design/cli-gui-platform-design.md`
- Source gate inputs: `cli-gui/doc/mvp02-check-qa/`
- Issue mapping: `#069`, `#073`, `#074`, `#075`
- Implementation handoff: `implementation/CLI-GUI-024-mvp02a-foundation.md`
- Review entry: `reviews/CLI-GUI-024/review-entry.md`
- Test Spec: `.features/CLI-GUI-024-monitor-recovery-diff-session/test-spec.md`

## Goal

Close the local desktop inspection loop while keeping every monitor surface read-only
and every QA claim tied to the right level of evidence.

## Why This Exists

The current implementation has strong local contract coverage and partial real-engine
smoke records, but the historical QA gate combines local, browser, real-engine, and
packaged claims. This feature separates those evidence classes and makes the missing
packaged/50k/full-journey proof blocking at the correct gate.

## Out of Scope

- Workspace mutation, Git mutation, arbitrary shell, or remote device control.
- Full cross-platform packaged acceptance in a local unit test.
- Rewriting historical QA reports or review records.

## Deliverables

- Data-backed monitor tabs and read-only Git/file/Diff APIs.
- Workspace/symlink, binary, truncation, partial, and non-Git safety behavior.
- Session lifecycle and recovery notifications through PlatformPort.
- Responsive, EN/ZH, keyboard, ARIA, IME, and reduced-motion states.
- Independent contract/security/performance/real-engine Test Specs and Gate Report inputs.

## Domain

The monitor is a read model over Session, Turn, Attempt, Workspace, and Git facts.
It has no write authority and cannot decide whether a fallback is safe.

## Application

The server validates scope and returns bounded read models. The UI projects them with
AsyncState and Feedback patterns. QA receives normalized evidence, not component prose.

## Repository

No database change. Diff and inspector outputs are bounded responses; they are not
persisted as an alternate workspace truth.

## API

Git status and diff remain GET-only, workspace-relative, and explicitly typed for
non-Git, binary, and truncated outcomes. Existing readonly and security errors remain stable.

## Database Impact

None. Session/recovery facts remain in existing state/transcript stores.

## Test Plan

- Contract/security tests for readonly, symlink, XSS-safe display, replay, and bounded output.
- Browser screenshots/DOM contracts for every major state at desktop and narrow viewports.
- Performance test for 50k transcript events, high-rate delta, and large diff behavior.
- Concurrency test for multiple active Sessions and live/persisted reconciliation.
- Real-engine and packaged-host tests classify every unavailable environment as skipped/blocked.

## Definition of Done

- Monitor cannot mutate workspace or Git state.
- State, accessibility, i18n, and responsive contracts are independently testable.
- Gate reports explicitly distinguish local, independent, real-engine, and packaged status.
- No historical QA or review artifact is overwritten.
