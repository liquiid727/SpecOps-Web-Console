# QA Report: CLI-GUI-025 Issue 076

## Decision

`blocked`

## Implementation

- `locally-verified`: yes.
- Review: clean with no actionable findings.
- Independent normalized result: present at `tests/results/cli-gui-025.issue-076.local.json`.

## Evidence Summary

- Rust sidecar state-machine tests: 5 passed.
- CLI GUI unit tests: 57 files passed; 447 passed, 4 skipped.
- Typecheck, build, and UI governance: passed.
- Focused Playwright splash/focus/responsive checks: 5 passed.
- Packaged Tauri startup/health/crash-restart/shutdown/capability/WebView matrix:
  missing because the Tauri CLI and packaged bundle are unavailable.

## Gate Rationale

Local and raw browser evidence establishes local behavior only. The approved
CLI-GUI-025 Test Spec marks packaged and platform evidence as blocking; therefore
QA cannot return `accepted` or `accepted-with-waiver`.

## Recovery Condition

Install the declared Tauri build toolchain, produce a real packaged artifact, and
rerun the version-bound packaged Test Spec with normalized trace/log/capability and
cross-platform evidence.
