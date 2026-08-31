---
id: ISSUE-R002-S02-001
requirement: R002
spec_package: S02
kind: implementation
track: implementation
primary_spec: SPEC-R002-S02-001
source_spec_version: 1.0.0
source_spec_hash: 3829f6b78dd9bf9d888e8c8ccd86e78bf2685667fc329b55e834dbd3e32787eb
status: verified
priority: P0
owner: implementation-agent
depends_on: []
---

# ISSUE-R002-S02-001 — Implement GoalSpec CLI

## Covers

- REQ-R002-003
- SPEC-R002-S02-001, SPEC-R002-S02-002, SPEC-R002-S02-003
- TEST-R002-S02-001, TEST-R002-S02-002, TEST-R002-S02-003

## Goal

Restore a usable `specos` CLI whose initialization, intake, selection, gate,
and entrypoint resolution behavior is exclusively GoalSpec-native.

## Must

- Generate and validate only `.requirements/requirements/R0NN-<slug>/` workspaces.
- Require `--id`, `--slug`, and `--request` for intake.
- Resolve child packages from canonical `RNNN-slug/SNN-slug` selectors or package paths.
- Keep gate reports under the selected child package `evidence/gates/`.

## Must Not

- Reintroduce mode selectors, overlays, flat-layout aliases, or fallback reads.
- Add a second artifact root or write outside the selected package evidence directory.
- Touch Bugrail or unrelated repositories.

## Validation

- [x] TEST-R002-S02-001
- [x] TEST-R002-S02-002
- [x] TEST-R002-S02-003
- [x] Existing regression tests
- [x] Static GoalSpec path checks

## Completion Record

Status: complete
Implemented By: liquiid
Completed At: 2026-08-30
PR / Commit: b15c17b2 (local delivery)
Changed Files: packages/cli; packages/templates/{fullstack,spec-only}/.specos/manifest.yaml; package-lock.json
Tests Executed: npm test; npm run build; npm test --workspace @specos/cli; `npx --no-install specos check`
Evidence References: ../evidence/artifacts/S02-cli.2026-08-30T165500Z.run.json; ../evidence/gates/S02-cli.R002.gate-report.json
Design Decisions: Keep the CLI small and explicit at its public seams; all path selectors are parsed and validated before filesystem access.
Tradeoffs: No compatibility aliases were retained, so old flat selectors fail visibly as required by BR-R002-001.
Spec Deviation: None
Open Questions: None
