# Implement idempotent composer delivery API

## Description
Provide reliable message delivery from the chat composer to the selected PTY.

## Acceptance Criteria
- [ ] Add POST /api/sessions/:id/messages.
- [ ] Validate organization state and 64 KiB UTF-8 content limit.
- [ ] Use clientMessageId as a per-session idempotency key.
- [ ] Persist the user_input event before PTY write.
- [ ] Support a confirmed start-if-stopped path under the session mutation lock.
- [ ] Write content followed by one carriage return exactly once.
- [ ] Return the original result for duplicate IDs.
- [ ] Represent saved-but-undelivered input with MESSAGE_DELIVERY_FAILED and an error event.

## Dependencies
Issues #18, #23, #26

## Type
backend

## Priority
high

## SPEC Reference
SPEC §4.3, §5.4

## Source
- `tasks/prd-cli-gui-workbench.md`
- `tasks/spec-cli-gui-workbench.md`
