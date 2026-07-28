# Implement append-only transcript repository

## Description
Persist bounded, ordered session events outside aggregate state using per-session JSONL resources.

## Acceptance Criteria
- [ ] Append complete validated JSONL records per session.
- [ ] Allocate monotonic per-session sequence numbers.
- [ ] Support stable event IDs and per-session clientMessageId lookup.
- [ ] Split or explicitly truncate raw payloads above 64 KiB.
- [ ] Page at up to 200 events and 1 MiB serialized response.
- [ ] Recover an incomplete final JSONL line without accepting malformed complete records.
- [ ] Apply the 10 MiB own-event retention policy with a retention marker.
- [ ] Add append, restart, pagination, size, corruption, and retention tests.

## Dependencies
Issues #15, #16

## Type
backend

## Priority
high

## SPEC Reference
SPEC §3.4–3.5, §8.2

## Source
- `tasks/prd-cli-gui-workbench.md`
- `tasks/spec-cli-gui-workbench.md`
