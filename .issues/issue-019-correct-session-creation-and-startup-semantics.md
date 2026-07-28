# Correct session creation and startup semantics

## Description
Make stopped-session creation and confirmed immediate startup explicit and prevent invalid or unconfirmed sessions from being persisted accidentally.

## Acceptance Criteria
- [ ] Validate name, workspace, profile, launch options, and confirmation before persistence.
- [ ] Support creating a stopped session without launch confirmation.
- [ ] Require confirmation when immediate start is requested.
- [ ] Do not persist a session when preflight validation or confirmation fails.
- [ ] Retain a created session in error state when an intentional confirmed spawn fails.
- [ ] Append lifecycle/error information for a post-creation spawn failure when transcripts are available.
- [ ] Return the documented typed response and errors.

## Dependencies
Issue #18

## Type
backend

## Priority
high

## SPEC Reference
SPEC §4.3, §5.3

## Source

- Traceability: legacy/unmapped
