# Build chat-style prompt composer

## Description
Add a reliable multiline composer at the bottom of the center workspace.

## Acceptance Criteria
- [x] Support Enter to submit and Shift+Enter for newline.
- [x] Reject empty input and content above 64 KiB.
- [x] Generate a unique clientMessageId per intentional send.
- [x] Disable duplicate submission while a request is unresolved.
- [x] Support explicit confirmed start-and-send for stopped sessions.
- [x] Disable sending for archived and completed sessions.
- [x] Show saved-but-undelivered errors without silently retrying with a new ID.
- [x] Persist a draft per selected session only in memory unless separately specified.
- [x] Add keyboard, idempotency, state, error, and browser tests.

## Dependencies
Issues #27, #30, #36

## Type
frontend

## Priority
high

## SPEC Reference
SPEC §4.3, §5.4

## Source

- Traceability: .prd/prd-chat-streaming-and-persistent-runtime.md; .features/chat-streaming-and-persistent-runtime/spec.md
