---
requirement: R002
spec_package: S05
source_spec: ./spec.md
source_spec_version: 1.0.0
source_spec_hash: 4b48bec2bcf86d651a3db8be4bc96bcde9d1095d1939b714bea2c47644e52565
version: 1.0.0
reviewed_revision: fa7715185b6b0d7c67c1d665e65c4be0dd4fb112
status: open
owner: reviewer
---

# Review — S05 Skills, Agents, and Cleanup

## Findings

### REVIEW-R002-S05-001

- Severity: P1
- Status: open
- Source: active-tree scan
- Covers: SPEC-R002-S05-002, SPEC-R002-S05-003, AC-R002-003
- Owner: qa-agent
- Evidence: ../evidence/artifacts/S05-skills-agents-cleanup.2026-08-30T153310Z.run.json; `docs/workflow.html:247`
- Resolution: Remove the active `note-it` reference and rerun the static workflow-residue scan.

### REVIEW-R002-S05-002

- Severity: P1
- Status: open
- Source: active-tree scan
- Covers: SPEC-R002-S05-003, AC-R002-003
- Owner: qa-agent
- Evidence: ../evidence/artifacts/S05-skills-agents-cleanup.2026-08-30T153310Z.run.json; `packages/core/src/artifacts.ts:2852,4183`; `test-console/app/runs/[runId]/page.tsx:41`
- Resolution: Remove or migrate active `tests/plans` and `tests/results` contracts to child-package evidence paths, then rerun regression tests.

### REVIEW-R002-S05-003

- Severity: P1
- Status: open
- Source: global parity comparison
- Covers: SPEC-R002-S05-004, AC-R002-005
- Owner: qa-agent
- Evidence: ../evidence/artifacts/S05-skills-agents-cleanup.2026-08-30T153310Z.run.json
- Resolution: Align the six differing same-name user-global skills with the repository GoalSpec skills, with explicit approval for any global-file changes.

## Review Gate

- [ ] No blocking finding remains open.
- [ ] Every changed path traces to R002.
- [ ] No compatibility behavior was reintroduced.
