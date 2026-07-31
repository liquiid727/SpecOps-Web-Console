# SPEC: Remote Security

> Parent: [remote-architecture-spec.md](./remote-architecture-spec.md)

## 1. Trust Boundaries

The browser, Control Server, device tunnel, local runtime, Agent process, and
Workspace filesystem are separate trust zones. Remote access never implies
arbitrary desktop control.

## 2. Identity and Authorization

- Users authenticate to the Control Server with short-lived sessions.
- Devices are paired through a one-time, expiring confirmation displayed on the
  desktop.
- Device credentials are revocable and stored using OS-protected storage.
- Every command checks user-to-device access, Session ownership, command type,
  Workspace scope, and current approval policy.

## 3. Command Allow List

Only commands represented by `ClientRuntime` domain ports are accepted. Remote
requests cannot set binary paths, environment secrets, raw process arguments,
Tauri commands, or filesystem paths outside a server-issued Workspace ID.

## 4. Approval Protection

Approval requests include target, risk, origin, expiry, and nonce. Decisions
are single-use and bound to user, device, Session, and operation hash.
High-permission policy changes require fresh confirmation and audit.

## 5. Data Protection

TLS is required for client and tunnel traffic. Secrets and raw environment
values are redacted from events and logs. Markdown is sanitized. Diff and file
preview enforce size, binary, and scope checks.

## 6. Audit

Pairing, revocation, login, policy changes, session mutations, approvals,
denials, scope violations, and protocol failures create immutable audit
records. Agent content is not copied into audit logs unless explicitly required
for a security event.

## 7. Abuse and Recovery

Rate limits apply per user, device, and Session. Repeated invalid command or
scope attempts suspend the tunnel. Revocation takes effect before the next
command and disconnects active remote clients without stopping local Agents.

## 8. Security Tests

Tests cover replayed approval, forged Workspace ID, malicious Markdown,
oversized payload, unauthorized device, revoked credential, tunnel downgrade,
arbitrary command injection, path traversal/symlink escape, and confused-deputy
Session access.

