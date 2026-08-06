# Test Plan — Issue 111

Aggregate normalized evidence from issues 092–094 and enforce the CLI-GUI-029 P0 gate.

## Matrix

- Verify the existence and current status of issue 092 migration/contract evidence, issue 093 registry/API evidence, and issue 094 legacy/history evidence.
- Rerun full Vitest, typecheck, lint/ui:check, build, `npx specos check`, and `git diff --check`.
- Confirm secret-free normalized/raw artifacts and traceable references.
- Preserve Browser/Platform as N/A per the feature Test Spec.

## Decision rule

The aggregate is accepted only when every blocking source issue is accepted. A green full test run cannot override a source issue's missing independent, cross-process, real Provider, or packaged-host evidence.
