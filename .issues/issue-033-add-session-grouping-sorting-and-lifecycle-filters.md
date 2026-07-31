# Add session grouping sorting and lifecycle filters

## Description
Provide Project, Time, Recent, and Manual navigation modes over active, completed, and archived sessions.

## Acceptance Criteria
- [x] Group by workspace in Project mode.
- [x] Use localized Today, Yesterday, Previous 7 Days, and Older buckets in Time mode.
- [x] Sort by lastActiveAt with a stable ID tie-breaker in Recent mode.
- [x] Use pinned and unpinned manualOrder sections in Manual mode.
- [x] Provide Active, Completed, and Archived filters.
- [x] Keep pinned sessions above ordinary groups where applicable.
- [x] Persist grouping and filter preferences.
- [x] Add pure selector, locale, empty-state, and component tests in both languages.

## Dependencies
Issues #21, #22, #30

## Type
frontend

## Priority
high

## SPEC Reference
SPEC §5.6

## Source

- Traceability: legacy/unmapped
