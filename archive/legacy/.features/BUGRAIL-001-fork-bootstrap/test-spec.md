---
testSpecId: "BUGRAIL-001.test-spec"
testSpecVersion: "1.0"
status: active
sourceSpec: ".features/BUGRAIL-001-fork-bootstrap/spec.md"
sourceSpecId: "BUGRAIL-001"
sourceSpecVersion: "1.0"
sourceSpecHash: "4d88b38688fb8fd4b2fc120a6f5fd7d09e9b08d7fcad206541915910872b4fc9"
sourceApprovalEvidence: "user-approved-plan-2026-08-05"
testSpecApprovalEvidence: "pending-independent-review"
standardVersion: "specos-test-standard/v1"
qualityProfile: "fullstack-flow"
riskTier: "P0"
---

# Independent Test Spec: BUGRAIL-001 Fork Bootstrap

This Test Spec defines independent verification for the active fork and product
bootstrap. Command execution by the implementation agent is development evidence,
not normalized release evidence or independent QA approval.

Traceability inputs:

- `.features/BUGRAIL-001-fork-bootstrap/spec.md`
- `design/bugrail-platform-design.md`
- `.features/roadmap.md`
- `current/bugrail-bootstrap.md`
- `rules/testing/production-test-standards.md`
- `rules/ci/spec-release-gates.md`

## Coverage Matrix

| Requirement | Branches | Owner | Required evidence | Gate |
|---|---|---|---|---|
| `BR-001` pinned parent gitlink | happy, error, edge | `test-editor` | trace, raw-report | blocking |
| `BR-002` fork/upstream/tag provenance | happy, error, edge | `specialized-check-agent` | trace, raw-report | blocking |
| `BR-003` product and compatibility identity classification | happy, edge, flow | `reviewer` | trace, inventory | blocking |
| `BR-004` independent bundle/data/keyring/update ownership | happy, error, edge, flow | `testing-agent` | tests, config trace, secret inventory | blocking |
| `BR-005` Apache-2.0 and attribution | happy, error, flow | `reviewer` | trace, packaged-artifact inventory | blocking |
| `BR-006` release-tag sync workflow | happy, error, concurrency, flow | `specialized-check-agent` | tests, trace, raw-report | blocking |
| `BR-007` `cli-gui` coexistence | happy, edge | `test-editor` | trace, changed-path report | blocking |
| `BR-008` product seams and compatibility preservation | edge, flow | `reviewer` | tests, architecture trace | blocking |
| `BR-009` baseline command matrix and deferred migrations | happy, error, limit | `testing-agent` | trace, raw-report, normalized result | blocking |

## Scenarios

### Provenance And Checkout

- Happy: a fresh parent clone with recursive submodules resolves `bugrail/` to
  `159f68e42e6b9d81d9135d47a3879033446b824d`, exactly tagged `v0.23.2`.
- Error: missing submodule initialization, a different gitlink, absent fork
  remote, absent upstream remote, or a tag resolving to another commit blocks.
- Edge: `.gitmodules` may name `main`, but verification uses the exact gitlink and
  must not pass because a moving branch currently points to the same commit.

### Identity And Legal

- Happy: product-facing Bugrail identity, retained compatibility identifiers, and
  Codeg provenance are separately inventoried; root Apache-2.0 text and required
  attribution are present in intended source and package outputs.
- Error: missing license, removed notice/header, misleading upstream attribution,
  or a branded package still consuming the upstream updater endpoint blocks.
- Edge: historical comments, migrations, protocol fixtures, and attribution may
  legitimately retain Codeg. A blanket zero-match assertion is prohibited.
- Flow: frontend and Rust product manifests agree with document titles, Tauri
  bundle configuration, updater endpoint/key, default data roots, and keyring
  ownership.

### Upstream Sync

- Happy: one immutable upstream release tag is integrated on a fork branch, gate
  results are attached, and only then is the parent gitlink advanced.
- Error: moving references, changed tag targets, dirty worktrees, unresolved
  conflicts, failed gates, or unreviewed license/migration deltas stop the sync.
- Concurrency: two attempted syncs cannot advance the same fork baseline or parent
  gitlink independently; serialize or reject the stale attempt.
- Edge: an annotated release tag is peeled to its commit; a same-name tag that
  resolves to a different commit is reported as `tag-moved` and blocks.

### Coexistence And Deferral

- Happy: bootstrap changes the authorized Bugrail submodule and governance chain;
  `cli-gui/` code, data, and evidence remain unchanged.
- Edge: the old `cli-gui` Bugrail theme reference is preserved as legacy product
  scope and is not treated as Code: Bugrail implementation evidence.
- Error: full UI redesign, inherited binary/protocol/environment/database rename,
  or legacy data import without the corresponding deferred Feature/Test Spec
  blocks promotion.

## Fixtures And Seams

- A temporary fresh clone of the parent repository with recursive submodules.
- Read-only git fixtures for exact tag, detached gitlink, missing remote, changed
  tag target, dirty fork, and merge conflict outcomes.
- Product-identity inventory covering Next.js, Tauri, Cargo/binaries, updater,
  WebSocket/URI/environment identifiers, database filenames, and attribution.
- GitHub API fixtures for lightweight/annotated tags, moved tags, older releases,
  current release, and newer releases.
- Existing Tauri/Axum transport, Tauri/WebSocket/internal event, ACP/CLI runtime,
  and SQLite test adapters are the seam-level test surfaces.
- A package-output fixture is required before legal packaging can pass; source
  file presence alone is insufficient for binary distribution acceptance.

## Command Matrix

Commands below are required execution inputs, not evidence of a run in this
artifact change.

### Parent Provenance

```bash
git submodule update --init --recursive bugrail
git submodule status -- bugrail
git -C bugrail rev-parse HEAD
git -C bugrail describe --exact-match --tags HEAD
git -C bugrail remote get-url origin
git -C bugrail remote get-url upstream
git -C bugrail status --porcelain=v1
```

### Legal And Identity Inventory

```bash
test -f bugrail/LICENSE
rg -n "Apache License|Codeg|codeg|CODEG|productName|identifier|updater|codeg\.db|codeg://" bugrail
```

Review the results by identity class; raw match count is not a pass/fail signal.

### Frontend

```bash
pnpm --dir bugrail install --frozen-lockfile
pnpm --dir bugrail lint
pnpm --dir bugrail test
pnpm --dir bugrail test:upstream-check
pnpm --dir bugrail upstream:status
pnpm --dir bugrail build
```

### Rust Desktop

```bash
cargo check --manifest-path bugrail/src-tauri/Cargo.toml
cargo test --manifest-path bugrail/src-tauri/Cargo.toml --features test-utils
cargo clippy --manifest-path bugrail/src-tauri/Cargo.toml --all-targets --features test-utils -- -D warnings
```

### Rust Server And MCP

```bash
cargo check --manifest-path bugrail/src-tauri/Cargo.toml --no-default-features --bin codeg-server
cargo test --manifest-path bugrail/src-tauri/Cargo.toml --no-default-features --bin codeg-server --lib
cargo clippy --manifest-path bugrail/src-tauri/Cargo.toml --no-default-features --bin codeg-server --lib -- -D warnings
cargo check --manifest-path bugrail/src-tauri/Cargo.toml --no-default-features --bin codeg-mcp
cargo clippy --manifest-path bugrail/src-tauri/Cargo.toml --no-default-features --bin codeg-mcp -- -D warnings
```

### Parent Artifact Consistency

```bash
shasum -a 256 .features/BUGRAIL-001-fork-bootstrap/spec.md
git diff --check -- design/bugrail-platform-design.md .features/BUGRAIL-001-fork-bootstrap current/bugrail-bootstrap.md .features/roadmap.md
npx specos check
```

## Evidence And Normalization

- Record environment, OS, Node, pnpm, Rust, Cargo, Tauri, commit, tag, and parent
  gitlink metadata with each run.
- Retain raw stdout/stderr and package inventory references.
- Normalize P0/P1 results under `tests/results/` with `requirementId`,
  `ownerAgent`, `evidenceQuality`, `attempts`, `flakeClassification`, and
  `artifactRefs`.
- A partial frontend or Rust run cannot satisfy the bootstrap gate.
- Performance/load evidence is not required because the behavior change is
  identity/configuration-only and does not alter workbench execution paths.
- Missing, stale, unapproved, or version-mismatched evidence keeps the gate
  `blocked`.

## Acceptance

- The Feature Spec hash equals the front matter value above.
- Every `BR-001..009` requirement has independent evidence of the required type.
- Legal and compatibility inventories are reviewed, not inferred from search.
- No deferred full UI, protocol, binary, database-file, or legacy-import behavior
  is promoted into bootstrap.
- `qa-agent` may recommend promotion only after a passing review and ship gate
  consume normalized evidence for `BUGRAIL-001` version `1.0`.
