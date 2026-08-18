# Preserve raw Terminal as an alternate center view

## Description
Keep direct xterm interaction available beside the structured transcript without creating duplicate CLI processes.

## Acceptance Criteria
- [x] Add accessible Transcript and Terminal view tabs.
- [x] Move terminal WebSocket access behind TerminalTransport.
- [x] Switching views must not create another PTY.
- [x] Preserve ANSI, keyboard input, Ctrl+C, resize, errors, and session isolation.
- [x] Use stable status callbacks so ordinary App rerenders do not recreate the terminal connection.
- [x] Show explicit status for stopped and unavailable terminal sessions.
- [x] Persist the selected center view per session.
- [x] Add terminal transport, tab, regression, and browser tests.

## Dependencies
Issues #18, #30, #36

## Type
frontend

## Priority
high

## SPEC Reference
SPEC §2.3, §4.4

## Source

- Traceability: legacy/unmapped
