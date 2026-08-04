# CLI GUI MVP02 Foundation Rebaseline

## Meta

- Date: `2026-08-04` (`Asia/Singapore`)
- Coordinator: `pola`
- Primary role: `architecture-agent`
- Supporting roles: `ddd-domain-agent`, `cli-gui-agent`, `ui-design-agent`, `testing-agent`, `test-editor`, `qa-agent`, `reviewer`, `ci-editor`
- Project mode: `GoalSpec`
- Decision: `MVP02-A` is the local desktop foundation; `MVP02-B` is Model Management; Remote Control is deferred.
- Release posture: `blocked` until independent normalized evidence and packaged-host evidence exist.

## Source And Artifact Matrix

| Layer | Current source | Authority in this rebaseline | Observed condition |
|---|---|---|---|
| Product intent | `.prd/prd-chat-streaming-and-persistent-runtime.md`, `.prd/prd-mvp02-model-auto-sync-and-session-providers.md`, `.prd/prd-cli-gui-multi-provider-model-routing.md` | Human-authored intake; requirements are promoted only through `.features/` | Preserve as drafts. The model-routing PRD explicitly places itself after MVP02-A. |
| Platform design | `design/cli-gui-platform-design.md` | One canonical architecture document | Existing document is still draft and did not define the full session, event, packaging, security, or capability-status contract. |
| MVP02-A source specs | `cli-gui/doc/mvp02/spec/` and `cli-gui/doc/mvp02/*prd.md` | Legacy/reference input for new `.features/CLI-GUI-020..025-*` | Useful contracts exist, but they are not in the GoalSpec Feature/Test Spec chain. Do not delete or rewrite them. |
| Verification gate source | `cli-gui/doc/mvp02-check-qa/` | MVP02-A Verification Gate reference and historical evidence | Historical wording called the folder a pre-stage to Remote Control. New index language corrects this without changing signed QA records. |
| Feature Specs | `.features/CLI-GUI-020..025-*` | Current GoalSpec delivery entry | Created by this rebaseline with source links, issue mapping, and explicit status. |
| Issues | `.issues/issue-061..075-*` | Existing implementation and verification issue mapping | Existing issue files remain authoritative for their historical acceptance notes; checkbox state is not used as release proof. |
| Implementation | `implementation/CLI-GUI-020-issue-*.md` through `CLI-GUI-025-issue-*.md` | Historical implementation evidence plus new feature-level handoffs | Code is present for the listed slices, with documented partial and skipped risks. |
| Review | `reviews/CLI-GUI-020-issue-*`, `reviews/CLI-GUI-022-issue-*`, `reviews/CLI-GUI-025-issue-*`, and QA reports | Historical review evidence; new feature-level review entry is a pointer | Review coverage is incomplete at feature level and does not replace independent evidence. |
| Test plan/schedule | `tests/plans/`, `tests/schedules/` | Version-bound execution contract | 026-032 already have plans. 020-025 are added by this rebaseline. |
| Normalized result | `tests/results/` | Only accepted input to test-console and release gates | No complete independent CLI-GUI 020-025 normalized runs exist. New gate reports must remain blocked. |
| Agent registry | `.agents/manifest.yaml`, `.agents/roles/`, `ai/agents/` | Role ownership and prompt assembly source | Existing hierarchy is retained; CLI GUI-specific contracts are added and manifest context is corrected. |

## Scope Resolution

| Name | Meaning after rebaseline | Status |
|---|---|---|
| MVP02-A | Desktop Terminal Replacement: local Runtime, Workspace, Chat, Transcript, Approval, Cancel, Resume, read-only Diff, and Tauri host boundary | Active foundation; not release-ready |
| MVP02-B | Model Management: Provider, Secret, Deployment, Route, and Attempt, covering `CLI-GUI-026..032` | Active next product slice; cannot be promoted by a conditional MVP02-A record alone |
| Remote Control | Future remote device/control capability | Deferred Remote; reference only, no MVP02-B ownership |
| `mvp02-check-qa` | Verification track for MVP02-A local desktop experience and release gate | MVP02-A Verification Gate; not a Remote Control prerequisite |

The original remote PRD, `remote.md`, remote API/architecture/security specs, and historical
QA reports remain preserved. Their current interpretation is `legacy/reference`, not an
active MVP02-B scope.

## Evidence Vocabulary

| State | Minimum proof | What it does not prove |
|---|---|---|
| `implemented` | Code and an implementation handoff identify the behavior and source files | No test correctness, cross-platform behavior, or release readiness |
| `locally-verified` | Implementation-coupled tests and local build/type/UI checks pass | No independent runner, real engine, packaged WebView, or normalized gate result |
| `independently-verified` | `testing-agent` owned execution produces a version-bound normalized result under `tests/results/` with required evidence refs | No real engine or packaged desktop proof unless those are included |
| `real-engine-verified` | Locked Codex/Claude binaries, recorded versions/environment, real process path, and artifact-backed journey evidence | No packaged Tauri/WebView or cross-platform proof |
| `packaged-verified` | Built Tauri artifact launches the packaged sidecar/WebView and proves health, crash recovery, shutdown, origin/capability behavior | No independent business acceptance unless normalized and mapped |
| `release-ready` | Approved Feature/Test Specs, implementation evidence, reviewer findings, independent normalized P0/P1 evidence, required real-engine/packaged evidence, and a `ready` Gate Report | Nothing beyond the declared release scope |

A green Vitest/build/UI command can establish `locally-verified` only. A raw runner log,
implementation note, checkbox, screenshot without requirement mapping, or QA prose cannot
substitute for a normalized independent result.

## Rebaseline Validation Snapshot

Run on `2026-08-04` from the repository root:

| Command | Result | Evidence classification |
|---|---|---|
| `npm --prefix cli-gui run test -- --run` | `57` files passed; `447` passed, `4` skipped | Implementation-coupled local evidence only |
| `npm --prefix cli-gui run build` | passed; Vite emitted existing large-chunk warning | Local build evidence only |
| `npm --prefix cli-gui run ui:check` | passed; 0 errors, 0 warnings | Local governance evidence only |
| `npm --prefix cli-gui run typecheck` | passed | Local type evidence only |
| `npx specos check` | passed; manifest/directories/workflows valid, `31` features | Repository structure evidence only |
| `validate-test-gates CLI-GUI-020..025 --change *-mvp02a-rebaseline` | all `SPECOS_TEST_GATES_BLOCKED` | Gate evidence: missing normalized independent results and required specialist artifacts |

The test run emitted existing React `act(...)` warnings and Node localStorage experimental
warnings. Neither caused a failure, but browser trace/screenshot and performance evidence
remain separate obligations.

## Slice Status

| Slice | Scope and existing implementation evidence | Implemented | Locally verified | Independently verified | Real-engine verified | Packaged verified | Release posture |
|---|---|---:|---:|---:|---:|---:|---|
| `CLI-GUI-020` | ClientRuntime, Mock runtime, PlatformPort; Issues `061`, `063`, `064` | yes | yes | no normalized result | N/A for pure port contract | no | blocked |
| `CLI-GUI-021` | Readiness probes, Chat eligibility, setup-terminal remediation; Issues `065`, `072` | yes | yes | no normalized result | readiness/partial smoke only | no | blocked |
| `CLI-GUI-022` | AgentBackend registry, normalized events, schema v4, native resume; Issues `062`, `070` | yes | yes | no complete normalized result | Codex and Claude first-turn/stream/resume partial evidence exists | no | blocked |
| `CLI-GUI-023` | Chat-first creation, transcript projection, streaming, turn controls; Issues `066`, `067`, `068` | yes | yes | no normalized result | Partial smoke; approval/diff/full cancel/retry journey remains open | no | blocked |
| `CLI-GUI-024` | Monitor, read-only Diff, responsive/a11y/i18n, contract/performance/security, real-engine gate; Issues `069`, `073`, `074`, `075` | yes | yes | no normalized result | Partial; 50k transcript and full journey are open | no | blocked |
| `CLI-GUI-025` | Tauri sidecar supervision, loopback/origin/capability boundary; Issue `071` | partial | yes for Rust/local contracts | no normalized result | N/A | no packaged artifact | blocked |
| `CLI-GUI-026..032` | Model Management Feature/Test Specs, implementation notes, and plans exist | partial | local implementation evidence exists | no complete normalized result | N/A | N/A | blocked by independent gate |
| Remote Control | Remote PRD/specs and typed policy stubs | deferred | N/A | N/A | N/A | N/A | not in MVP02 |

### Specific open proof obligations

- A real ACP transport fixture and protocol acceptance environment are missing. `GenericAcpBackend`
  remains an extension contract/compatibility bridge and must not be advertised as native ACP support.
- `ProfileAgentBackend` remains a migration bridge. The preferred production boundary is
  `AgentBackend.openSession/runTurn`, and fallback use must be observable and classified.
- Tauri packaged sidecar startup, health handshake, crash recovery, shutdown, native capabilities,
  and cross-platform WebView behavior are not proven by Rust unit tests alone.
- The 50k transcript and large-diff performance targets lack browser-backed normalized evidence.
- Approval, diff, cancel, retry, restart, and full real-engine journeys are not all proven by the
  partial Codex/Claude smoke records.
- `tests/results/` lacks complete normalized independent records for CLI-GUI 020-025 and 026-032.

## Missing Or Newly Restored Artifacts

| Artifact | Before rebaseline | Action |
|---|---|---|
| Feature Specs `CLI-GUI-020..025` | Missing from `.features/` | Add current GoalSpec entries, each linked to legacy source and Issues. |
| Independent Test Specs `CLI-GUI-020..025` | Missing from `.features/` | Add version-bound specs with owner/evidence/gate matrix. |
| Issue mapping | Distributed in implementation notes and old docs | Add stable mapping in each Feature Spec and the feature-level handoff. |
| Implementation handoff | Only issue-level notes existed | Add one feature-level handoff per slice; preserve issue notes. |
| Review entry | Feature-level entry incomplete | Add review entry pointers; historical reports remain unchanged. |
| Test Plan and Schedule | No 020-025 plan/schedule | Generate version-bound artifacts under `tests/plans/` and `tests/schedules/`. |
| Normalized independent Result | Missing | Do not fabricate. Testing track must produce it from the approved Test Spec. |
| Gate Report | Missing for 020-025 | Generate blocked reports that name missing normalized evidence and packaged/real-engine gaps. |
| QA acceptance | Historical conditional wording is scope-conflicted | New QA input is the normalized gate plus review; historical report is preserved as reference. |

## Disposition Of Existing Documents

- **Keep as human-authored input:** all `.prd/` files, `cli-gui/doc/mvp02/*prd.md`,
  `cli-gui/doc/mvp02/remote.md`, and research files under `cli-gui/doc/research/`.
- **Keep as historical evidence:** existing `implementation/`, `reviews/`, `.issues/`,
  `mvp02-check-qa/qa-gate.md`, `experience-checklist.md`, and QA issue records.
- **Current normative entry:** new `.features/CLI-GUI-020..025-*` Feature/Test Specs,
  `design/cli-gui-platform-design.md`, `cli-gui/DESIGN.md`, and the generated plans/schedules.
- **Reference/legacy:** `cli-gui/doc/mvp02/spec/remote-*.md`, `remote-prd.md`, and the old
  MVP02 README language that calls Remote Control MVP02-B. They are linked for provenance and
  are not deleted or rewritten.
- **Compatibility bridge:** `ProfileAgentBackend` and `GenericAcpBackend` remain available only
  under explicit bridge/extension status. No placeholder is promoted to a supported native SDK or ACP transport.

## Gate And Handoff Rules

The active flow is:

```text
Feature Spec -> independent Test Spec -> Test Plan -> Schedule -> Test Run
  -> Normalized Result -> Gate Report -> QA Acceptance
```

`implementation-agent` may provide implementation-coupled unit evidence, but `testing-agent`
owns independent execution and normalization. `qa-agent` consumes the resulting evidence and
returns `accepted`, `blocked`, or `accepted-with-waiver`; it does not create test assets or
reinterpret raw runner output.

For this rebaseline, the gate decision is intentionally `blocked` until every P0/P1 required
item has a normalized result, required artifact references, and a valid spec/test-spec binding.
The Tauri packaged and full real-engine gaps are separate blockers for MVP02-A release promotion.

## Sync Handoff

source_spec_or_rule: `AGENTS.md`, `.codex/instructions.md`, `.rules/project.md`, `rules/testing/production-test-standards.md`, `rules/ci/spec-release-gates.md`
changed_surface:
  - `current/`, `design/`, `.features/`, `tests/`, `reviews/`, `implementation/`, `cli-gui/`, `.agents/`, `ai/agents/`
neighbor_assets_checked:
  - `cli-gui/doc/mvp02/` and `cli-gui/doc/mvp02-check-qa/`: legacy source and historical gate semantics reconciled
  - `.features/roadmap.md`: MVP02-B already Model Management; Remote Control restored as deferred
  - `.issues/issue-061..114-*`: implementation and verification ownership mapped
  - `tests/results/`: no CLI-GUI normalized independent result promoted
updated_assets:
  - this rebaseline matrix
  - Feature/Test Specs, plans, schedules, handoffs, review entries, platform/UI/test workflow docs, agent contracts
waived_assets:
  - original PRD, research, QA, and review records: preserved to avoid overwriting human history
open_sync_risks:
  - independent execution, real-engine full journey, packaged Tauri, 50k transcript, and ACP fixture evidence remain open
owner_agent: `pola` with `architecture-agent` primary
next_gate: `testing-agent` independent run -> `reviewer` -> `ci-editor` -> `qa-agent`
