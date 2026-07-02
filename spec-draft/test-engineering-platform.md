# SpecOS Test Engineering Platform Draft

## Status

- Draft status: draft-only.
- Date: 2026-05-28.
- Source context:
  - `README.md`: SpecOS is a Spec-Driven AI IDE.
  - `tests/README.md`: test assets must be spec-driven and normalized for the test console.
  - `rules/ci/spec-release-gates.md`: release checks must verify spec, generated contracts, tests, and bundle outputs stay aligned.
  - `ai/workflows/test-console-v1.yaml`: Feature Spec -> test plan -> execution -> normalized result -> report UI.
  - `.agents/manifest.yaml`: existing test-related agent boundaries.

This draft describes the production-grade testing system for SpecOS, including test agents, test design, test execution, test UI, performance and concurrency checks, and CI release gates.

## 1. Product Intent

SpecOS should treat testing as part of the spec delivery chain, not as an isolated engineering afterthought.

The testing platform should answer five questions for every feature spec or active implementation slice:

1. What business behavior must be verified?
2. Which test assets prove the behavior?
3. Which agent or runner executed the verification?
4. What evidence supports the result?
5. Can this change be promoted or released?

The test UI should therefore be an executable verification console, not only an API playground. It may include Swagger-like API documentation and manual request execution, but its primary responsibility is traceable test design, execution, evidence, and release readiness.

## 2. Design Principles

### 2.1 Spec First

All independent verification assets must be derived from feature specs plus any required `design/` and `specs/roadmap.md` context.

Draft-only requirements may produce exploratory test plans, but the UI and CI must mark them as draft-only and must not treat them as release evidence.

### 2.2 Test Design Before Test Tools

SpecOS should generate a normalized `test-plan` before choosing Bruno, Playwright, k6, Vitest, or any other concrete tool.

The test plan is the semantic bridge between product behavior and execution assets.

### 2.3 Independent Verification

Implementation agents may write implementation-coupled unit tests, but independent API, scenario, UI, E2E, performance, and concurrency verification must be owned by test agents that read specs and contracts instead of implementation notes.

### 2.4 Normalized Results

The test console should read normalized result artifacts from `tests/results/`, not raw framework output.

Bruno, Playwright, k6, Vitest, or custom runners may all be used, but their results must be converted into one shared result model.

### 2.5 Evidence Over Claims

A release gate may pass only when the required test result exists, is linked to the expected spec version, and includes enough evidence for review.

Missing evidence is not equivalent to success.

## 3. End-to-End Workflow

```text
spec-draft/
  -> specs/<SPEC-ID>-<slug>/
  -> tests/plans/<spec-id>.test-plan.json
  -> tests/schedules/<change-id>.test-schedule.json
  -> generated execution assets
       - tests/bruno/<spec-id>/
       - tests/scenarios/<spec-id>/
       - tests/playwright/<spec-id>/
       - tests/performance/<spec-id>/
       - tests/concurrency/<spec-id>/
       - module-local unit tests
  -> concrete test runners
  -> tests/results/<spec-id>.<run-id>.json
  -> test-console
  -> CI gate decision
  -> merge when accepted
```

The core rule is:

```text
Spec decides what to test.
Test plan decides coverage.
Test assets decide execution.
Normalized results decide UI and CI.
CI gates decide release readiness.
```

## 4. Test Layers

### 4.1 Unit Tests

Purpose:

- Verify local module behavior, domain rules, helpers, validation functions, and service-level invariants.
- Provide fast feedback for implementation changes.

Owner:

- `unit-test-agent` supports the implementation track.
- The implementation agent may write or update module-local unit tests.

Inputs:

- Accepted spec rules.
- Module boundaries.
- Implementation context.

Outputs:

- Module-local tests.
- Coverage summary.
- Module risk report.

Release semantics:

- P0 domain rules must have unit coverage.
- Coverage gaps in critical modules should block release.
- Coverage gaps in non-critical modules may produce warnings.

Suggested metrics:

- Statement coverage.
- Branch coverage.
- Critical rule coverage.
- Mutation score when available.

### 4.2 API Contract and Scenario Tests

Purpose:

- Verify HTTP API behavior, request/response schemas, stable error codes, branch behavior, idempotency, and permission boundaries.

Owner:

- `bruno-test-agent`.
- `openapi-agent` for contract source alignment.

Inputs:

- `tests/plans/<spec-id>.test-plan.json`.
- OpenAPI contract or endpoint definitions.
- Error code rules.

Outputs:

- Bruno collections under `tests/bruno/<spec-id>/`.
- Environment notes.
- API result items normalized into `tests/results/`.

Required coverage:

- Happy path.
- Business error path.
- Validation error path.
- Permission error path.
- Boundary and edge cases.
- Stable error code assertions.

Release semantics:

- P0 endpoint failure blocks release.
- Missing P0 branch coverage blocks release.
- P1 failures may block or warn based on the change risk.

### 4.3 Business Scenario and E2E Tests

Purpose:

- Verify the complete business journey described by the spec.
- Cross-check UI, API, data state, side effects, and final user-visible result.

Owner:

- `e2e-test-agent`.
- `playwright-test-agent` for browser execution.
- `bruno-test-agent` for API execution used inside a journey.

Inputs:

- Business flows and stages from the test plan.
- Scenario preconditions.
- Fixtures and environment checklist.

Outputs:

- Scenario journey matrix.
- Playwright or other E2E assets.
- Evidence: trace, screenshot, video, logs, request summary, response summary.

Required UI states for user-facing flows:

- Empty.
- Loading.
- Success.
- Failure.

Release semantics:

- P0 business journey failure blocks release.
- Missing failure-state coverage for P0 user-facing flows blocks release.
- Flaky P0 tests block release until classified and quarantined with explicit approval.

### 4.4 Performance and Latency Tests

Purpose:

- Verify response time, throughput, and capacity expectations for user-critical and system-critical paths.

Recommended owner:

- Add `performance-test-agent`.

Inputs:

- P0 and P1 endpoints from the test plan.
- SLO definitions.
- Baseline results from previous accepted runs.

Outputs:

- Load profiles under `tests/performance/<spec-id>/`.
- Normalized performance result items.
- Baseline comparison report.

Suggested tools:

- k6 for scripted HTTP load tests.
- Artillery for scenario-oriented load tests.
- autocannon or wrk for focused endpoint benchmarks.

Metrics:

- p50 latency.
- p95 latency.
- p99 latency.
- request rate.
- error rate.
- saturation signal when available.
- cold-start latency when relevant.

Release semantics:

- P0 p95 regression beyond threshold blocks release.
- P0 error rate above threshold blocks release.
- P1 regression may warn unless the change is performance-sensitive.

Example thresholds:

```json
{
  "endpoint": "POST /api/reward-orders",
  "priority": "P0",
  "slo": {
    "p95Ms": 300,
    "p99Ms": 800,
    "errorRate": 0.001
  },
  "gate": "blocking"
}
```

### 4.5 Concurrency and Consistency Tests

Purpose:

- Verify race conditions, duplicate submissions, idempotency, locking, inventory consistency, and eventual consistency behavior.

Recommended owner:

- Add `concurrency-test-agent`.

Inputs:

- Business invariants from specs.
- Data consistency rules.
- Idempotency and retry requirements.
- Migration and rollback notes when data shape changes.

Outputs:

- Concurrency scenarios under `tests/concurrency/<spec-id>/`.
- Result items with invariant evidence.
- Risk notes for retries, duplicate messages, stale reads, and partial failures.

Required coverage examples:

- Same user submits the same command twice.
- Multiple users claim the last unit of inventory.
- Client retries after timeout.
- Worker or queue consumer processes duplicated message.
- Read-after-write behavior under expected delay.

Release semantics:

- P0 invariant violation blocks release.
- Non-deterministic result without clear classification blocks release.
- Known consistency delay is allowed only when the spec documents the delay and UI/API behavior.

### 4.6 Specialized Checks

Purpose:

- Verify cross-cutting concerns that do not fit cleanly into API, UI, or E2E tests.

Owner:

- `specialized-check-agent`.

Examples:

- Security smoke checks.
- Migration dry-run checks.
- Backward compatibility checks.
- Bundle validation.
- Schema compatibility.
- Accessibility smoke checks for important UI flows.

Release semantics:

- Blocking behavior depends on the check type and affected surface.
- Security, migration, and compatibility failures should default to blocking.

## 5. Agent Model

### 5.1 Existing Agents

`test-editor`

- Owns independent test generation from specs.
- Produces test plans, coverage gaps, normalized result expectations.

`unit-test-agent`

- Supports implementation-coupled unit test planning and risk reporting.
- Does not own independent verification assets.

`bruno-test-agent`

- Owns API request collections and HTTP assertions.
- Converts endpoint and branch decisions into executable API tests.

`e2e-test-agent`

- Owns cross-layer business journey strategy.
- Coordinates API, UI, data, fixture, and environment dependencies.

`playwright-test-agent`

- Owns browser-level scenario coverage and UI state validation.

`specialized-check-agent`

- Owns smoke, contract, compatibility, and other specialized checks.

`ci-editor`

- Owns CI integration and release gate wiring.
- Does not author business test logic.

### 5.2 Recommended New Agents

`performance-test-agent`

- Owns load profiles, latency baselines, SLO checks, and performance regression notes.

`concurrency-test-agent`

- Owns concurrent scenario design, invariant checks, idempotency tests, race-condition risks, and consistency evidence.

## 6. Artifact Model

### 6.1 Test Plan

Location:

```text
tests/plans/<spec-id>.test-plan.json
```

Required fields:

- `specId`
- `specVersion`
- `changeId`
- `source`
- `featureName`
- `flows`
- `endpoints`
- `scenarios`
- `performanceTargets`
- `concurrencyInvariants`
- `releaseGates`

The existing model already covers flows, endpoints, scenarios, branches, and expected results. Production usage should extend it with performance, concurrency, and gate metadata.

### 6.2 Test Schedule

Location:

```text
tests/schedules/<change-id>.test-schedule.json
```

Purpose:

- Split execution-track work from independent testing work.
- Declare which agent owns which test asset.
- Prevent implementation agents from writing independent verification assets.

Required fields:

- `changeId`
- `specId`
- `specVersion`
- `tracks`
- `agentAssignments`
- `ownedPaths`
- `blockedPaths`
- `requiredOutputs`

### 6.3 Execution Assets

Recommended paths:

```text
tests/bruno/<spec-id>/
tests/scenarios/<spec-id>/
tests/playwright/<spec-id>/
tests/performance/<spec-id>/
tests/concurrency/<spec-id>/
```

Implementation-coupled unit tests should remain in module-local test paths or an explicit `tests/unit/` path when the target project uses that convention.

### 6.4 Normalized Result

Location:

```text
tests/results/<spec-id>.<run-id>.json
```

The existing `test-console` result model should be extended to support these `testType` values:

```text
api
scenario
unit
specialized
performance
latency
concurrency
security
migration
compatibility
```

Recommended additional fields:

- `changeId`
- `runner`
- `environment`
- `commitSha`
- `baselineRunId`
- `gateImpact`
- `slo`
- `concurrencyProfile`
- `artifactRefs`

Example result item shape:

```json
{
  "runId": "reward-order.run-2026-05-28T10-00-00Z",
  "specId": "reward-order",
  "specVersion": "1.2.0",
  "changeId": "reward-order-last-inventory",
  "testType": "concurrency",
  "target": "POST /api/reward-orders",
  "scenarioName": "多人同时领取最后一份库存",
  "branchType": "limit",
  "status": "fail",
  "durationMs": 1800,
  "summary": "50 concurrent attempts created 2 successful orders for one remaining inventory item.",
  "gateImpact": "blocking",
  "evidence": {
    "traceId": "trace-abc-123",
    "requestSummary": "50 concurrent POST requests with unique users",
    "responseSummary": "2 success responses, 48 insufficient-stock responses"
  }
}
```

## 7. Test Console Design

The test console should be the central UI for test design, execution, evidence, and release readiness.

### 7.1 Overview Page

Purpose:

- Show all specs and active changes with latest test status.

Key data:

- Spec ID.
- Spec version.
- Change ID.
- Feature name.
- Latest run.
- Release decision.
- Blocking count.
- P0 pass rate.
- API pass rate.
- Scenario pass rate.
- Performance status.
- Concurrency status.

States:

- Empty: no test plans exist.
- Loading: reading plans and results.
- Success: grouped spec cards or table.
- Failure: invalid result schema or unreadable artifact path.

### 7.2 Test Plan Page

Purpose:

- Explain what is being tested and why.

Views:

- Business flow map.
- Scenario matrix.
- Endpoint matrix.
- Branch coverage.
- Preconditions and expected results.
- Release blocking classification.

The page should make test gaps visible before execution.

### 7.3 API Test Page

Purpose:

- Provide Swagger-like endpoint visibility, but with SpecOS test semantics.

For each endpoint:

- Method and path.
- Related rule.
- Request and response examples.
- Branches.
- Assertions.
- Last status.
- p95 latency.
- Error rate.
- Evidence links.
- Manual run action when enabled.

This page may expose a manual request runner, but manual execution is not release evidence unless the result is normalized and written to `tests/results/`.

### 7.4 Scenario and E2E Page

Purpose:

- Show business journeys as staged flows.

For each scenario:

- Priority.
- Preconditions.
- Steps.
- Current status.
- Related endpoints.
- Screenshots, trace, logs, video.
- Failure reason.
- Retry or quarantine state when applicable.

### 7.5 Performance Page

Purpose:

- Show SLO status and regression against baseline.

Views:

- Endpoint latency table.
- p50, p95, p99 trends.
- Error rate.
- Throughput.
- Baseline comparison.
- Blocking threshold.

### 7.6 Concurrency Page

Purpose:

- Show invariant-level confidence.

Views:

- Concurrent scenario list.
- Invariant checked.
- Actor count.
- Request count.
- Success/failure distribution.
- Duplicate side effects.
- Final data state.
- Blocking reason.

### 7.7 Gate Report Page

Purpose:

- Provide reviewer and CI-facing release readiness.

Required sections:

- Decision: `ready`, `blocked`, or `draft-only`.
- Required gates.
- Passed gates.
- Failed gates.
- Missing evidence.
- Human approval items.
- Spec version.
- Run ID.
- Commit SHA when available.

The gate report should be exportable as a review artifact.

## 8. CI Gate Design

### 8.1 PR Fast Gate

Goal:

- Catch obvious failures quickly.

Commands should include:

- Lint.
- Typecheck.
- Unit tests.
- Schema validation for specs, test plans, and results.
- Test plan traceability check.

Blocking conditions:

- Invalid schema.
- Missing required test plan for an affected feature spec.
- Unit failures.
- P0 coverage missing for touched critical modules.

### 8.2 Change Verification Gate

Goal:

- Verify an active change against spec and test plan.

Commands should include:

- Generate or validate test plan.
- Generate API assets.
- Run API P0 tests.
- Run P0 scenario tests.
- Run affected UI state tests.
- Normalize all outputs.

Blocking conditions:

- P0 API failure.
- P0 scenario failure.
- Missing normalized result.
- Result spec version mismatch.
- Unclassified flaky P0 result.

### 8.3 Release Gate

Goal:

- Decide whether the change can ship.

Commands should include:

- Full API suite.
- Full business E2E suite.
- Performance checks for P0/P1 endpoints.
- Concurrency checks for changed invariants.
- Migration and compatibility checks when relevant.
- Gate report generation.

Blocking conditions:

- P0 failure in any layer.
- Performance SLO failure for blocking endpoints.
- Concurrency invariant failure.
- Migration failure.
- Security or compatibility failure.
- Human approval missing for irreversible workflow steps.

### 8.4 Promote Gate

Goal:

- Decide whether a reviewed feature spec is ready for merge and release.

Blocking conditions:

- No accepted test result for the same `specId`, `specVersion`, and `changeId`.
- Gate report decision is not `ready`.
- Required review report missing.
- Required human approval missing.
- Archive output not generated.

## 9. Runner and Adapter Model

Each test type should have an adapter boundary:

```text
SpecOS runner command
  -> concrete tool command
  -> raw output
  -> adapter
  -> normalized result
```

Examples:

```bash
node packages/cli/dist/main.js run-api-tests <specId> --command "bru run tests/bruno/<specId>"
node packages/cli/dist/main.js run-e2e-tests <specId> --command "npx playwright test tests/playwright/<specId>"
node packages/cli/dist/main.js run-performance-tests <specId> --command "k6 run tests/performance/<specId>/load.js"
node packages/cli/dist/main.js run-concurrency-tests <specId> --command "node tests/concurrency/<specId>/run.mjs"
```

If a concrete tool or adapter is missing, SpecOS should write a blocked normalized result and exit non-zero. This keeps release gates honest.

## 10. Data and Environment Strategy

Production-grade testing requires explicit environment and data rules.

Required concepts:

- Test environment ID.
- Fixture version.
- Seed command.
- Cleanup command.
- Account roles.
- External dependency mode.
- Mock/stub policy.
- Data isolation strategy.

Recommended policy:

- Unit tests use in-memory or local mocks.
- API tests use deterministic fixtures.
- E2E tests use seeded accounts and isolated test data.
- Performance tests use a dedicated environment or explicit capacity baseline.
- Concurrency tests must verify final persisted state, not only HTTP responses.

## 11. Flaky Test Policy

Flaky tests should be classified, not ignored.

States:

- `stable`
- `suspected-flaky`
- `quarantined`
- `blocked`

Rules:

- A P0 flaky test blocks release until reviewed.
- Quarantine requires owner, reason, expiry, and replacement evidence.
- Re-running cannot hide an unresolved product or consistency failure.
- The test console should show flaky history and quarantine state.

## 12. Observability and Evidence

Every meaningful result should include evidence references.

Evidence types:

- Trace ID.
- Log URL.
- Screenshot URL.
- Video URL.
- Request summary.
- Response summary.
- Database state summary.
- Performance raw report.
- Runner stdout/stderr.

For local-first projects, URLs may be relative artifact paths.

## 13. Recommended Implementation Phases

### Phase 1: Normalize the Existing Foundation

- Extend `TestType` and normalized result schema.
- Add `changeId`, `runner`, `environment`, and `gateImpact`.
- Add schema validation commands.
- Make test console show missing evidence and spec version mismatch.

### Phase 2: API and Scenario Production Readiness

- Harden Bruno generation and adapter execution.
- Add P0/P1 gate classification.
- Add scenario result normalization with trace and screenshot evidence.
- Add gate report output.

### Phase 3: Performance and Concurrency Tracks

- Add `performance-test-agent`.
- Add `concurrency-test-agent`.
- Add `tests/performance/` and `tests/concurrency/`.
- Add k6 or equivalent adapter.
- Add invariant result model.

### Phase 4: CI Gate Integration

- Add PR fast gate.
- Add change verification gate.
- Add release gate.
- Add promote gate.
- Make failed or missing normalized result block promotion.

### Phase 5: Test Console Expansion

- Add Test Plan page.
- Add API Test page.
- Add Scenario/E2E page.
- Add Performance page.
- Add Concurrency page.
- Add Gate Report page.

## 14. Open Questions

1. Should SpecOS standardize on k6 for performance tests, or keep the performance adapter tool-agnostic in V1?
2. Should `test-console` remain a separate Next.js app, or eventually merge into `spec-web-ui` as a testing workspace?
3. Should CI gate reports be JSON-only, Markdown-only, or both?
4. Should manual UI-triggered runs be allowed in production environments, or restricted to local/dev test environments?
5. What is the default SLO policy for generated specs that do not define explicit latency targets?

## 15. Acceptance Criteria for a Formal Change

This draft can be converted into a formal feature spec when the following decisions are made:

- Test result schema extension is approved.
- New agent roles are approved or rejected.
- Test console scope is decided.
- CI gate phases are accepted.
- Default performance and concurrency policy is selected.
- Artifact paths are confirmed.

After formalization, the first implementation change should focus on result schema extension and CI gate validation before adding more UI screens.
