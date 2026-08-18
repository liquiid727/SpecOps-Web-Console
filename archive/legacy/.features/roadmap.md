# Spec Roadmap

Use this file as the only canonical index for epic grouping, release sequencing, and feature-spec dependencies.

## SpecOS Platform

### Repository Architecture

- `SPECOS-001 Repository Modularization`

## Code: Bugrail

### Fork Bootstrap

- `BUGRAIL-001 Fork Bootstrap` - active implementation for the pinned
  `liquiid727/bugrail` submodule fork of `xintaofei/codeg` `v0.23.2`, including
  product manifests, independent bundle/data/keyring/update identity, and
  immutable upstream release discovery; release remains blocked pending full
  validation and independent evidence.

### Deferred Product Migration

- `BUGRAIL-002 Full UI Identity And Experience` - deferred; no active Feature
  Spec.
- `BUGRAIL-003 Runtime And Distribution Compatibility` - deferred; no active
  Feature Spec.
- `BUGRAIL-004 Data Migration And Legacy Interop` - deferred; no active Feature
  Spec for importing or coexisting with existing CodeG/legacy data.

The existing `cli-gui/` product coexists independently. Its legacy `Bugrail`
theme does not define Code: Bugrail product scope or evidence.

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

The current GoalSpec Feature/Test Spec entries for MVP02-A live under
`.features/CLI-GUI-020..025-*`. Their source contracts remain in
`cli-gui/doc/mvp02/spec/`, and their implementation issues are the existing
`.issues/issue-061..075-*` files. MVP02-A is not release-ready until independent
normalized evidence and the packaged-host gate are present.

### MVP02-B — Model Management

- `CLI-GUI-026 Model Auto-Sync`
- `CLI-GUI-027 Session Model Providers`
- `CLI-GUI-028 Secret Store and Provider Connections`
- `CLI-GUI-029 Model Deployment Registry`
- `CLI-GUI-030 Priority Model Routes and Configuration Resolution`
- `CLI-GUI-031 Execution Attempts and Safe Technical Fallback`
- `CLI-GUI-032 Model Routing GUI and Recovery UX`

Remote Control does not occupy MVP02-B. It is `Deferred Remote` and remains a
reference-only product direction until a later roadmap entry explicitly promotes
it. `cli-gui/doc/mvp02-check-qa/` is the `MVP02-A Verification Gate`, not a
Remote Control pre-stage.

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

- `BUGRAIL-002` depends on `BUGRAIL-001`
- `BUGRAIL-003` depends on `BUGRAIL-001` and the accepted product-identity outputs
  from `BUGRAIL-002`
- `BUGRAIL-004` depends on `BUGRAIL-003`
- `CLI-GUI-027` depends on `CLI-GUI-026`
- `CLI-GUI-028` depends on `CLI-GUI-027`
- `CLI-GUI-029` depends on `CLI-GUI-026` and `CLI-GUI-028`
- `CLI-GUI-030` depends on `CLI-GUI-029`
- `CLI-GUI-031` depends on `CLI-GUI-030`
- `CLI-GUI-032` depends on `CLI-GUI-028` through `CLI-GUI-031`
- `RP-002` depends on `RP-003` and `RP-004`
- `RP-010` depends on `RP-002`
