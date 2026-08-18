---
id: BUGRAIL-001
version: "1.0"
title: "BUGRAIL-001 Fork Bootstrap"
status: active
changeType: fork-and-product-bootstrap
design: "design/bugrail-platform-design.md"
decisionSource: "user-approved Code: Bugrail product direction, 2026-08-05"
upstreamRelease: "xintaofei/codeg v0.23.2"
upstreamCommit: "159f68e42e6b9d81d9135d47a3879033446b824d"
fork: "liquiid727/bugrail"
submodulePath: "bugrail"
goals:
  - "Create a reproducible, attributed Code: Bugrail fork baseline through a pinned Git submodule."
  - "Establish independent Bugrail display, bundle, data, credential, signing, and update identity behind product seams."
  - "Automate immutable upstream release-tag discovery without automatic merges."
  - "Keep the existing cli-gui product operationally and evidentially separate."
nonGoals:
  - "Complete the Bugrail UI redesign or rename inherited binary, protocol, database-file, or environment contracts."
  - "Import existing CodeG data or publish a production installer."
  - "Modify parent cli-gui behavior or migrate its data."
  - "Claim release readiness from repository inspection or local tests."
actors:
  - "Bugrail maintainer"
  - "architecture-agent"
  - "implementation-agent"
  - "testing-agent"
  - "qa-agent"
tests:
  requiredBranches:
    - happy
    - error
    - edge
    - limit
    - flow
traceability:
  design: "design/bugrail-platform-design.md"
  roadmap: ".features/roadmap.md"
  current: "current/bugrail-bootstrap.md"
---

# BUGRAIL-001 Fork Bootstrap

## Meta

- Spec ID: `BUGRAIL-001`
- Spec version: `1.0`
- Status: `active`; implementation follows the user-approved fork plan from
  2026-08-05. Release readiness still requires independent verification.
- Epic: `Code: Bugrail / Fork Bootstrap`
- Canonical design: `design/bugrail-platform-design.md`
- Test Spec: `.features/BUGRAIL-001-fork-bootstrap/test-spec.md`
- Source baseline: upstream `xintaofei/codeg` tag `v0.23.2`, commit
  `159f68e42e6b9d81d9135d47a3879033446b824d`
- Fork/submodule: `liquiid727/bugrail` at `bugrail/`

## Goal

Establish Code: Bugrail as a reproducible, legally attributed fork baseline with
an exact parent gitlink, explicit product identity, protected architecture seams,
a release-tag upstream sync process, and blocking verification gates.

## Why This Exists

The parent repository now points at a CodeG fork, but a gitlink alone does not
define a safe independent product. Bugrail needs a visible identity, distinct
bundle/data/credential/update ownership, an immutable upstream intake mechanism,
and explicit boundaries around inherited compatibility identifiers.

## Requirements

| ID | Requirement |
|---|---|
| `BR-001` | The parent records `bugrail/` as a Git submodule pinned to an exact commit in the `liquiid727/bugrail` fork. |
| `BR-002` | The fork records `origin` as `liquiid727/bugrail`, `upstream` as `xintaofei/codeg`, and the baseline as exact tag `v0.23.2` at the stated commit. |
| `BR-003` | `Code: Bugrail` is the canonical display identity and is resolved through frontend and Rust product manifests rather than scattered shell-level literals. |
| `BR-004` | The Tauri bundle identifier, default app-data roots, OS keyring service, GitHub release endpoint, updater signing key, and package metadata are Bugrail-owned and do not consume upstream CodeG identity. |
| `BR-005` | Apache-2.0 license, applicable notices, upstream attribution, and modification notices remain present in source and distributions. |
| `BR-006` | Upstream intake selects immutable release tags, records peeled commits, detects moved tags, opens a sync issue for newer releases, and never merges automatically. |
| `BR-007` | `cli-gui/` remains an independent product with no shared code, data, updater, ports, process identity, or release evidence in this feature. |
| `BR-008` | Product changes remain localized behind product manifests while inherited workbench, event, agent runtime, transport, and persistence contracts remain intact. |
| `BR-009` | Frontend, Rust desktop/server/MCP, compatibility, legal, and fresh-checkout gates are specified; full UI redesign and compatibility migrations remain deferred. |

## Out Of Scope

- Full replacement of visible Codeg UI strings, icons, layouts, or user flows.
- Renaming inherited binary names, URL schemes, WebSocket protocols,
  environment variables, database filenames, or migration history.
- Migrating, importing, deleting, or sharing Codeg or `cli-gui/` user data.
- Shipping a branded Bugrail binary.
- Creating normalized release evidence or claiming production readiness from
  local bootstrap validation alone.

## Deliverables

- Canonical Bugrail platform design with product, legal, coexistence, sync, and
  deep-module contracts.
- Pinned fork/submodule topology at the approved `v0.23.2` baseline.
- Versioned Feature/Test Spec pair for independent bootstrap verification.
- Active handoff that separates observed facts from missing evidence.
- Minimal roadmap entries for bootstrap and the three deferred migration phases.
- Frontend and Rust product manifests for visible identity and external ownership.
- Independent Tauri bundle/update signing identity and Bugrail default data roots.
- A tested upstream-release checker and scheduled fork workflow.

## Domain

- **Upstream Release**: an immutable Codeg release tag and its resolved commit.
- **Fork Baseline**: the Bugrail commit integrating one declared upstream release.
- **Parent Gitlink**: the exact fork commit selected by this repository.
- **Product Identity**: user-visible Code: Bugrail naming and product-owned release
  metadata.
- **Compatibility Identity**: identifiers whose rename can affect clients,
  installers, protocols, updates, or stored data.
- **Provenance Identity**: Codeg names retained for legal and historical truth.
- **Sync Change**: one reviewed integration from a newer upstream release tag into
  the fork, followed by a separately reviewed parent gitlink update.

## Application

The shell-level display name, document titles, startup label, notification titles,
package metadata, Tauri bundle identity, default data roots, keyring service, and
update channel become Bugrail-owned. Existing workbench behavior, command/API
shapes, ACP runtime behavior, and compatibility protocols remain inherited.

## Repository

- Parent repository owns `.gitmodules`, the `bugrail` gitlink, and GoalSpec
  governance artifacts.
- Fork repository owns all Bugrail source, product commits, tags, tests, and
  release artifacts.
- Fork changes land and validate before the parent advances its gitlink.
- The existing `cli-gui/` tree and its GoalSpec chain are unchanged.

## API

No external API is added or changed. Existing `codeg` HTTP paths, WebSocket
subprotocols, URL schemes, command names, and event identifiers remain
compatibility identities until `BUGRAIL-003` defines aliases, errors, rollout,
and rollback.

Sync automation must fail closed with stable outcome
classes for provenance mismatch, dirty checkout, missing license/notice,
protected-identity conflict, migration-plan requirement, and failed validation.

## Database Impact

No schema or database filename change. New default desktop/server roots are
Bugrail-owned (`.bugrail`, platform `bugrail`, fallback `.bugrail-data`), so a new
Bugrail install does not silently open CodeG's default store. Explicit legacy
`CODEG_HOME` / `CODEG_DATA_DIR` overrides remain compatibility inputs. Importing
or moving an existing CodeG store is deferred to `BUGRAIL-004`.

## Baseline Gate Contract

The verification track must record, at minimum:

| Gate | Required proof | Release impact |
|---|---|---|
| Provenance | Fresh recursive checkout; exact parent gitlink, fork origin, upstream remote, tag, and commit mapping. | Blocking |
| Legal | Root Apache-2.0 license, applicable notices, source attribution, and packaged attribution inventory. | Blocking |
| Frontend | Frozen dependency install, lint, Vitest, and static production build against one recorded environment. | Blocking |
| Desktop Rust | `cargo check`, test-utils tests, and all-target clippy with warnings denied. | Blocking |
| Server/MCP Rust | No-default-feature checks/tests/clippy for supported server and MCP binaries. | Blocking |
| Compatibility inventory | Product/package, binary, Tauri, updater, protocol, environment, database, and data-path identities classified before rename. | Blocking |
| Coexistence | No behavior or evidence changes under `cli-gui/`; no shared runtime or data ownership introduced. | Blocking |
| Independent evidence | Version-bound P0/P1 results normalized under `tests/results/` and consumed by review/ship gates. | Blocking |

No gate is marked passed in this Feature Spec.

## Test Plan

- Bind the independent Test Spec to the exact hash of this version.
- Verify fresh clone and recursive submodule initialization at the pinned commit.
- Verify fork/upstream remote and exact-tag provenance without relying on a moving
  branch.
- Verify product-owned identity changed consistently and protected compatibility
  identifiers remain unchanged.
- Verify legal files and attribution requirements for source and candidate package
  outputs.
- Run the declared frontend and Rust command matrix in the fork and retain raw
  outputs as evidence inputs.
- Verify no parent `cli-gui/` file, data contract, or release evidence changed.
- Normalize independent blocking results before requesting review or ship.

## Deferred Phases

- `BUGRAIL-002`: full UI layout, styling, identity coverage, and product
  experience, including empty,
  loading, success, and failure states.
- `BUGRAIL-003`: inherited binary, protocol, environment, packaging, and
  distribution compatibility with rollout and rollback.
- `BUGRAIL-004`: explicit CodeG/approved legacy data import, migration,
  coexistence, and downgrade behavior.

These are roadmap placeholders, not approved implementation scope.

## Definition Of Done

- [x] User-approved implementation direction is recorded for this Feature Spec.
- [ ] Test Spec is independently approved and bound to this Feature Spec hash.
- [ ] Parent gitlink and fork/upstream/tag identities satisfy `BR-001` and
  `BR-002` in a fresh checkout.
- [ ] Legal and attribution review satisfies `BR-004` for source and intended
  distribution form.
- [ ] All blocking baseline gates have raw output and normalized result evidence.
- [ ] Product and compatibility identity changes pass independent review.
- [ ] `cli-gui/` coexistence remains intact.
- [ ] Review and ship gates reference `BUGRAIL-001` version `1.0` and report
  `ready`; otherwise release posture remains `blocked`.

## Assumptions And Open Questions

- Decision: application identifier is `io.liquiid.bugrail`; updater releases are
  hosted by `liquiid727/bugrail` and signed by a Bugrail-owned key.
- Open: first packaged OS matrix and compatibility strategy for inherited CodeG
  binaries, protocols, environment variables, database filenames, and data import.
