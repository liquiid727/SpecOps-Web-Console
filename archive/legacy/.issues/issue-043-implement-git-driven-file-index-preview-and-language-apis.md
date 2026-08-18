# Implement Git-driven file index Preview and language APIs

## Description
Provide workspace-contained read-only file browsing and language analysis using Git visibility where available.

## Acceptance Criteria
- [x] For Git workspaces, index tracked plus untracked-not-ignored files.
- [x] For non-Git workspaces, apply the documented fixed exclusions.
- [x] Never expose .git internals or follow/list symlinks.
- [x] Page directory entries at 500 and cap depth at 32.
- [x] Read at most 1 MiB for text preview and return typed binary/oversized states.
- [x] Compute language summary under 10,000 files, 250 MiB, or 2 seconds.
- [x] Return explicit partial reasons and visibilitySource.
- [x] Reject every workspace-containment escape attempt.
- [x] Add Git/non-Git, ignored, binary, oversized, partial, traversal, and symlink tests.

## Dependencies
Issue #41

## Type
backend

## Priority
high

## SPEC Reference
SPEC §4.3, §5.7–5.8, §8.2

## Source

- Traceability: legacy/unmapped
