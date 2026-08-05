# Code: Bugrail Bootstrap Handoff

## Meta

- Date: `2026-08-05` (`Asia/Singapore`)
- Coordinator: `pola`
- Primary role: `architecture-agent`
- Specialist responsibilities represented: `spec-editor`, `test-editor`,
  `reviewer`
- Project mode: `GoalSpec`
- Active spec: `BUGRAIL-001` version `1.0` (`active`)
- Product decision: Code: Bugrail is a new product based on the
  `liquiid727/bugrail` fork of `xintaofei/codeg` release `v0.23.2`.
- Release posture: `blocked`; bootstrap implementation and local validation are
  complete, while independent package/release evidence is absent.

## Source And Artifact Matrix

| Layer | Source | Current authority | State |
|---|---|---|---|
| Product decision | User directive, 2026-08-05 | Approved direction only | New Code: Bugrail product, fork/submodule topology, and v0.23.2 baseline approved. |
| Platform design | `design/bugrail-platform-design.md` | Durable product and architecture truth | Accepted for the approved direction; open compatibility decisions remain listed. |
| Roadmap | `.features/roadmap.md` | Phase order and dependency truth | Bootstrap active; UI, runtime, and data phases deferred. |
| Feature Spec | `.features/BUGRAIL-001-fork-bootstrap/spec.md` | GoalSpec implementation source after approval | Draft version `1.0`; no exact-spec approval evidence yet. |
| Test Spec | `.features/BUGRAIL-001-fork-bootstrap/test-spec.md` | Independent verification source after approval | Draft and hash-bound; no independent approval or execution. |
| Fork source | `bugrail/` | Fork repository and product implementation source | Bootstrap changes are active on `feature/bugrail-bootstrap`. |
| Existing product | `cli-gui/` and its GoalSpec chain | Independent legacy/current product truth | Preserved; not a Bugrail implementation source. |
| Results/review/ship | `tests/results/`, `reviews/`, GoalSpec gates | Release evidence only | No BUGRAIL-001 evidence observed or fabricated. |

## Observed Bootstrap Facts

Inspection and implementation on 2026-08-05 established:

| Fact | Observed value | Evidence class |
|---|---|---|
| Parent submodule URL | `https://github.com/liquiid727/bugrail.git` | Repository inspection only |
| Parent gitlink | `159f68e42e6b9d81d9135d47a3879033446b824d` | Repository inspection only |
| Exact local tag at gitlink | `v0.23.2` | Repository inspection only |
| Upstream `v0.23.2` tag target | `159f68e42e6b9d81d9135d47a3879033446b824d` | Read-only `ls-remote` inspection only |
| Fork `origin` | `https://github.com/liquiid727/bugrail.git` | Repository inspection only |
| Fork `upstream` | `https://github.com/xintaofei/codeg.git` | Repository inspection only |
| Root license | Apache License 2.0 text at `bugrail/LICENSE` | File inspection only; package attribution unverified |
| Frontend/Rust package identity | `bugrail`, version `0.23.2`; inherited binary names retained | Implementation plus focused tests |
| Tauri identity | product `Bugrail`, identifier `io.liquiid.bugrail` | Config and Rust manifest consistency test |
| Updater | fork endpoint plus Bugrail-owned signing key; private key stored only in fork Actions secrets | Local config/secret inventory; packaged update unverified |
| Data/protocol identity | Bugrail default roots/keyring; `codeg.db`, CodeG WebSocket/URI/env contracts retained | Implementation, full local tests, and compatibility inventory |
| Web development preview | `127.0.0.1:3011` by default; override with `BUGRAIL_PORT`; assets remain same-origin outside Tauri dev | Unit, production build, and desktop/mobile browser verification |
| Submodule worktree | concurrent modifications are present | Paths are outside this worker's ownership and were left intact; clean-baseline gate not evaluated |

These facts establish provenance and migration risk. They do not establish a
fresh-clone result, clean baseline, test pass, package correctness, or release
readiness.

## Scope Decision

`BUGRAIL-001` owns fork topology, attribution, shell-level identity, independent
bundle/data/keyring/update ownership, product manifests, upstream release-tag
discovery, coexistence rules, and baseline gates. Full UI redesign and inherited
protocol/binary/database migration remain deferred.

| Phase | Decision | Promotion condition |
|---|---|---|
| `BUGRAIL-001` Fork Bootstrap | Active implementation | Complete local gates, independent review, fork commit/push, and parent gitlink verification. |
| `BUGRAIL-002` Full UI Identity And Experience | Deferred | New Feature/Test Specs with complete empty/loading/success/failure UX and i18n scope. |
| `BUGRAIL-003` Runtime And Distribution Compatibility | Deferred | Compatibility plan for inherited binaries, protocols, environment variables, packaging, rollout, and rollback. |
| `BUGRAIL-004` Data Migration And Legacy Interop | Deferred | Backup, migration, idempotency, interruption, coexistence, downgrade, and user-choice contracts. |

## Coexistence Guard

- `cli-gui/` remains a separate Product AI OS surface and keeps its own roadmap,
  design, code, tests, data, and release posture.
- The old `Bugrail` theme reference under
  `.features/product-enhancement-features/spec.md` remains legacy `cli-gui` scope;
  it is not evidence for Code: Bugrail.
- No consolidation, shared database, common updater, or compatibility promise is
  inferred from both products living in the parent repository.

## Evidence Posture

- Frontend lint, 259 test files / 3394 tests, upstream-check unit/live status,
  and a 32-page static production build passed locally.
- Rust desktop/server/MCP check and clippy passed; desktop tests passed with
  2243 passed / 1 ignored and no-default server library tests passed with
  2219 passed / 1 ignored.
- Browser verification passed at desktop 1440x900 and mobile 390x844 on port
  3011: title/H1 matched `Code: Bugrail`, assets loaded from the active origin,
  no horizontal overflow or control overlap was observed, and the unauthenticated
  language-settings fallback no longer opens the Next error overlay.
- Package, fresh-clone, migration, and normalized independent QA gates remain
  pending.
- The Test Spec lists the required commands and evidence normalization contract.
- No BUGRAIL-001 result under `tests/results/`, review approval, gate report, or
  ship record is claimed.
- Current release decision remains `blocked`.

## Handoff

sourceSpec: `.features/BUGRAIL-001-fork-bootstrap/spec.md`
decision: `Implement independent Bugrail bootstrap; defer full UI and compatibility migrations.`
affectedSurfaces: `parent gitlink, Bugrail product source, governance chain, fork release configuration`
preservedSurfaces: `cli-gui/, inherited CodeG protocols/binary names/database filenames, existing evidence`
openQuestions: `compatibility aliases, data coexistence/import strategy, first packaged OS matrix`
nextGate: `independent review -> fork commit and push -> parent gitlink verification`

## Sync Handoff

source_spec_or_rule: `AGENTS.md`, `.rules/project.md`,
`rules/shared/artifact-locations.md`, `rules/testing/production-test-standards.md`,
`rules/ci/spec-release-gates.md`
changed_surface:
  - `design/bugrail-platform-design.md`
  - `.features/BUGRAIL-001-fork-bootstrap/`
  - `.features/roadmap.md`
  - `current/bugrail-bootstrap.md`
neighbor_assets_checked:
  - `.gitmodules` and `bugrail` gitlink: observed concurrent bootstrap input;
    preserved unchanged; concurrent submodule work left intact
  - `bugrail/` package, Tauri, product identity, data roots, updater, transport,
    event, database, license, and agent architecture: inspected and updated
  - `cli-gui/` design/current/spec roadmap: coexistence retained
  - `.features/product-enhancement-features/spec.md`: legacy theme name collision
    recorded without editing the source spec
updated_assets:
  - canonical Bugrail design
  - active Feature/Test Specs
  - active handoff
  - minimal roadmap phase entries
waived_assets:
  - `.prd/`: no new draft created because the user supplied an approved product
    decision and explicitly scoped this worker to governance paths
  - implementation, issues, reviews, and tests/results: outside authorized paths
    and no evidence exists
open_sync_risks:
  - inherited CodeG binary/protocol/environment/database-file identity remains
  - packaged updater and migration behavior are not independently verified
  - independent baseline, packaged, migration, review, and ship evidence is absent
owner_agent: `pola` with `architecture-agent` primary
next_gate: `complete independent review, then push the fork commit and verify the parent gitlink`
