# Test Engineering Platform Test Strategy

## Core

- Validate expanded test-plan metadata.
- Validate expanded normalized-result metadata.
- Validate gate report generation for missing and failed evidence.
- Validate `specos-test-standard/v1` plan metadata, owner-agent assignment, flake policy, data policy, and security policy.
- Validate blocking production result items require `requirementId`, `ownerAgent`, and artifact evidence.
- Validate gate reports include `standardCompliance`, `riskSummary`, and `agentEvidenceSummary`.

## CLI

- Verify `validate-test-gates` writes JSON and Markdown reports.
- Verify invalid normalized result artifacts become blocked gate evidence.
- Verify performance and concurrency commands normalize adapter output.
- Verify P0/P1 production standard gaps block `validate-test-gates`.

## Test Console

- Verify run loading ignores `*.gate-report.json`.
- Verify readiness summary derives performance, concurrency, gate, and missing-evidence state.
- Verify overview and spec detail render new readiness data.
- Verify dedicated route pages build and render.
- Verify standard compliance, risk summary, owner-agent evidence, API assertion evidence, SLO evidence, and concurrency invariant evidence render from normalized artifacts.

## CI

- Verify `scripts/checks/spec-test-gates.mjs` exits non-zero for blocked evidence.
- Verify it exits zero only when required gates are ready.
