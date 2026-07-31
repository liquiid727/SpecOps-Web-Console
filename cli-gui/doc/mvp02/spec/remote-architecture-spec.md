# SPEC: Remote Architecture

> Parent: [architecture-spec.md](./architecture-spec.md)
> PRD: `../remote-prd.md`; original concept: `../remote.md`

## 1. Topology

```text
Remote Web Client --HTTPS/SSE--> Control Server
                                      |
                               authenticated tunnel
                                      |
                                   agentd
                                      |
                              Local TypeScript Runtime
```

`agentd` creates an outbound connection so the desktop does not expose an
inbound public listener. Local Agent processes continue through Control Server
outages.

## 2. Ownership

- `RemoteRuntime` maps shared ports to remote API calls.
- Control Server authenticates users/devices, authorizes commands, sequences
  envelopes, and buffers bounded replay data.
- `agentd` maintains the tunnel and forwards allow-listed domain commands.
- Local Runtime remains source of truth for Sessions, Agents, transcript, and
  Workspace scoping.

## 3. Command Model

Remote clients send typed commands such as session create/run/cancel/approve
and read-only workspace queries. They cannot send arbitrary shell commands,
filesystem paths outside a selected Workspace, or executable configuration.

Each mutation has `commandId`, user/device identity, target Session, timestamp,
and an idempotency key.

## 4. Event Model

Events preserve local IDs and sequence. SSE reconnect uses `Last-Event-ID`;
Control Server requests missing local transcript when its bounded buffer is
insufficient. Presence and connection events are control-plane events and are
not appended as Agent transcript content.

## 5. Offline Behavior

Remote drafts persist locally in the browser. Read-only cached history remains
visible with an offline badge. Mutations queue only when explicitly safe and
idempotent; prompts and approvals require reconfirmation after uncertain
delivery.

## 6. Deployment Gate

Remote is disabled until MVP02-A contract and security suites pass. Local mode
has no dependency on account login or Control Server availability.

