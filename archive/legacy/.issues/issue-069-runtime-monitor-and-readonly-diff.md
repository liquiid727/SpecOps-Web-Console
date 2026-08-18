# Complete data-backed runtime monitor and read-only Diff inspection

## Description
Provide the runtime monitor and scoped read-only file and Git inspection needed to review Agent work without opening a system terminal.

## Acceptance Criteria
- [x] Summary, Progress, Artifacts, Files, Diff, and advanced Terminal tabs display only data-backed content.
- [x] File trees, previews, Git status, and staged/unstaged Diff remain scoped to the active Workspace.
- [x] Large, binary, non-Git, timeout, and partial-result states are explicit and recoverable.
- [x] No monitor surface can stage, discard, edit, or otherwise mutate Git or Workspace state.
- [x] Completion, failure, and approval wait can trigger a desktop notification where supported.

## Dependencies
Issues #061, #062, #064, #067

## Type
fullstack

## Local Review Status

- Accepted on 2026-07-30: inspector-tabs.tsx implements DiffTab, GitTab, FilesTab, PreviewTab, LanguagesTab.
- All git/diff endpoints are GET-only (application.ts L743-752); no POST/PATCH mutations.
- Binary handled via "binaryFile" i18n key; truncation via "inspectionTruncated".
- Platform.notify triggers on completion/failure/approval (notificationCompletedTitle/FailedTitle/ApprovalTitle).
- Read-only contract verified by api-boundaries.test.ts (readonly mode 403 on mutations).

## Priority
high

## SPEC Reference
CLI-GUI-024; desktop PRD TR-006, FR-TR-7/8; UI interaction SPEC Section 6.

## Validation
- Read-only zero-write integration tests and browser Diff/monitor coverage.
