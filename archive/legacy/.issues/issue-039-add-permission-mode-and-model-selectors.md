# Add permission mode and model selectors

## Description
Expose profile-driven launch controls in the composer and persist their semantic session configuration.

## Acceptance Criteria
- [x] Show permission, mode, and model selectors with CLI default.
- [x] Load options from the selected profile adapter capabilities.
- [x] Disable unsupported controls with an explanation.
- [x] Persist changes through optimistic session metadata updates.
- [x] Label values that apply on next start or Fork.
- [x] Do not claim a live update when the adapter cannot apply it.
- [x] Degrade unknown CLI versions to CLI default.
- [x] Add Claude Code, Codex, generic, conflict, English/Chinese, and browser tests.

## Dependencies
Issues #20, #29, #38

## Type
fullstack

## Priority
high

## SPEC Reference
SPEC §3.3, §5.5

## Source

- Traceability: .prd/prd-chat-streaming-and-persistent-runtime.md; .features/chat-streaming-and-persistent-runtime/spec.md
