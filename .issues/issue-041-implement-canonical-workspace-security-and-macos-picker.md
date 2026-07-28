# Implement canonical workspace security and macOS picker

## Description
Add canonical workspace roots and a protected macOS-native directory picker for the local Web application.

## Acceptance Criteria
- [ ] Validate and store workspace roots with realpath.
- [ ] Reject duplicate canonical roots.
- [ ] Reject absolute child substitutions, NUL, traversal, and symlink escapes.
- [ ] Implement DirectoryPicker with a macOS osascript adapter using fixed application-owned script and shell=false.
- [ ] Require approved Origin, CSRF token, and single-use picker intent.
- [ ] Allow only one active picker and enforce a 60-second timeout.
- [ ] Create no workspace on cancel or timeout.
- [ ] Return PICKER_UNAVAILABLE on unsupported platforms so manual entry remains possible.
- [ ] Add canonicalization, abuse, duplicate, cancel, timeout, and readonly zero-write tests.

## Dependencies
Issues #14, #16

## Type
backend

## Priority
high

## SPEC Reference
SPEC §4.3, §5.8, §7

## Source

- Traceability: legacy/unmapped
