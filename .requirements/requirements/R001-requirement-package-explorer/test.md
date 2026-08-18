---
requirement: R001
source_prd: ./prd.md
source_spec: ./spec.md
status: approved
---

# Spec-Test — Requirement Package Explorer

## 0. Coverage Matrix

| Requirement | Spec | Test | Level | Status |
|---|---|---|---|---|
| REQ-R001-001 | SPEC-R001-F01-001 | TEST-R001-F01-001 | Unit + Route | PASS |
| REQ-R001-002 | SPEC-R001-F01-002 | TEST-R001-F01-002 | Unit + UI | PASS |
| REQ-R001-003 | SPEC-R001-F01-002 | TEST-R001-F01-002 | Unit | PASS |
| REQ-R001-004 | SPEC-R001-F01-003 | TEST-R001-F01-003 | UI + Build | PASS |

# F01 — Requirement Package Reader

## TEST-R001-F01-001 Active package discovery

Covers:
- REQ-R001-001
- SPEC-R001-F01-001
- AC-R001-001
- AC-R001-003

Given:
- Zero matching package directories or one valid package fixture.

When:
- The package reader and list page run.

Then:
- Only active package IDs are returned.
- The no-package route shows an explicit empty state.

Evidence:
- `spec-web-ui/tests/requirements.test.ts`
- `spec-web-ui/tests/requirements-ui.test.tsx`

## TEST-R001-F01-002 Missing files and derived gates

Covers:
- REQ-R001-002
- REQ-R001-003
- INV-R001-001
- INV-R001-002
- INV-R001-003

Given:
- Complete and incomplete package fixtures.

When:
- The reader derives file states, ID counts, Issue counts and gates.

Then:
- Missing files block the package.
- Complete files do not automatically pass Feature Verify.
- No persistent copy is created.

## TEST-R001-F01-003 Detail routes and production build

Covers:
- REQ-R001-004
- SPEC-R001-F01-003
- EDGE-R001-003

Given:
- A loaded package fixture and an invalid route.

When:
- The detail component and production build run.

Then:
- Source view, document links, gates and traceability render.
- The route set compiles with Next.js.

## QA Checklist

- [x] Happy Path
- [x] Error / Empty State
- [x] Failure Recovery
- [x] Refresh / Re-entry
- [ ] Browser visual verification

## Exit Criteria

- [x] All P0/P1 REQ have automated coverage
- [x] Missing-file and no-package states are covered
- [x] Production build passes
- [ ] Browser visual verification completed
