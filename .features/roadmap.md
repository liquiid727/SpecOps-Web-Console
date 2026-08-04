# Spec Roadmap

Use this file as the only canonical index for epic grouping, release sequencing, and feature-spec dependencies.

## SpecOS Platform

### Repository Architecture

- `SPECOS-001 Repository Modularization`

## CLI GUI

### MVP01 — Foundation

- Workspace, Profile, Session, PTY, transcript, Orchestrator, and baseline Chat UI.

### MVP02-A — Desktop Terminal Replacement

- `CLI-GUI-020 ClientRuntime and shared client ports`
- `CLI-GUI-021 Engine readiness and first-task onboarding`
- `CLI-GUI-022 AgentBackend and normalized AgentEvent`
- `CLI-GUI-023 Capability-driven Codex/Claude Chat and Composer`
- `CLI-GUI-024 Approval, recovery, Diff, monitor, and Session management`
- `CLI-GUI-025 Tauri-managed TypeScript runtime sidecar`

### MVP02-B — Model Management

- `CLI-GUI-026 Model Auto-Sync`
- `CLI-GUI-027 Session Model Providers`
- `CLI-GUI-028 Secret Store and Provider Connections`
- `CLI-GUI-029 Model Deployment Registry`
- `CLI-GUI-030 Priority Model Routes and Configuration Resolution`
- `CLI-GUI-031 Execution Attempts and Safe Technical Fallback`
- `CLI-GUI-032 Model Routing GUI and Recovery UX`

### MVP03 — App Replacement

- Official Codex/Claude App-level experience and differentiated task timeline,
  reports, RepoWiki, generated Skills, themes, and deeper product workflows.

## Example Structure

### Risk Platform

#### Foundation

- `RP-001 Event Ingestion`
- `RP-002 Decision API`
- `RP-003 Risk Profile`
- `RP-004 Entity Profile`

#### Rule Engine

- `RP-010 Policy`
- `RP-011 Rule`
- `RP-012 Condition`

#### Admin

- `RP-020 User Risk`
- `RP-021 List Management`

## Release Order

### Release v0.1

1. `RP-001 Event Ingestion`
2. `RP-003 Risk Profile`
3. `RP-002 Decision API`

## Dependency Notes

- `CLI-GUI-027` depends on `CLI-GUI-026`
- `CLI-GUI-028` depends on `CLI-GUI-027`
- `CLI-GUI-029` depends on `CLI-GUI-026` and `CLI-GUI-028`
- `CLI-GUI-030` depends on `CLI-GUI-029`
- `CLI-GUI-031` depends on `CLI-GUI-030`
- `CLI-GUI-032` depends on `CLI-GUI-028` through `CLI-GUI-031`
- `RP-002` depends on `RP-003` and `RP-004`
- `RP-010` depends on `RP-002`
