# CLI-GUI-022 Issue 062 Implementation Notes

## Meta

- Spec ID: `CLI-GUI-022`
- Source Spec: `cli-gui/doc/mvp02/spec/agent-runtime-spec.md`
- Source Issue: `.issues/issue-062-agent-backend-normalized-events-and-schema-v4.md`
- Status: `accepted_local`

## Delivered Files

- `cli-gui/shared/agent-runtime.ts`: AgentBackend session/turn contracts and normalized event categories.
- `cli-gui/server/agent-backends.ts`: Codex, Claude, JSON-stream, PTY, and ACP-compatible boundaries plus vendor-event normalization.
- `cli-gui/shared/state.ts`, `cli-gui/server/store.ts`: BackendSessionRef schema v4 and non-destructive migration metadata.
- `cli-gui/server/agent-backends.test.ts`, `cli-gui/server/store.test.ts`: contract and migration evidence.

## Validation

- `npm --prefix cli-gui run test -- --run`: 49 files and 369 tests passed.
- `npm --prefix cli-gui run build`: passed with the existing chunk-size warning.
- `npm --prefix cli-gui run ui:check`: passed.
- `git diff --check`: passed.
- 2026-07-30 real-engine acceptance (macOS, codex-cli 0.146.0): `CHAT_ENABLED` enabled; chat sessions run on `codex / json-stream` producing normalized `assistant_message` + `usage` transcript events with zero `pty_output`; `nativeSessionId` persisted and second-turn native resume kept context. Probe: `cli-gui/scripts/issue062-real-engine-check.mjs`. Full suite now 50 files / 402 tests passed.
- 2026-07-30 real-engine acceptance (macOS, claude-code 2.1.211): same probe against `profile-claude` passed both turns — `claude / json-stream` (`claude -p --output-format stream-json --verbose --include-partial-messages`), normalized events, zero `pty_output`, and `--resume` context retention via the persisted claude session UUID.

## Production Wiring Confirmed

- `cli-gui/server/production.ts` L57-61: injects `createAgentBackendRegistry()` + `createProfileAdapterTurnExecutor()` into ApplicationDependencies.
- `cli-gui/server/application.ts` L1085-1117: routes chat turns through `AgentBackend.openSession → runTurn` when `dependencies.agentBackends` is present.
- All 12 vendor event categories (text_delta, progress, tool, command, file_change, approval_request, approval_result, usage, completed, cancelled, error, diagnostic) are normalized.
- Unknown vendor events degrade to `kind: "diagnostic"` with `UNKNOWN_VENDOR_EVENT` code.

## Remaining Risks

- Native SDK and real ACP fixtures are pending (requires live engine binaries).
- Legacy ProfileAdapter spawn path remains as fallback for server builds without agentBackends.
- Real-engine evidence now covers codex and claude first-turn/streaming/resume; approval/diff/cancel/restart real-engine journeys remain tracked under issue-075 as skipped.
