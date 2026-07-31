# Review Report: CLI-GUI-025 Issue 071

## Decision

`return_to_implementation`

## Accepted Evidence

- Supervisor prevents duplicate children and bounds pre-ready retries.
- A ready runtime exit moves to recovery rather than silently creating another Agent runtime.
- Per-launch bearer credentials protect HTTP and WebSocket traffic without URL query leakage.
- Runtime host and origin configuration remain loopback-scoped.

## Blocking Findings

1. No packaged sidecar asset or `bundle.externalBin` pipeline exists, so the release branch calls a sidecar name that the installer cannot contain.
2. `RecoveryRequired` is internal state only; users cannot inspect or recover from the failure.
3. Capability declarations are not backed by verified native notification/clipboard delivery.

Issue #071 must remain partial until packaged-host startup and recovery are exercised from a built installer.
