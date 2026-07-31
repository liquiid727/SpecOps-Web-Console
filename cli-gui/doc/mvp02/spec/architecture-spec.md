# SPEC: CLI GUI MVP02 Architecture

> Derived from: `../client-platform-prd.md`, `../desktop-terminal-replacement-prd.md`, `../remote-prd.md`
> Generated: 2026-07-29 | Target: MVP02-A then MVP02-B

## 1. Summary

MVP02 upgrades the MVP01 console into a Chat-first desktop product whose normal
Codex and Claude workflows do not require an external terminal. The same client
contracts then support remote control without duplicating Session, event, or
Agent semantics.

## 2. Decisions

| Decision | Contract | Rationale |
|---|---|---|
| Delivery order | MVP02-A is a gate for MVP02-B | Remote control must reuse a proven local workflow |
| Client boundary | All product UI depends on `ClientRuntime` ports | Browser, Tauri, mock, and remote clients share business modules |
| Agent boundary | Backends create stateful session/turn handles | Vendor session state is not forced into stateless command adapters |
| Execution ownership | Orchestrator owns lifecycle and concurrency | Prevents vendor integrations from duplicating process policy |
| Protocol model | Engine, Transport, and Provider are separate concepts | A runnable Agent Engine is not a model API provider |
| Desktop host | Tauri supervises the TypeScript runtime sidecar | Keeps existing runtime logic and avoids a Rust rewrite |
| Git scope | Read-only status and diff | Write operations require a later security/product decision |

## 3. System Context

```text
React feature modules
        |
   ClientRuntime
   /     |      \
 Mock  Local   Remote
          \      /
       Runtime API
           |
 Session Manager -> Orchestrator -> AgentBackend -> Transport -> Engine
           |
 append-only state/transcript
```

Normative long-term boundaries are defined by
`../../../../design/cli-gui-platform-design.md`.

## 4. Specification Index

- [client-runtime-spec.md](./client-runtime-spec.md)
- [agent-runtime-spec.md](./agent-runtime-spec.md)
- [ui-interaction-spec.md](./ui-interaction-spec.md)
- [desktop-host-spec.md](./desktop-host-spec.md)
- [remote-architecture-spec.md](./remote-architecture-spec.md)
- [remote-api-spec.md](./remote-api-spec.md)
- [remote-security-spec.md](./remote-security-spec.md)
- [test-spec.md](./test-spec.md)

## 5. Shared Invariants

1. Product Session IDs, turn IDs, approval IDs, and transcript sequence numbers
   are stable across local, remote, and reconnect boundaries.
2. A UI component may not call HTTP, WebSocket, `window.location`, or Tauri
   `invoke` directly.
3. `AgentEvent` is the only normalized live execution stream; persistence adds
   an envelope but does not reinterpret events.
4. Terminal fallback remains inside the application and is never the default
   interaction for a ready, structured Codex or Claude Engine.
5. Visible controls have working behavior or a specific disabled explanation.
6. MVP02 migrations preserve readable MVP01 sessions, forks, and transcripts.

## 6. Delivery Phases

1. Runtime contracts and compatibility adapters.
2. Engine readiness and first-run task path.
3. Capability-driven Codex/Claude Chat and Agent Backend seam.
4. Composer, approval, recovery, Diff, monitor, and Session UX.
5. Tauri sidecar supervision and packaged desktop acceptance.
6. RemoteRuntime, agentd, Control Server, and remote security gate.

## 7. Errors

All runtime surfaces use a stable error envelope:

```ts
interface ClientError {
  code: string;
  message: string;
  retryable: boolean;
  remediation?: { kind: string; label: string };
  details?: Record<string, unknown>;
}
```

Raw process output may be attached to diagnostics but is not the primary user
message.

## 8. Compatibility

- Existing v3 state loads through a non-destructive v4 migration.
- The legacy Profile Adapter registry remains available behind a compatibility
  backend until Codex, Claude, JSON stream, and PTY are migrated.
- A failed migration leaves the original file and a backup intact and starts no
  Agent process.

## 9. Acceptance Gate

MVP02-A passes only when locked Codex and Claude versions complete the complete
local flow in `test-spec.md` without opening an external terminal. MVP02-B then
passes the same Session/Event/Error contract suite through `RemoteRuntime`.

