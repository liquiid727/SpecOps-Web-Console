# Add Claude Code Codex and generic profile adapters

## Description
Centralize CLI capability detection, launch-option translation, and conservative structured-output recognition.

## Acceptance Criteria
- [x] Implement claude-code, codex, and generic adapter IDs.
- [x] Detect executable versions using bounded adapter-owned commands and a 2-second timeout.
- [x] Expose supported permission, mode, model, composer, and structured-recognition capabilities.
- [x] Translate supported launch settings without shell interpolation.
- [x] Degrade unknown versions to CLI default and neutral PTY output.
- [x] Do not block raw terminal usage when version detection fails.
- [x] Add supported, unknown, unavailable, and option-translation contract tests.

## Dependencies
Issues #15, #19

## Type
backend

## Priority
high

## SPEC Reference
SPEC §3.3, §5.5

## Source

- Traceability: .prd/prd-chat-streaming-and-persistent-runtime.md; .features/chat-streaming-and-persistent-runtime/spec.md
