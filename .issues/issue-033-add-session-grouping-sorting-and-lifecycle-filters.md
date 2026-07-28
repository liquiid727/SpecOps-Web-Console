# Add session grouping sorting and lifecycle filters

## Description
Provide Project, Time, Recent, and Manual navigation modes over active, completed, and archived sessions.

## Acceptance Criteria
- [ ] Group by workspace in Project mode.
- [ ] Use localized Today, Yesterday, Previous 7 Days, and Older buckets in Time mode.
- [ ] Sort by lastActiveAt with a stable ID tie-breaker in Recent mode.
- [ ] Use pinned and unpinned manualOrder sections in Manual mode.
- [ ] Provide Active, Completed, and Archived filters.
- [ ] Keep pinned sessions above ordinary groups where applicable.
- [ ] Persist grouping and filter preferences.
- [ ] Add pure selector, locale, empty-state, and component tests in both languages.

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
