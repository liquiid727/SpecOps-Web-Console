# Implement idempotent composer delivery API

## Description
Provide reliable message delivery from the chat composer to the selected PTY.

## Acceptance Criteria
- [x] Add POST /api/sessions/:id/messages.
- [x] Validate organization state and 64 KiB UTF-8 content limit.
- [x] Use clientMessageId as a per-session idempotency key.
- [x] Persist the user_input event before PTY write.
- [x] Support a confirmed start-if-stopped path under the session mutation lock.
- [x] Write content followed by one carriage return exactly once.
- [x] Return the original result for duplicate IDs.
- [x] Represent saved-but-undelivered input with MESSAGE_DELIVERY_FAILED and an error event.

## Dependencies
Issues #18, #23, #26

## Type
backend

## Priority
high

## SPEC Reference
SPEC §4.3, §5.4

## Source

- Traceability: .prd/prd-chat-streaming-and-persistent-runtime.md; .features/chat-streaming-and-persistent-runtime/spec.md
