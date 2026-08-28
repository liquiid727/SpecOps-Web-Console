---
specId: <SPEC-ID>
sourceSpec: .features/<SPEC-ID>-<slug>/spec.md
sourceSpecVersion: <feature-spec-version>
sourceSpecHash: <sha256-or-immutable-revision>
testSpecVersion: 1.0.0
status: draft
qualityProfile: backend-api
riskTier: P1
ownerAgent: test-editor
sourceApprovalEvidence: <approval-record-or-none>
testSpecApprovalEvidence: <approval-record-or-pending>
standardVersion: specos-test-standard
---

# Test Spec: <SPEC-ID> <Feature>

## 1. Test Overview

- **Feature:** `<feature name>`
- **Verification contract:** independent evidence for the approved Feature Spec version above.
- **Execution status:** `pending` until a downstream adapter produces normalized evidence.

## 2. Test Objective

State the user-visible behavior, quality risks, and release decision this Test Spec must verify. Do not describe private implementation details.

## 3. Quality Requirements

```yaml
quality:
  availability:
    target: <target-or-not-applicable>
  performance:
    api_latency:
      p95: <threshold-or-not-applicable>
      p99: <threshold-or-not-applicable>
    error_rate: <threshold-or-not-applicable>
  security:
    authentication: <required-or-not-applicable>
    authorization: <required-or-not-applicable>
  reliability:
    retry:
      max_retry: <number-or-not-applicable>
  data_integrity:
    invariant: <invariant-or-not-applicable>
  observability:
    required: [trace_id, structured_log, metric]
```

Every target must identify its owner, measurement, baseline, and gate impact. Use `not-applicable` with a reason when a target does not apply.

## 4. Test Scope

### In Scope

- <feature behavior, public contract, flow, or risk>

### Out of Scope

- <explicit non-goal>

## 5. Risk Assessment

| Risk ID | Risk | Likelihood | Impact | Tier | Mitigation | Required Evidence | Gate Impact | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RISK-001 | <risk> | low/medium/high | low/medium/high | P0/P1/P2 | <mitigation> | <evidence> | blocking/warning/informational | <agent> |

## 6. Test Strategy

### Test Pyramid and Levels (L0-L6)

| Level | Purpose | Required? | Rationale | Owner |
| --- | --- | --- | --- | --- |
| L0 Unit | pure rules and branches | required/deferred/not-applicable | <reason> | unit-test-agent |
| L1 Component | module seams and mocks | required/deferred/not-applicable | <reason> | unit-test-agent |
| L2 API | public contract and boundaries | required/deferred/not-applicable | <reason> | test-editor |
| L3 Integration | service/data composition | required/deferred/not-applicable | <reason> | testing-agent |
| L4 E2E | user journey and cross-layer state | required/deferred/not-applicable | <reason> | e2e-test-agent |
| L5 Performance | workload and capacity | required/deferred/not-applicable | <reason> | performance-test-agent |
| L6 Chaos | controlled fault recovery | required/deferred/not-applicable | <reason> | specialized-check-agent |

### Functional Test

Describe accepted rules and happy, error, edge, limit, and flow branches. Every applicable acceptance criterion needs a scenario or an approved waiver.

### API Contract Test

| Contract | Request Schema | Response Schema | Status/Error Codes | AuthN/AuthZ | Idempotency/Retry | Compatibility | Priority | Evidence | Gate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `<METHOD> <path>` | <schema/version> | <schema/version> | <codes> | <requirements> | <requirements> | <window> | P0/P1/P2 | raw-report/trace | blocking/warning |

Cover valid and invalid requests, authentication, authorization, tenant/object isolation, limits, error shape, and contract compatibility. Do not invent missing fields or codes; record them as gaps.

### Integration Test

List services, databases, queues, caches, external seams, failure injection points, isolation, and expected cross-boundary state.

### E2E and UI Test

For each journey cover applicable empty, loading, success, failure, accessibility, and visual/browser states. Record stable selectors or accessibility roles, browser/device matrix, prerequisites, recovery, cleanup, and screenshot/video/trace evidence.

### Performance, Load, Stress, Spike, Soak, and k6 Workload

Keep the business workload model separate from execution parameters:

```yaml
performance:
  scenario:
    - name: <business-scenario>
      profile: load
      adapter: k6
      business_transaction: <what one actor accomplishes>
      actors: <actor mix and data distribution>
      arrival: <ramp, sustain, and duration>
      dependencies: live/stubbed/mocked
      expectation:
        p95: <milliseconds>
        error_rate: <percentage>
      gate: blocking/warning/informational
```

Assess expected-load, load, stress, spike, soak, capacity, baseline, and regression separately. Write `not-applicable` with a reason when a profile is not required.

### Security Test

Cover authentication, authorization, tenant isolation, session/token expiry, injection, abuse/resource consumption, audit, PII/secrets, and applicable OWASP/API threats.

### Data and Migration Test

Cover valid/invalid/boundary/duplicate/PII fixtures, seed and cleanup, integrity invariants, schema changes, backfill, dual-read/write, mixed versions, forward/backward compatibility, rollback trigger, and recovery evidence.

### Compatibility Test

| Dimension | Matrix | Required? | Evidence | Gate |
| --- | --- | --- | --- | --- |
| API/client | <versions> | required/deferred/not-applicable | <evidence> | blocking/warning |
| Browser/OS/device | <matrix> | required/deferred/not-applicable | <evidence> | blocking/warning |
| Schema/protocol | <versions> | required/deferred/not-applicable | <evidence> | blocking/warning |

### Reliability, Concurrency, and Chaos Test

Specify timeout/retry limits, duplicate submissions, ordering, locking, idempotency, eventual consistency, restart, dependency failure, controlled fault injection, expected final state, and safe recovery. Chaos is required only when the risk and environment justify it.

### Observability Test

Verify trace propagation, structured logs, metrics, alerts, correlation IDs, latency/error dimensions, and redaction of sensitive data.

### Regression Test

Define PR-fast, merge/change-verification, release, and promote/rollback regression sets. Identify the smallest rerun scope and baseline comparison.

## 7. Test Scenario Matrix

| Scenario ID | Given | When | Then | Branches | Acceptance IDs | Data | Environment | Evidence | Gate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | <precondition> | <action> | <expected state> | happy/error/edge/limit/flow | AC-001 | <fixture> | <environment> | <evidence> | blocking |

## 8. Test Data Specification

```yaml
data:
  fixture_version: <version>
  schemas:
    - name: <entity>
      fields: [<field>]
      classes: [valid, invalid, boundary, duplicate, pii]
  seed: <command-or-none>
  cleanup: <command-or-none>
  pii: synthetic-only
  secrets: prohibited
  isolation: <run-or-tenant-namespace>
```

## 9. Test Environment Specification

```yaml
environment:
  id: <environment-id>
  services: [<service>]
  database: <engine-and-schema-version>
  messaging: <broker-or-none>
  external_dependencies: live/stubbed/mocked
  clients: [<browser/device>]
  feature_flags: [<flag>]
  reproducibility: <pinned-fixtures-and-dependency-versions>
```

Record network, clock/time zone, locale, secrets policy, environment differences, and whether an unavailable dependency makes the test `pending` or `blocked`.

## 10. Automation and Tool Selection Plan

| Requirement ID | Level | Profile | Owner | Adapter/Tool | Asset Path | Evidence Type | Gate Impact |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AC-001 | L2 | api-contract | test-editor | selected downstream | tests/bruno/<SPEC-ID>/ | raw-report, trace | blocking |
| AC-002 | L4 | ui-e2e | e2e-test-agent | selected downstream | tests/scenarios/<SPEC-ID>/ | trace, screenshot | blocking |
| PERF-001 | L5 | load | performance-test-agent | k6 adapter | tests/performance/<SPEC-ID>/ | raw-report, gate-report | blocking |

Tools are execution adapters. This section must not claim that an adapter ran.

## 11. CI/CD Gate

| Gate | Required Profiles | Threshold | Required Evidence | Blocking Conditions | Waiver Rule |
| --- | --- | --- | --- | --- | --- |
| PR fast | unit, contract lint | <threshold> | raw-report | invalid artifact or changed unit failure | <owner/expiry> |
| merge/change verification | API, scenario, observability | <threshold> | trace, raw-report | missing/failed/invalid P0/P1 evidence | <owner/expiry> |
| release | declared risk profiles | <threshold> | gate-report | SLO/security/migration/compatibility failure | <owner/expiry> |
| promote/rollback | ready report, rollback | <threshold> | gate-report | no QA acceptance or expired waiver | <owner/expiry> |

## 12. Acceptance Criteria

| Acceptance ID | Feature Spec Requirement | Verification ID/Profile | Expected Evidence | Gate Impact | Status |
| --- | --- | --- | --- | --- | --- |
| AC-001 | <accepted criterion> | <verification id> | <artifact type> | blocking/warning | pending |

## 13. Evidence and Release Decision

- Standard: `specos-test-standard`
- Required owners: `<owner agents>`
- Required evidence: `<types>`
- P0/P1 blocking gaps: block release and merge readiness.
- Raw runner output is not release evidence until normalized under the manifest `resultsDir`.
- Decision: `draft-only | blocked | ready` (execution must be evidenced; never infer `ready` from this plan alone).

## 14. Open Gaps and Waivers

| Gap/Waiver ID | Description | Owner | Reason | Dependency | Expiry | Approval Evidence | Gate Impact | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GAP-001 | <gap or none> | <owner> | <reason> | <dependency> | <date/none> | <evidence/pending> | blocking/warning | open |

## 15. Definition of Done

- [ ] Feature Spec source version and hash/revision are recorded.
- [ ] Test Spec version, status, owner, and approval evidence are recorded.
- [ ] Every acceptance criterion is covered or waived with approval.
- [ ] Applicable profiles are required, deferred, or not-applicable with rationale.
- [ ] Test levels, scenarios, data, environment, owners, adapters, evidence, and gates are explicit.
- [ ] Downstream plan/schedule can map APIs, flows, scenarios, branches, SLOs, policies, and requirements without inventing behavior.
- [ ] No execution result is claimed before normalized evidence exists.
