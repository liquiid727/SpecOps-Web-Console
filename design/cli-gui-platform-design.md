# CLI GUI Platform Design

## Meta

- Platform: `cli-gui`
- Status: `draft`
- Owner: `cli-gui-agent`
- Inputs: MVP01 Agent Console, MVP02 Client Platform, Desktop Terminal Replacement,
  Remote Control PRDs, and `.prd/prd-cli-gui-multi-provider-model-routing.md`

## Purpose

This document is the durable architecture source of truth for the CLI GUI platform.
Feature-level behavior belongs in the referenced MVP SPECs.

## Scope

- shared TypeScript client architecture for browser, Tauri, and remote Web
- local Session Manager and append-only transcript
- Runtime Orchestrator and Agent Backend integration
- application-owned model deployment registry, priority route resolution, and
  auditable execution attempts over official CLI engines
- Tauri desktop host and local TypeScript runtime
- remote Control Server and outbound device connector

## Non-Goals

- replacing official CLI agent loops or directly executing Provider HTTP/SDK APIs
- treating Model Providers as Agent Engines
- duplicating Session or transcript semantics at transport boundaries
- granting remote clients arbitrary shell or filesystem access

## Architecture

```text
Desktop Shell / Remote Shell / Mock Preview
                    |
               ClientRuntime
                    |
       Session / Event / Workspace Ports
                    |
       Local Runtime or Control Server
                    |
             Session Manager
                    |
      Route Resolver / Attempt Coordinator
                    |
          Runtime Orchestrator
                    |
              Agent Backend
                    |
    native-sdk / ACP / JSON stream / PTY
                    |
       Codex / Claude / Kimi / Grok

Model Provider registry is orthogonal:
OpenAI / Anthropic / Moonshot / xAI / GLM / custom
```

### Client

- React 19 + TypeScript strict + Vite 6
- Zustand as the only global state library
- existing semantic design system and EN/ZH i18n
- xterm.js for the in-app fallback Terminal
- react-markdown + GFM for sanitized transcript rendering
- Desktop and Remote may use different Shell layouts but share business modules

### Local Runtime

- Node.js/TypeScript remains the MVP02 Session Manager and Agent Runtime.
- Tauri starts and supervises the packaged local runtime and loads local UI assets.
- Rust owns shell lifecycle and scoped OS integration; it does not duplicate Agent logic.
- Local HTTP/WS remains the first transport between WebView and the TypeScript runtime.

### Execution

- Session Manager owns persistent Session identity and metadata.
- Runtime Orchestrator owns concurrency, process/session handles, cancellation,
  timeout, approval waiting, and lifecycle ordering.
- Route Resolver owns deterministic candidate filtering and configuration
  provenance; it does not launch processes or interpret vendor events.
- Attempt Coordinator owns one immutable execution record per real model run,
  plus the product policy for at most one safe technical fallback.
- Agent Backend owns vendor protocol behavior and creates backend session handles.
- Transport implementations own protocol I/O mechanics.
- Model Provider configuration never shares an enum with Agent Engines.

## Data And Contracts

- `AgentEvent` is the normalized runtime event.
- `TranscriptEvent` is the persisted event envelope with stable ID and sequence.
- `Session.id` is a Product AI OS identity.
- `BackendSessionRef.nativeSessionId` is a vendor identity.
- `ModelDeployment.id` identifies one Provider + Profile/Engine + model target.
- `ExecutionTask` represents one accepted user turn; every real backend invocation
  is a separate `ExecutionAttempt` with a frozen resolved configuration snapshot.
- Client transports and remote envelopes preserve existing Session/event/turn/approval IDs.
- State migrations are versioned, backed up, and non-destructive.

## Operational Constraints

- no external system Terminal is required for the supported daily-use path
- local mode works without network or Control Server
- remote outages never terminate local Agent processes
- high-frequency deltas are buffered and remain outside global state
- all filesystem and Git access remains Workspace-scoped
- Tauri loads local assets and uses least-privilege capabilities

## Feature Spec Mapping

- MVP02 client/runtime/UI/desktop specifications:
  `cli-gui/doc/mvp02/spec/`
- MVP02 remote-control PRD and specifications:
  `cli-gui/doc/mvp02/`
- Multi-provider routing Feature Specs:
  `.features/CLI-GUI-028-secret-store-provider-connections/` through
  `.features/CLI-GUI-032-model-routing-gui/`
- MVP01 baseline contracts:
  `cli-gui/doc/mvp01/spec/`

## Open Questions

- The first ACP vendor implementations require verified command/protocol fixtures.
- Direct Provider HTTP/SDK connectivity remains deferred; CLI-compatible Provider
  credentials use platform credential stores through `CLI-GUI-028`.
