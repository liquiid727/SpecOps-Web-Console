# Spec Release Gates

## Purpose

Define release checks that ensure generated artifacts still match feature-spec decisions.

## Required Practices

- CI should verify feature specs, generated contracts, tests, and evidence outputs stay aligned.
- Release validation should respect `projectMode`; `EnterpriseSpec` requires explicit release, review, and categorized test evidence, while `LiteSpec` may keep more evidence close to the feature slice.
- Failing scenario tests must block release for affected flows.
- Reviewers should see which `spec_id` and spec revision a release references.
- Human approval is required before irreversible workflow steps in V1.
- Production test plans must satisfy `rules/testing/production-test-standards.md`.
- P0/P1 blocking evidence must be normalized under `tests/results/` before merge readiness.

## Gate Levels

### PR Fast Gate

- Validate manifest, specs, test plans, schedules, and normalized result schemas.
- Run unit tests and type/build checks for changed packages.
- Block on invalid schemas, missing `standardVersion`, missing P0/P1 owner-agent assignments, missing P0 test-plan coverage, failed unit tests in affected modules, or missing `Sync Handoff` evidence for semantic changes.

### Change Verification Gate

- Run or validate API P0 evidence, scenario P0 evidence, and affected UI state evidence.
- Run `node packages/cli/dist/main.js validate-test-gates <specId>`.
- Block on P0/P1 API/scenario failure, missing normalized result, missing trace/raw-report evidence, spec version mismatch, or unclassified flaky P0 evidence.

### Release Gate

- Run the full API and business E2E suite.
- Run performance and latency checks for P0/P1 paths.
- Run concurrency checks for changed invariants and consistency rules.
- When `projectMode: enterprisespec`, also require release-facing evidence under categorized `tests/`, `reviews/`, and rollout/rollback surfaces before approval.
- Block on P0/P1 SLO failure, concurrency invariant failure, migration failure, security failure, compatibility failure, invalid evidence quality, or missing human approval.

### Promote Gate

- Require a gate report decision of `ready` before merge or release approval.
- Require all release-blocking normalized results to reference the same `spec_id` and `spec_version`.
- Require `standardCompliance`, `riskSummary`, and `agentEvidenceSummary` to show no P0/P1 blocking gaps.
- Require `qa-agent` acceptance language for residual risks, waivers, and final merge recommendation when a feature has attached production test plans.
- Require `sync_handoff_status: pass` or explicit waiver evidence before merge when the change affects neighboring specs, rules, agents, workflows, tests, or CI gates.

## Local Command

After `npm run build`, use:

```bash
node scripts/checks/spec-test-gates.mjs <specId> [--change <changeId>]
```

The command writes gate reports through the CLI and exits non-zero when evidence is missing or blocked.

## Draft Injection Hints

- 说明哪些测试是发布阻断项。
- 标记需要人工确认的 workflow step。
- 记录本次功能对应的 `spec_id`、spec revision 或 evidence id。
