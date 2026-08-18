# Provide an in-app setup Terminal fallback for Engine recovery

## Description
Keep Terminal as a deliberately scoped setup and compatibility fallback when login or structured execution cannot proceed, rather than the default work surface.

## Acceptance Criteria
- [x] Readiness remediation opens a Terminal bound to a known Engine session or setup purpose.
- [x] The UI explains why Terminal opened and provides a route back to Chat.
- [x] Terminal is not the default center view for a ready structured Codex or Claude Engine.
- [x] Authentication, unsupported transport, and protocol fallback retain typed recovery states.
- [x] Terminal input, resize, and output pass the desktop matrix without exposing arbitrary shell access automatically.

## Dependencies
Issues #065, #071

## Type
fullstack

## Local Review Status

- Accepted on 2026-07-30: engine-readiness remediation kinds include open-setup-terminal.
- App.tsx centerView defaults to quest-home/chat (never terminal for ready engines).
- TitleBar provides terminal view toggle; terminal is an explicit user choice.
- Engine readiness states drive remediation: install-guide, update, retry-probe, open-setup-terminal.
- chatComingSoonHint i18n key explains fallback when CHAT_ENABLED=false.

## Priority
medium

## SPEC Reference
CLI-GUI-021; desktop PRD TR-008, FR-TR-10; desktop-host SPEC Section 5; UI interaction SPEC Sections 2 and 6.

## Validation
- E2E fixtures for authentication-required and structured-transport-unavailable recovery.
