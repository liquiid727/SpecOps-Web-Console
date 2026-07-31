# CLI-GUI-021 Issue 065 Implementation Notes

## Meta

- Spec ID: `CLI-GUI-021`
- Source Spec: `cli-gui/doc/mvp02/spec/agent-runtime-spec.md`
- Source Issue: `.issues/issue-065-engine-readiness-probes-and-remediation.md`
- Status: `accepted_local`

## Delivered Files

- `cli-gui/server/engine-readiness.ts`: Maps CapabilityDetectionResult → EngineReadiness with stable remediation codes.
- `cli-gui/server/engine-readiness.test.ts`: Covers supported, missing, timeout, and unsupported states.
- `cli-gui/shared/types.ts`: EngineReadiness, AgentEngineId, remediation kind types.
- `cli-gui/server/application.ts` L673-681: `/api/engine-readiness` endpoint exposing probe results.

## Design Decisions

- Authentication is always reported as `"unknown"` since version probing cannot reliably determine login state without mutating side effects.
- Only `codex` and `claude-code` adapters produce EngineReadiness; unsupported adapters return `undefined`.
- Remediation kinds: `install-guide`, `update`, `retry-probe`, `open-setup-terminal`.
- Transport selection: `json-stream` when headless supported, `pty` otherwise.

## Validation

- `npm --prefix cli-gui run test -- --run`: 49 files and 369 tests passed.
- Test coverage matrix:
  - `supported`: compatible engine → installation=available, compatibility=supported, no remediation.
  - `missing`: ENOENT → installation=missing, remediation=install-guide.
  - `timeout`: probe-timeout → remediation=retry-probe.
  - `unsupported`: version-out-of-range → compatibility=unsupported, remediation=update.

## Remaining Risks

- Real auth-probe requires a non-mutating API from Codex/Claude CLI (not currently available).
- Retry-probe remediation triggers a re-probe but does not guarantee network recovery.
