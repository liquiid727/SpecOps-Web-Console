# Add Open Folder client flow

## Description
Expose native folder selection and manual fallback from session navigation and Settings.

## Acceptance Criteria
- [ ] Add Open Folder actions to the left navigation and workspace Settings category.
- [ ] Call the picker through the client capability contract.
- [ ] Handle selected, duplicate, cancel, timeout, unavailable, forbidden, and readonly outcomes.
- [ ] Focus or select an existing workspace when a duplicate is reported.
- [ ] Retain manual absolute-path entry as fallback.
- [ ] Prevent multiple picker submissions while one is active.
- [ ] Add accessible status and English/Chinese copy.
- [ ] Verify the flow with a deterministic browser test picker adapter.

## Dependencies
Issues #30, #41

## Type
frontend

## Priority
high

## SPEC Reference
PRD US-006; SPEC §4.3

## Source

- Traceability: legacy/unmapped
