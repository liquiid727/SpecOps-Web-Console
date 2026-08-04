---
testSpecId: "CLI-GUI-020.test-spec"
testSpecVersion: "1.0"
status: approved
sourceSpec: ".features/CLI-GUI-020-client-runtime-shared-ports/spec.md"
sourceSpecId: "CLI-GUI-020"
sourceSpecVersion: "1.0"
sourceSpecHash: "ed26ddf6beef387a2591f9d9c557f0a03b72171d1ab3febb0b56b2531c76770d"
sourceApprovalEvidence: "architecture-agent-mvp02-rebaseline-2026-08-04"
testSpecApprovalEvidence: "architecture-agent-mvp02-rebaseline-2026-08-04-approved-for-planning"
---

# Independent Test Spec: CLI-GUI-020

This Test Spec is approved for independent planning, not release acceptance. It is
bound to the exact Feature Spec hash in the front matter. Implementation-coupled
unit tests may supplement it but cannot replace its normalized evidence.

Traceability inputs: `cli-gui/doc/mvp02/spec/`,
`cli-gui/doc/mvp02-check-qa/`, `design/cli-gui-platform-design.md`, and
`.issues/issue-061-client-runtime-ports-and-context.md`,
`.issues/issue-063-mock-client-runtime-contract-fixtures.md`,
`.issues/issue-064-workspace-and-platform-port-migration.md`.

## Coverage Matrix

| Requirement | Branches | Owner | Required evidence | Gate |
|---|---|---|---|---|
| Port-only UI boundary | happy, error, edge | `unit-test-agent` | trace | blocking |
| Mock/local runtime parity | happy, limit, flow | `e2e-test-agent` | trace, raw-report | blocking |
| Replay/snapshot/reconnect/gap | error, edge, limit | `test-editor` | trace, raw-report | blocking |
| Workspace/platform states | happy, error, edge | `playwright-test-agent` | trace, screenshot | blocking |
| Runtime observability | flow | `test-editor` | trace, log | blocking |

## Scenarios

- Happy: run the same ClientRuntime contract suite against Mock and Local implementations.
- Limit: duplicate event, stale snapshot, bounded replay, readonly mutation, and cursor at retention floor.
- Error: transport failure, workspace picker cancel/timeout/unsupported, and unrecoverable cursor gap.
- Security: no direct transport imports, no absolute remote paths, and no browser/Tauri capability leakage.
- Concurrency: reconnect and live event race leaves one ordered, deduplicated projection.

## Fixtures And Seams

Use `MockClientRuntime`, `LocalHttpRuntime`, fake PlatformPort, event cursor fixtures,
workspace scope fixtures, and import-contract scanning. Do not derive assertions from
private implementation details.

## Execution And Normalization

- Unit: `cli-gui/client/runtime` and import guard.
- Scenario/E2E: workspace open, session restore, reconnect, and gap recovery.
- Browser: DOM contracts, focus, empty/loading/failure/offline/reconnecting states.
- Normalize every run to `tests/results/*.json` with `requirementId`, `ownerAgent`,
  `evidenceQuality`, `attempts`, `flakeClassification`, and `artifactRefs`.
- Missing normalized evidence blocks the Gate Report even when local Vitest passes.
