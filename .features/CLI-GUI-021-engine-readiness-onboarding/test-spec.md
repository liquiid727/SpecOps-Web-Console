---
testSpecId: "CLI-GUI-021.test-spec"
testSpecVersion: "1.0"
status: approved
sourceSpec: ".features/CLI-GUI-021-engine-readiness-onboarding/spec.md"
sourceSpecId: "CLI-GUI-021"
sourceSpecVersion: "1.0"
sourceSpecHash: "33a9c69d4bb00ab68dc30096244616617ad076777745890c99760884163f212d"
sourceApprovalEvidence: "architecture-agent-mvp02-rebaseline-2026-08-04"
testSpecApprovalEvidence: "architecture-agent-mvp02-rebaseline-2026-08-04-approved-for-planning"
---

# Independent Test Spec: CLI-GUI-021

Traceability inputs: `cli-gui/doc/mvp02/spec/`,
`cli-gui/doc/mvp02-check-qa/`, `design/cli-gui-platform-design.md`, and
`.issues/issue-065-engine-readiness-probes-and-remediation.md`,
`.issues/issue-072-in-app-setup-terminal-fallback.md`.

## Coverage Matrix

| Requirement | Branches | Owner | Required evidence | Gate |
|---|---|---|---|---|
| Readiness classification | happy, error, edge, limit | `test-editor` | trace, raw-report | blocking |
| Chat eligibility | happy, error, flow | `unit-test-agent` | trace | blocking |
| Quest Home state and draft retention | happy, error, edge | `playwright-test-agent` | trace, screenshot | blocking |
| Setup Terminal remediation | error, flow | `e2e-test-agent` | trace, screenshot | blocking |
| Probe timing and safe logging | limit, flow | `performance-test-agent` | trace, raw-report | warning |

## Scenarios

- Happy: supported Codex/Claude structured profile enables Chat and creates one session.
- Limit: probe timeout, version boundary, PTY-only profile, and repeated probe behavior.
- Error: missing executable, unsupported transport, auth-unknown, unavailable picker, and retry remediation.
- Security: no auto-install, config rewrite, credential logging, or setup shell outside explicit scope.
- Browser: empty/loading/ready/failed states preserve task draft and return focus after remediation.

## Fixtures And Seams

Use readiness fixtures, fake clock, bounded probe runner, fake PlatformPort, and fake
ClientRuntime. Real-engine runs must record actual binaries and versions separately.

## Execution And Normalization

Every result records probe environment, profile, transport, duration, remediation kind,
and artifact references. Fixture results prove contract behavior only; they cannot satisfy
the real-engine or packaged-host release gates.
