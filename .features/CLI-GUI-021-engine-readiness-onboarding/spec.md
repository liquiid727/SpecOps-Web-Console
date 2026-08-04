---
id: CLI-GUI-021
version: "1.0"
title: "CLI-GUI-021 Engine Readiness and First-Task Onboarding"
status: rebaseline
goals:
  - "Make Chat eligibility a capability/readiness result instead of a static feature flag."
  - "Give missing, unsupported, timed-out, and auth-required engines typed recovery actions."
  - "Keep setup Terminal as an explicit fallback, never the ready Chat default."
nonGoals:
  - "Automatically install or mutate a vendor CLI."
  - "Claim authentication success from a version probe alone."
  - "Implement model management or Remote Control."
actors:
  - "CLI GUI user"
  - "engine-readiness service"
  - "implementation-agent"
userFlows:
  - name: "Readiness-driven first task"
    steps:
      - "Detect configured Codex or Claude profile"
      - "Show loading readiness without erasing the task draft"
      - "Enable Chat only for a supported structured transport"
      - "Create a Chat session from the first task"
      - "Offer a translated remediation action when Chat is unavailable"
systemFlows:
  - name: "Bounded non-mutating readiness probe"
    steps:
      - "Probe executable, version, transport, and capability metadata"
      - "Apply timeout and classify unknown readiness"
      - "Map the result to a stable remediation kind"
      - "Expose a setup Terminal only for an explicit fallback action"
rules:
  - id: "readiness.no-auto-install"
    description: "Readiness probes never install binaries, rewrite user config, or run an unapproved setup script."
  - id: "readiness.chat-eligibility"
    description: "Chat eligibility is derived from readiness and backend capability, not CHAT_ENABLED alone."
  - id: "readiness.terminal-explicit"
    description: "A ready structured engine opens Chat by default; Terminal is a typed remediation or user-selected view."
edgeCases:
  - "Executable is missing, incompatible, timed out, or returns an unknown auth state."
  - "A profile supports PTY but not structured Chat."
  - "Readiness changes while the Quest Home task draft is being edited."
  - "The remediation action is unavailable in a browser or readonly client."
observability:
  - "Record probe duration, engine/profile, transport, result class, remediation kind, and timeout reason."
  - "Do not record tokens, full environment values, or vendor config contents."
tests:
  requiredBranches:
    - happy
    - error
    - edge
    - limit
    - flow
traceability:
  prd: "cli-gui/doc/mvp02/desktop-terminal-replacement-prd.md"
api:
  - name: "Engine readiness"
    method: "GET"
    path: "/api/profiles/:id/readiness"
  - name: "Capability snapshot"
    method: "GET"
    path: "/api/profiles/:id/capabilities"
ui:
  - name: "Quest Home readiness and remediation"
    route: "client/components/QuestHome"
---

# CLI-GUI-021 Engine Readiness and First-Task Onboarding

## Meta

- Spec ID: `CLI-GUI-021`
- Spec Version: `1.0`
- Epic: `MVP02-A Desktop Terminal Replacement`
- Status: `rebaseline`
- Source contracts: `cli-gui/doc/mvp02/spec/agent-runtime-spec.md`, `cli-gui/doc/mvp02/spec/ui-interaction-spec.md`
- Source PRD: `cli-gui/doc/mvp02/desktop-terminal-replacement-prd.md`
- Canonical platform design: `design/cli-gui-platform-design.md`
- Verification gate: `cli-gui/doc/mvp02-check-qa/`
- Issue mapping: `#065`, `#072`
- Implementation handoff: `implementation/CLI-GUI-021-mvp02a-foundation.md`
- Review entry: `reviews/CLI-GUI-021/review-entry.md`
- Test Spec: `.features/CLI-GUI-021-engine-readiness-onboarding/test-spec.md`

## Goal

Turn engine detection into an honest product readiness contract. A user with a
supported structured engine can start in Chat, while unsupported or incomplete
engines receive a recoverable, localized explanation.

## Why This Exists

The code already has readiness probes and remediation kinds, but the historical
MVP02 docs and implementation notes did not distinguish a probe result from a
real-engine release acceptance. This slice freezes that distinction.

## Out of Scope

- Installing or authenticating a vendor CLI automatically.
- Provider/Deployment/Route management.
- Packaged Tauri acceptance, which is a separate `CLI-GUI-025` gate.

## Deliverables

- Typed readiness result for installation, version, compatibility, transport, and capability.
- Timeout, unknown, auth-required, unsupported, and missing remediation mappings.
- Quest Home empty/loading/ready/failed states with draft preservation.
- Explicit setup-terminal fallback and “back to Chat” recovery path.
- Readiness test fixtures independent from real binaries.

## Domain

Readiness is a snapshot of an Engine/Profile boundary, not a guarantee that a future
turn will succeed. `guiMode: full` allows Chat entry; later backend failures remain
turn/attempt failures and must not be hidden as readiness success.

## Application

The application resolves readiness before enabling Chat, maps typed errors to actions,
and keeps the task draft outside the probe lifecycle. Terminal fallback is a user-visible
transition with a reason.

## Repository

No database change. Readiness is cacheable runtime metadata; profile configuration and
synced models use the existing state repository rules.

## API

Existing readiness/capability endpoints keep stable error semantics. Probe failures
return typed status and remediation metadata rather than a generic 500. Unsupported
client/platform actions return a translated capability error.

## Database Impact

None. Do not persist a readiness result as proof of an authenticated or real-engine
release acceptance.

## Test Plan

- Unit fixtures for supported, missing, timeout, unsupported, auth-unknown, and PTY-only profiles.
- Browser state checks for empty/loading/ready/failed, draft retention, fallback reason,
  and return-to-Chat behavior.
- Independent API/contract result with probe duration and remediation evidence.
- Real-engine smoke must record binaries and versions separately; a fixture run cannot satisfy it.

## Definition of Done

- Chat entry depends on readiness/capability.
- No automatic installation or configuration mutation occurs.
- Terminal is never the default for a ready structured engine.
- Gate Report distinguishes local readiness tests from real-engine and packaged gaps.
