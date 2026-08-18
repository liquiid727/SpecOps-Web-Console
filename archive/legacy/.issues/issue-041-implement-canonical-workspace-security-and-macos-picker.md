# Implement canonical workspace security and macOS picker

## Description
Add canonical workspace roots and a protected macOS-native directory picker for the local Web application.

## Acceptance Criteria
- [x] Validate and store workspace roots with realpath.
- [x] Reject duplicate canonical roots.
- [x] Reject absolute child substitutions, NUL, traversal, and symlink escapes.
- [x] Implement DirectoryPicker with a macOS osascript adapter using fixed application-owned script and shell=false.
- [x] Require approved Origin, CSRF token, and single-use picker intent.
- [x] Allow only one active picker and enforce a 60-second timeout.
- [x] Create no workspace on cancel or timeout.
- [x] Return PICKER_UNAVAILABLE on unsupported platforms so manual entry remains possible.
- [x] Add canonicalization, abuse, duplicate, cancel, timeout, and readonly zero-write tests.

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
