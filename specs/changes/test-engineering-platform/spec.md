# Test Engineering Platform Change Spec

## Meta

- Change ID: `test-engineering-platform`
- Source Draft: `spec-draft/test-engineering-platform.md`
- Status: executable-change
- Scope: SpecOS testing platform, normalized result model, test-console UI, runner adapters, agent roles, and CI gates.

## Intent

Implement the production-grade testing system described in `spec-draft/test-engineering-platform.md`.

SpecOS must treat tests as part of the spec delivery chain:

```text
specs/current + specs/changes/<change-id>
-> tests/plans/
-> execution assets
-> runner adapters
-> tests/results/
-> test-console
-> CI gate report
-> promotion decision
```

## Requirements

### R0. Production Test Standard

SpecOS testing must implement `specos-test-standard/v1` as an enforceable production standard.

Production test plans must carry:

- `standardVersion`
- `qualityProfile`
- `riskTier`
- `standardRequirements`
- `flakePolicy`
- `dataPolicy`
- `securityPolicy`

Production results must carry run-level standard metadata and item-level `requirementId`, `ownerAgent`, `evidenceQuality`, `attempts`, `flakeClassification`, and `artifactRefs`.

Gate reports must summarize standard compliance, risk status, and agent evidence status.

### R1. Normalized Test Plan Model

`tests/plans/*.test-plan.json` must support:

- `changeId`
- business flows, endpoints, scenarios, and branches
- `performanceTargets`
- `concurrencyInvariants`
- `releaseGates`

Invalid performance, concurrency, or release gate metadata must be rejected by schema validation.

### R2. Normalized Result Model

`tests/results/*.json` must support these test types:

- `api`
- `scenario`
- `unit`
- `specialized`
- `performance`
- `latency`
- `concurrency`
- `security`
- `migration`
- `compatibility`

Result items must be able to carry:

- `changeId`
- `gateImpact`
- SLO and metrics
- artifact references
- concurrency profile
- runner and environment metadata at run level

### R3. Runner Adapter Boundary

The CLI must run concrete tool commands through adapter boundaries and normalize output into `tests/results/`.

Required commands:

- `run-api-tests`
- `run-performance-tests`
- `run-concurrency-tests`

Missing adapters or failed commands must create blocked or warning evidence, not silent success.

### R4. Gate Report

The CLI must provide a gate command:

```bash
node packages/cli/dist/main.js validate-test-gates <specId> [--change <changeId>]
```

The command must:

- read `tests/plans/<spec-id>.test-plan.json`
- read normalized result artifacts
- ignore existing gate-report JSON as input runs
- block on missing required test evidence
- block on invalid normalized result artifacts
- write JSON gate report under `tests/results/`
- write Markdown gate report under `specs/changes/<change-id>/` when a change is provided
- block P0/P1 production gaps when `standardVersion` is `specos-test-standard/v1`

### R5. Test Console

`test-console` must expose a testing workbench that reads only normalized artifacts.

Required views:

- overview with spec readiness
- spec detail summary
- test plan matrix
- API test view
- scenario/E2E view
- performance/latency view
- concurrency/consistency view
- gate report view
- production standard compliance matrix
- owner-agent evidence summary
- P0/P1/P2 risk summary

The UI must show empty, success, blocked, and missing-evidence states without reading Bruno, Playwright, k6, or raw runner output directly.

### R6. Agent Roles

SpecOS must define dedicated testing roles for:

- performance testing
- concurrency and consistency testing

The roles must be registered in `.agents/manifest.yaml` with scoped context and owned paths.

### R7. CI Gate Script

SpecOS must provide a local CI-compatible script under `scripts/checks/` that delegates to the CLI gate command and exits non-zero when evidence is blocked.

## Implemented Evidence

- `packages/core/src/artifacts.ts`
- `packages/core/src/artifacts.test.ts`
- `packages/cli/src/main.ts`
- `packages/cli/src/main.test.ts`
- `test-console/lib/types.ts`
- `test-console/lib/data.ts`
- `test-console/app/page.tsx`
- `test-console/app/spec/[specId]/page.tsx`
- `.agents/manifest.yaml`
- `ai/agents/performance-test-agent.md`
- `ai/agents/concurrency-test-agent.md`
- `.agents/roles/performance-test-agent.md`
- `.agents/roles/concurrency-test-agent.md`
- `scripts/checks/spec-test-gates.mjs`
- `rules/ci/spec-release-gates.md`

## Completion Evidence

- Dedicated test-console subroutes exist for plan, API, scenario/E2E, performance, concurrency, and gates.
- `promote-change` requires a ready gate report when a test plan is attached to the change.
- Historical reward-order result fixtures have the required normalized result top-level shape.
- `reward-order-ready` sample evidence proves the positive gate path.
