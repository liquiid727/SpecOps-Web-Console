# SPEC: Remote API

> Parent: [remote-architecture-spec.md](./remote-architecture-spec.md)

## 1. Envelope

```ts
interface RemoteEnvelope<T> {
  protocolVersion: 1;
  deviceId: string;
  requestId: string;
  sessionId?: string;
  sequence?: number;
  timestamp: string;
  payload: T;
}
```

## 2. Client Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/v1/devices` | list authorized desktop devices |
| GET | `/v1/devices/:id/capabilities` | runtime/device capabilities |
| GET | `/v1/devices/:id/engines/readiness` | Engine readiness |
| GET | `/v1/devices/:id/sessions` | Session list |
| POST | `/v1/devices/:id/sessions` | create Session |
| POST | `/v1/devices/:id/sessions/:sid/turns` | start turn |
| POST | `/v1/devices/:id/sessions/:sid/cancel` | cancel active turn |
| POST | `/v1/devices/:id/approvals/:aid/decision` | decide approval |
| GET | `/v1/devices/:id/sessions/:sid/transcript` | paged replay |
| GET | `/v1/devices/:id/events` | SSE stream |
| GET | `/v1/devices/:id/workspaces/:wid/diff` | read-only diff |

Mutations require `Idempotency-Key`. API accepts domain values, not executable
paths or argv.

## 3. Device Tunnel Messages

The Control Server sends allow-listed `runtime.command` envelopes and receives
`runtime.result`, `runtime.event`, `device.heartbeat`, and
`device.capabilities`. Unknown message types close the logical request and are
audited.

## 4. Error Response

```json
{
  "error": {
    "code": "SESSION_BUSY",
    "message": "This session already has a running turn.",
    "retryable": true,
    "requestId": "req_..."
  }
}
```

Required codes include `AUTH_REQUIRED`, `DEVICE_OFFLINE`, `FORBIDDEN_COMMAND`,
`WORKSPACE_SCOPE_VIOLATION`, `SESSION_NOT_FOUND`, `SESSION_BUSY`,
`APPROVAL_EXPIRED`, `CONCURRENCY_LIMIT`, `PROTOCOL_MISMATCH`, and
`REPLAY_GAP`.

## 5. Limits

Prompt bodies, attachment metadata, transcript pages, Diff output, SSE buffer,
and command rate have explicit server limits. A limit response is structured
and does not truncate a mutation silently.

