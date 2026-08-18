---
requirement: R001
source_prd: ./prd.md
status: approved
---

# Spec — Requirement Package Explorer

## 0. Traceability

| Feature | PRD Requirements | Spec IDs |
|---|---|---|
| F01 | REQ-R001-001, REQ-R001-002, REQ-R001-003, REQ-R001-004 | SPEC-R001-F01-001, SPEC-R001-F01-002, SPEC-R001-F01-003 |

# F01 — Requirement Package Reader

## SPEC-R001-F01-001 Discover active packages

Implements:
- REQ-R001-001

### Preconditions
- Repository root contains `.requirements/requirements/` or the directory is absent.

### Scenario

Given:
- The directory contains zero or more `R0NN-<slug>` subdirectories.

When:
- The user opens `/requirements`.

Then:
- The system lists only matching subdirectories in stable ID order.
- Examples and templates are excluded.
- An absent or empty directory renders an explicit empty state.

### Error Semantics
- An unreadable package document produces a missing-file state for that package; it does not fail the complete list.

### Acceptance Mapping
- AC-R001-001
- AC-R001-003

## SPEC-R001-F01-002 Read package files and derive status

Implements:
- REQ-R001-002
- REQ-R001-003

### Scenario

Given:
- A matching package directory.

When:
- The reader loads the four canonical Markdown files.

Then:
- It parses frontmatter for package metadata.
- It records file presence, REQ / SPEC / TEST / ISSUE ID counts, and Issue `Status:` completion counts.
- Any missing file blocks package completeness.
- Feature Verify is pass only when all Issues are done and the package status is done.

### Data Semantics
- Parsed data is derived per request and is not persisted.

### Acceptance Mapping
- AC-R001-002

## SPEC-R001-F01-003 Render read-only package detail

Implements:
- REQ-R001-004

### Scenario

Given:
- A valid Requirement Package route.

When:
- The user opens the package or one of its document routes.

Then:
- The system displays package metadata, gates, source content and traceability table.
- A non-existent package renders an unavailable state.

### Authorization
- Read-only access; no mutation controls are exposed.

### Acceptance Mapping
- AC-R001-001
- AC-R001-002
