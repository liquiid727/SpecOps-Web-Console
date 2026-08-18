# Migrate workspace selection and native capabilities to PlatformPort

## Description
Move workspace selection and desktop-only capabilities behind PlatformPort so UI components do not branch on the current platform.

## Acceptance Criteria
- [x] Tauri uses the native folder picker; browser and remote clients receive explicit supported or unsupported results.
- [x] Recent workspaces reopen through the runtime port without exposing absolute paths across remote boundaries.
- [x] Workspace path and symlink protections continue to use the existing security contract.
- [x] Unsupported actions show a recoverable, translated explanation.
- [x] Browser and Tauri tests cover open-folder success, cancel, and failure behavior.

## Dependencies
Issues #061, #071

## Type
fullstack

## Priority
high

## SPEC Reference
CLI-GUI-020; client-platform PRD CP-003, FR-CP-4/9; desktop PRD TR-002; client-runtime SPEC Section 3; desktop-host SPEC Section 4.

## Validation
- Picker and workspace-security tests in browser and packaged-host fixtures.

## Local Review Status

- Accepted on 2026-07-30: PlatformAdapter (web+tauri) fully implemented with picker success/cancel/failure tests.
- Workspaces load via ClientRuntime.sessions.state() (useAppStore); no direct localStorage for workspace data.
- i18n covers pickerUnavailable/pickerBusy/pickerTimeout/pickerIntentInvalid.
- 50 test files, 388 tests passed.
