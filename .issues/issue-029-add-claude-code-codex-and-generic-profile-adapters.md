# Add Claude Code Codex and generic profile adapters

## Description
Centralize CLI capability detection, launch-option translation, and conservative structured-output recognition.

## Acceptance Criteria
- [ ] Implement claude-code, codex, and generic adapter IDs.
- [ ] Detect executable versions using bounded adapter-owned commands and a 2-second timeout.
- [ ] Expose supported permission, mode, model, composer, and structured-recognition capabilities.
- [ ] Translate supported launch settings without shell interpolation.
- [ ] Degrade unknown versions to CLI default and neutral PTY output.
- [ ] Do not block raw terminal usage when version detection fails.
- [ ] Add supported, unknown, unavailable, and option-translation contract tests.

## Dependencies
Issues #15, #19

## Type
backend

## Priority
high

## SPEC Reference
SPEC §3.3, §5.5

## Source
- `tasks/prd-cli-gui-workbench.md`
- `tasks/spec-cli-gui-workbench.md`
