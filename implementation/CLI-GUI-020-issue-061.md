# CLI-GUI-020 Issue 061 Implementation Notes

## Meta

- Spec ID: `CLI-GUI-020`
- Source Spec: `cli-gui/doc/mvp02/spec/client-runtime-spec.md`
- Source Issue: `.issues/issue-061-client-runtime-ports-and-context.md`
- Status: `accepted_local`

## Delivered Files

- `cli-gui/client/runtime/client-runtime.tsx`: runtime contracts, implementations, provider, and compatibility accessor.
- `cli-gui/client/runtime/client-runtime.test.tsx`: fake-runtime contract and feature transport-boundary guard.
- `cli-gui/client/components/TranscriptPanel.tsx`: transcript reads, subscriptions, capability checks, and clipboard access through `ClientRuntime`.

## Validation

- `npm --prefix cli-gui run test -- --run`: 47 files and 343 tests passed.
- `npm --prefix cli-gui run ui:check`: passed.
- `npm --prefix cli-gui run build`: passed with the existing Rollup chunk-size warning.
- `git diff --check`: passed.
- `npm --prefix cli-gui run test:e2e`: Chromium launch blocked by sandbox Mach port permission before any product assertion.

## Remaining Risks

- The MVP02 client-platform PRD remains Draft and has not been promoted into `.features/CLI-GUI-020`.
- Mock, Local, and Remote do not yet share the full contract suite required by the parent SPEC; later MVP02 issues own that expansion.
- GitHub commit, PR, merge, and issue closure are not complete in local-loop mode.
