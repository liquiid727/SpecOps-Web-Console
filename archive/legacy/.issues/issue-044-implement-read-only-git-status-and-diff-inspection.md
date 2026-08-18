# Implement read-only Git status and Diff inspection

## Description
Expose bounded repository status and staged/unstaged diff data without any mutation capability.

## Acceptance Criteria
- [x] Run only application-owned allowlisted Git argument arrays with shell=false and canonical workspace cwd.
- [x] Set noninteractive Git environment and command time/output limits.
- [x] Parse porcelain-v2 branch and status data, including rename, conflict, and untracked entries.
- [x] Parse bounded unified staged and unstaged diffs into typed files, hunks, and lines.
- [x] Handle clean, non-Git, missing Git, binary, rename, conflict, timeout, parser failure, and truncation states.
- [x] Do not expose a generic command route or mutation method.
- [x] Cap status to 1 MiB/10,000 entries and diff to 2 MiB/10,000 changed lines.
- [x] Add command-audit and disposable-repository integration tests.

## Dependencies
Issue #41

## Type
backend

## Priority
high

## SPEC Reference
SPEC §4.3, §5.9

## Source

- Traceability: legacy/unmapped
