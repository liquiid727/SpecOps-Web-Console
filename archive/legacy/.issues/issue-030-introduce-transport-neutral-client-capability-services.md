# Introduce transport-neutral client capability services

## Description
Move React feature code away from direct fetch and WebSocket usage so the local Web transport can later be replaced by a desktop adapter.

## Acceptance Criteria
- [x] Define typed client contracts for metadata, sessions, transcripts, terminal, picker, files, preview, languages, and Git.
- [x] Implement the local Web HTTP/WebSocket adapter.
- [x] Map structured server errors to typed client errors.
- [x] Support AbortSignal cancellation for stale reads.
- [x] Keep a temporary api.ts compatibility facade while existing components migrate.
- [x] Do not expose browser/native transport details to feature components.
- [x] Add request, 204, error, cancellation, and WebSocket adapter tests.

## Dependencies
Issues #13, #15, #25, #26, #27

## Type
frontend

## Priority
high

## SPEC Reference
SPEC §2.1, §2.3

## Source

- Traceability: legacy/unmapped
