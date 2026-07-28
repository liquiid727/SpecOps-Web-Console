# Build chat-style prompt composer

## Description
Add a reliable multiline composer at the bottom of the center workspace.

## Acceptance Criteria
- [ ] Support Enter to submit and Shift+Enter for newline.
- [ ] Reject empty input and content above 64 KiB.
- [ ] Generate a unique clientMessageId per intentional send.
- [ ] Disable duplicate submission while a request is unresolved.
- [ ] Support explicit confirmed start-and-send for stopped sessions.
- [ ] Disable sending for archived and completed sessions.
- [ ] Show saved-but-undelivered errors without silently retrying with a new ID.
- [ ] Persist a draft per selected session only in memory unless separately specified.
- [ ] Add keyboard, idempotency, state, error, and browser tests.

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
