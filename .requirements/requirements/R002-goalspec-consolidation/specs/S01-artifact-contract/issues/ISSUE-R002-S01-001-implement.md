---
id: ISSUE-R002-S01-001
requirement: R002
spec_package: S01
kind: implementation
track: implementation
primary_spec: SPEC-R002-S01-001
source_spec_version: 1.0.0
source_spec_hash: f6c96c872ccd5fc89ce41b978744e99557475a73d4066615364672987a18ef09
status: verified
priority: P0
owner: architecture-agent
depends_on: []
---

# ISSUE-R002-S01-001 — Implement Artifact Contract

## Covers

- REQ-R002-001, REQ-R002-002
- SPEC-R002-S01-001
- SPEC-R002-S01-002
- TEST-R002-S01-001
- TEST-R002-S01-002

## Goal

Deliver the artifact contract portion of the GoalSpec consolidation.

## Must

- Implement only the approved contracts in this child package.
- Add behavior tests at public seams before implementation.
- Store final command output and gate references under ../evidence/.

## Must Not

- Add migration, compatibility aliases, read fallback, or project modes.
- Touch Bugrail or unrelated user changes.
- Weaken tests to make the cutover pass.

## Validation

- [x] TEST-R002-S01-001
- [x] TEST-R002-S01-002
- [x] Existing regression tests
- [x] Static workflow-residue scan

## Completion Record

Status: complete
Implemented By: liquiid
Completed At: 2026-08-30
PR / Commit: bec4ea3b; verification working-tree@85690a48
Changed Files: packages/core/src/artifacts.ts; packages/templates/{fullstack,spec-only}/.specos/manifest.yaml
Tests Executed: npm test; npm run build; GoalSpec template and gate checks
Evidence References: ../evidence/artifacts/S01-artifact-contract.2026-08-30T165500Z.run.json; ../evidence/gates/S01-artifact-contract.R002.gate-report.json
Design Decisions: Keep only schemaVersion, requirementsDir, and templatesDir in the manifest artifact contract; co-locate evidence under each child package.
Tradeoffs: Evidence was recorded against the current working tree because no new commit was created during this closeout.
Spec Deviation: None
Open Questions: None
