# Spec Release Gates

## Purpose

Define release checks that ensure generated artifacts still match accepted spec decisions.

## Required Practices

- CI should verify spec, generated contract, tests, and bundle outputs stay aligned.
- Failing scenario tests must block release for affected flows.
- Reviewers should see which spec bundle version a release references.
- Human approval is required before irreversible workflow steps in V1.
- Production test plans must satisfy `rules/testing/production-test-standards.md`.
- P0/P1 blocking evidence must be normalized under `tests/results/` before promotion.

## Gate Levels

### PR Fast Gate

- Validate manifest, specs, test plans, schedules, and normalized result schemas.
- Run unit tests and type/build checks for changed packages.
- Block on invalid schemas, missing `standardVersion`, missing P0/P1 owner-agent assignments, missing P0 test-plan coverage, or failed unit tests in affected modules.

### Change Verification Gate

- Run or validate API P0 evidence, scenario P0 evidence, and affected UI state evidence.
- Run `node packages/cli/dist/main.js validate-test-gates <specId> --change <changeId>`.
- Block on P0/P1 API/scenario failure, missing normalized result, missing trace/raw-report evidence, spec version mismatch, or unclassified flaky P0 evidence.

### Release Gate

- Run the full API and business E2E suite.
- Run performance and latency checks for P0/P1 paths.
- Run concurrency checks for changed invariants and consistency rules.
- Block on P0/P1 SLO failure, concurrency invariant failure, migration failure, security failure, compatibility failure, invalid evidence quality, or missing human approval.

### Promote Gate

- Require a gate report decision of `ready` before promoting a change into `specs/current/`.
- Require all release-blocking normalized results to reference the same `spec_id`, `spec_version`, and `change_id`.
- Require `standardCompliance`, `riskSummary`, and `agentEvidenceSummary` to show no P0/P1 blocking gaps.
- Archive gate evidence with the completed change package.

## Local Command

After `npm run build`, use:

```bash
node scripts/checks/spec-test-gates.mjs <specId> [--change <changeId>]
```

The command writes gate reports through the CLI and exits non-zero when evidence is missing or blocked.

## Draft Injection Hints

- 说明哪些测试是发布阻断项。
- 标记需要人工确认的 workflow step。
- 记录本次功能对应的 spec version 或 bundle id。
