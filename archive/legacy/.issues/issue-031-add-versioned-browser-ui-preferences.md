# Add versioned browser UI preferences

## Description
Persist presentation-only workbench preferences without storing local project or transcript data in the browser.

## Acceptance Criteria
- [x] Use product-ai-os-cli-gui-ui-preferences-v1.
- [x] Persist navigator and inspector visibility, grouping, organization filter, inspector tab, and per-session center view.
- [x] Validate the preference version and field values before use.
- [x] Reset invalid or unknown-version data to defaults.
- [x] Never store workspace paths, transcript content, or semantic launch configuration.
- [x] Add preference load, save, migration-reset, and corruption tests.

## Dependencies
Issue #30

## Type
frontend

## Priority
medium

## SPEC Reference
SPEC §3.6

## Source

- Traceability: legacy/unmapped
