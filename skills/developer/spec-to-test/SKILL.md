---
name: spec-to-test
description: Generate an independent, version-bound Test Spec from an approved Feature Spec. Use for spec-to-test, generate a Test Spec, independent verification, API contract coverage, scenario/E2E design, performance or k6 planning, security/data/compatibility coverage, and release evidence design. Keep the output tool-agnostic and separate from implementation tests and executable runners.
---

# Spec to Test

Derive one independently reviewable Test Spec from one approved Feature Spec. The Feature Spec remains the product, behavior, and public implementation contract; the Test Spec is a versioned verification contract. It must be consumable by the downstream `test-plan`, `test-schedule`, normalized result, and gate-report pipeline without becoming a second source of product truth.

## When to Use

Use this skill after a Feature Spec is approved and its public contracts are stable, or when an accepted legacy Feature Spec is missing its independent Test Spec. Use it to design verification intent, coverage, risk, evidence, and gates. Do not use it to write production code, implementation-coupled unit tests, Bruno collections, Playwright scripts, k6 files, or normalized results; those are downstream deliverables owned by implementation, test-plan, specialist, and CI agents.

## Artifact Boundary

```text
approved Feature Spec
  -> spec-to-test
      -> .features/<SPEC-ID>-<slug>/test-spec.md
          -> test-plan generation
          -> test-schedule and verification Issues
          -> executable adapters and normalized results
          -> review / QA / ship gates
```

| Artifact | Source of truth | Purpose | Owner boundary |
| --- | --- | --- | --- |
| Feature Spec | product intent and accepted public contracts | behavior, rules, APIs, states, acceptance criteria | `prd-to-spec` / spec editor |
| Test Spec | approved Feature Spec version | verification intent, risk, levels, profiles, evidence, gates | this skill / `test-editor` |
| Test Plan | approved Test Spec and Feature Spec | normalized flows, endpoints, scenarios, policies | core/CLI test-plan generator |
| Test Schedule | Test Plan plus Test Spec binding | isolated implementation/testing work tracks | core/CLI scheduler |
| Executable asset | Test Plan and Test Spec | concrete collection, scenario, browser, load, or security asset | specialist test agent |
| Scenario Result | executed asset and environment | normalized run evidence | test runner/adapter |
| Gate Report | matching results and plan requirements | release decision and missing evidence | CI/QA |

## Hard Gate

A release-eligible Test Spec requires all of the following:

- stable `spec_id` and `spec_version`
- Feature Spec status `approved`
- source approval evidence or an authorized automated review record
- source content hash or immutable revision when available
- resolved blocking questions and no unresolved contract conflict
- explicit public contracts for applicable APIs, events, states, errors, limits, acceptance criteria, and performance objectives
- a Test Spec version, status, owner, and approval evidence

If the Feature Spec is `draft` or `in-review`, only create a clearly marked `preview`/`draft` Test Spec when the user explicitly requests it. Preview output cannot produce release-eligible plans, results, or gate evidence. If a legacy codebase has no accepted Feature Spec, use `code-to-spec`, reconcile observed behavior with product intent, then obtain approval before generating a baseline. If code and the accepted Spec disagree, stop and record the conflict; never treat current implementation as the expected behavior.

## Required Inputs

Read, in this order:

1. the approved Feature Spec
2. its source PRD and requirement identifiers when available
3. referenced public API, event, schema, error-code, state-machine, migration, and rule contracts
4. project mode, testing standard, release-gate, and evidence rules
5. the existing Feature-local Test Spec for the same `spec_id`, when updating

Do not read implementation-agent private notes, internal algorithms, source-code structure, or test implementation details to invent expected behavior. Public behavior and accepted contracts are the only expected-behavior source.

## Core Vocabulary

Keep these concepts separate in every generated Test Spec:

| Concept | Meaning | Example |
| --- | --- | --- |
| Test intent | quality risk or behavior being verified | rejected login is rate-limited |
| Test level | depth/layer of verification | L2 API, L4 E2E |
| Test type/profile | shape of the verification | API Contract, Soak, Migration |
| Execution adapter | later concrete tool/runner | Go test, Schemathesis, Playwright, k6, ZAP |
| Evidence type | artifact proving the check | raw-report, trace, log, screenshot, gate-report |
| Gate impact | effect on readiness | blocking, warning, informational |

## Workflow

### 1. Validate the Source Baseline

Record:

- `spec_id`, `spec_version`, Feature Spec path, source hash/revision
- Feature Spec status and approval evidence
- source PRD and covered `US`, `FR`, `AC`, rule, risk, migration, and compatibility identifiers
- public APIs/events/schemas/error codes/state transitions/limits/SLOs
- existing Test Spec version and changed requirements when updating

Stop on missing blocking contracts. Put non-blocking uncertainty in `Open Gaps and Waivers` with owner, reason, dependency, expiry, and gate impact. Never silently invent endpoints, fields, status codes, thresholds, selectors, workflow steps, or business rules.

### 2. Build the Requirement Coverage Matrix

Every accepted requirement and acceptance criterion must map to at least one verification requirement or an explicitly approved waiver:

| Requirement ID | Behavior/contract | Test intent | Level | Type/profile | Priority | Owner | Evidence | Gate impact |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `FR-1` | `POST /decisions` accepts valid request | request/response contract remains compatible | L2 | API Contract | P0 | `test-editor` | raw-report, trace | blocking |
| `AC-3` | rejected decision enters rejected state | failed decision is persisted and observable | L3 | Scenario | P0 | `e2e-test-agent` | trace | blocking |

Preserve stable verification IDs when semantics do not change. A changed requirement, threshold, profile, evidence rule, or gate requires a Test Spec version increment and a new approval record.

### 3. Assess Quality Requirements and Risk

Write measurable quality objectives where applicable:

```yaml
quality:
  availability:
    target: 99.9%
  performance:
    api_latency:
      p95: <200ms
      p99: <500ms
    error_rate: <1%
  security:
    authentication: required
    authorization: object-level and tenant isolation
  reliability:
    retry:
      max_retry: 3
      idempotency: required
  data_integrity:
    invariant: no duplicate order for one idempotency key
  observability:
    required: [trace_id, structured_error, request_latency_metric]
```

For each material risk record likelihood, impact, risk tier (`P0|P1|P2`), mitigation, required evidence, owner, and gate impact. P0/P1 blocking evidence gaps block merge/release readiness. P2 gaps remain visible as warning or informational unless a gate explicitly makes them blocking.

### 4. Select Levels and Profiles by Risk

Use the test pyramid as a decision aid, not a requirement to run every layer for every feature:

```text
                         L4 E2E / UI journey
                    L3 Integration / service composition
                   L2 API / contract / boundary
             L1 Component / module seam     L5 Performance
                    L0 Unit / pure behavior
                              L6 Chaos
```

| Level | Intent | Typical owner/adapter |
| --- | --- | --- |
| L0 Unit | pure rules, branches, errors | implementation track / Go test, pytest |
| L1 Component | module boundary and mocks | unit-test-agent / Go test + mock |
| L2 API | request/response and public contract | test-editor / Bruno, Schemathesis, Dredd |
| L3 Integration | service, DB, queue, external seam | testing-agent / containerized integration runner |
| L4 E2E | user journey and cross-layer state | e2e-test-agent / Playwright |
| L5 Performance | latency, capacity, workload, regression | performance-test-agent / k6 |
| L6 Chaos | controlled fault and recovery | specialized-check-agent / approved fault adapter |

Choose profiles from the Feature Spec and declared risk:

- `functional`: accepted business rules and branch behavior
- `api-contract`: request/response schema, status, authn/authz, errors, idempotency, retry, compatibility
- `scenario`: ordered business stages, state transitions, recovery, compensation, and cleanup
- `integration`: service composition, persistence, queues, caches, and external seams
- `ui-e2e`: empty/loading/success/failure states, accessibility, browser behavior, and visual risk
- `performance`: expected-load latency, throughput, error rate, and baseline regression
- `load`: sustained business workload at expected capacity
- `stress`: behavior beyond capacity, degradation, refusal, consistency, and recovery
- `spike`: sudden arrival-rate increase and stabilization
- `soak`: long-running leak, resource, and degradation behavior
- `concurrency`: duplicate requests, locking, ordering, idempotency, and final-state invariants
- `reliability`: retry, timeout, restart, recovery, and eventual consistency
- `security`: authentication, authorization, tenant isolation, data protection, abuse, and resource exhaustion
- `data`: data shape, integrity, privacy, seed, cleanup, and fixture isolation
- `migration`: forward/backward compatibility, backfill, dual-write/read, rollback, and mixed-version operation
- `compatibility`: client, browser, OS, API, schema, and protocol matrix
- `observability`: trace, log, metric, alert, correlation, and sensitive-data redaction
- `regression`: risk-ranked PR, merge, release, and rollback suites
- `chaos`: only when failure injection is an accepted risk and environment supports safe recovery

Each applicable profile must be explicitly `required`, `deferred` with owner/dependency, or `not-applicable` with a reason. Do not add load, Chaos, migration, or browser testing merely because a tool is available. Do not hide an unassessed profile by deleting its section.

For repository test-plan compatibility, map API contracts to `endpoints[]`, flows to `flows[]`, BDD cases to `scenarios[]`, happy/error/edge/limit/flow to existing branch values, SLOs to `performanceTargets[]`, concurrency invariants to `concurrencyInvariants[]`, evidence/ownership/gates to `standardRequirements[]` and `releaseGates[]`. Preserve profiles such as load/stress/spike/soak/data/chaos in the Test Spec even when a downstream normalized result needs an adapter mapping.

### 5. Define Functional and Scenario Verification

For each business journey, use a structured scenario rather than prose alone:

```yaml
scenario:
  id: SCN-LOGIN-001
  name: 用户登录成功
  priority: P0
  given:
    - 用户存在且账户未锁定
  when:
    - 输入正确密码并提交
  then:
    - 返回 access_token
    - 创建 session
  branches: [happy]
  recovery: none
  cleanup: invalidate session
  acceptance: [AC-LOGIN-001]
  evidence: [raw-report, trace]
```

Cover happy, error, edge, limit, and flow branches where applicable. Include preconditions, ordered steps, expected state transitions, compensation/recovery, cleanup, and acceptance IDs. UI journeys must cover empty, loading, success, and failure states when applicable.

### 6. Design API Contract Tests

For every public API/event, specify:

- method/name/path or event name and contract source (OpenAPI/schema/version)
- request schema, required/optional fields, boundary values, and invalid payloads
- response schema, status codes, error codes, headers, and redaction expectations
- authentication, authorization, tenant/object isolation, and audit behavior
- idempotency, retry, timeout, ordering, rate limits, and resource limits
- backward/forward compatibility and deprecation behavior
- required evidence, owner, priority, and gate impact

A contract test proves the public interface, not the server’s internal call graph.

### 7. Design Integration, E2E, Compatibility, and UI Coverage

Describe service/database/message/cache dependencies, isolation, failure seams, and data boundaries for integration tests. For E2E, map a complete user journey across UI/API/data and list environment prerequisites, selectors or stable accessibility roles, screenshots/video/traces, recovery, and cleanup. Enable browser/client compatibility matrices only when the Feature Spec declares client risk; record browser, OS, device, viewport, locale, and accessibility/visual expectations.

### 8. Design Performance and Business Load Models

Use business transactions, actor profiles, arrival pattern, stages, data distribution, dependency mode, capacity assumptions, and success thresholds. RPS/VUs are derived execution parameters, not the workload definition:

```yaml
performance:
  scenario:
    - name: login_peak
      profile: load
      adapter: k6
      business_transaction: "1000 members authenticate during campaign opening"
      actors: "new and returning members, 70/30 mix"
      arrival: "ramp 0 -> 1000 concurrent users over 2m; sustain 5m"
      data_distribution: "90% valid credentials, 10% invalid"
      dependency_mode: stubbed
      expectation:
        p95: 300ms
        error_rate: <1%
      gate: blocking
```

State whether expected-load, load, stress, spike, soak, capacity, and baseline/regression profiles are required, deferred, or not applicable. k6 is a later adapter; this document defines workload intent and thresholds, not a generated k6 script.

### 9. Design Security, Data, Migration, Reliability, and Observability

Security coverage should address authentication, authorization, tenant boundaries, injection, abuse/resource consumption, secrets/PII, session/token expiry, audit, and relevant OWASP/API threats. Data coverage should define schema, valid/invalid/large/duplicate/PII fixtures, seed/cleanup, isolation, retention, and external dependency mode. Migration coverage should define pre/post schema, backfill, dual-read/write, mixed-version compatibility, rollback trigger, and recovery evidence. Reliability/concurrency coverage should define retry limits, timeout, duplicate submission, ordering, lock/final-state invariants, restart, and eventual consistency. Observability coverage should define trace/log/metric/alert presence, correlation, latency/error dimensions, and redaction.

### 10. Specify Test Data and Environment

Use explicit schemas rather than “some test data”:

```yaml
data:
  fixture_version: v1
  schemas:
    - name: account
      fields: [id, tenant_id, status, credential_state]
      classes: [valid, locked, expired, boundary]
  seed: documented command or none
  cleanup: documented command or none
  pii: synthetic only
  isolation: one tenant and one run namespace

environment:
  id: integration-local
  services: [api, database, queue]
  external_dependencies: stubbed
  database: migration version and engine
  clients: [chromium]
  reproducibility: pinned fixture and dependency versions
```

Record environment differences, secrets policy, network assumptions, clocks/time zones, feature flags, and whether a test is executable, blocked, or pending because the environment is unavailable.

### 11. Define Automation and Tool Selection

For each verification requirement record:

| Intent | Level | Profile | Owner | Adapter/tool | Asset path | Evidence | Gate |
| --- | --- | --- | --- | --- | --- | --- | --- |
| valid login contract | L2 | API Contract | test-editor | tool selected downstream | `tests/bruno/<id>/` | raw-report, trace | blocking |
| campaign load | L5 | load | performance-test-agent | k6 adapter | `tests/performance/<id>/` | raw-report, metrics | blocking |

Tools are adapters, not requirements. Select them later based on repository conventions, target availability, maintainability, and evidence quality. Do not claim execution from a plan or a generated asset.

### 12. Define CI/CD Gates and Regression

Use staged gates:

| Gate | Minimum intent | Typical blocking conditions |
| --- | --- | --- |
| PR fast | schema, static checks, affected unit/component, contract lint | invalid artifacts, missing owners, changed branch failures |
| merge/change verification | P0 API, scenario/E2E, observability, changed risk profiles | missing/failed/invalid P0/P1 evidence, version mismatch, unclassified flaky |
| release | full API/scenario, declared performance/security/migration/compatibility/concurrency | SLO, invariant, security, migration, compatibility, or approval failure |
| promote/rollback | ready gate report, residual-risk and waiver review, rollback evidence | no ready report, expired waiver, missing QA acceptance |

Regression plans should identify PR-fast, merge, release, and rollback suites, changed-risk selection, baseline comparison, and the smallest rerun scope. Raw runner output is not gate evidence until normalized under the manifest’s results directory.

### 13. Review, Approval, and Save

Before saving, check:

- every acceptance criterion is covered or waived with owner, reason, expiry, and approval
- each applicable profile is required, deferred, or not-applicable with rationale
- API, scenario, E2E, performance, security, data, compatibility, observability, and regression contracts are measurable where applicable
- P0/P1 blocking evidence has owner, artifact type, and gate impact
- no expected behavior came from private implementation details
- downstream plan fields can be populated without inventing data

Present the generated Test Spec or a concise review summary. Do not mark it `approved` without human approval or authorized automated review evidence. Save draft/in-review output only as non-release evidence. Save release-eligible output to:

```text
<featuresDir>/<SPEC-ID>-<slug>/test-spec.md
```

Resolve `<featuresDir>` from `.specos/manifest.yaml` `artifacts.specsDir` (default `.features/`); never read or write removed legacy roots. Keep downstream assets separate:

```text
<testsDir>/plans/<SPEC-ID>.test-plan.*
<testsDir>/schedules/<SPEC-ID>.test-schedule.*
<resultsDir>/<SPEC-ID>.<run-id>.*
```

## Test Spec Template

Use the reusable `template-test-spec` asset when available. Keep all sections, even when a section is `not-applicable`:

```markdown
# Test Spec: <SPEC-ID> <Feature>

## Meta
- Spec ID:
- Source Feature Spec:
- Source Spec Version:
- Source Spec Hash/Revision:
- Test Spec Version:
- Status: draft | in-review | approved | stale | superseded
- Quality Profile: backend-api | frontend-ui | fullstack-flow | data-migration | agent-workflow
- Risk Tier: P0 | P1 | P2
- Owner Agent:
- Source Approval Evidence:
- Test Spec Approval Evidence:

## Test Overview
## Test Objective
## Quality Requirements
## Test Scope
## Out of Scope
## Risk Assessment
## Test Strategy
### Test Pyramid and Levels (L0-L6)
### Functional Test
### API Contract Test
### Integration Test
### E2E and UI Test
### Performance, Load, Stress, Spike, Soak, and k6 Workload
### Security Test
### Data and Migration Test
### Compatibility Test
### Reliability, Concurrency, and Chaos Test
### Observability Test
### Regression Test
## Test Scenario Matrix
## Test Data Specification
## Test Environment Specification
## Automation and Tool Selection Plan
## CI/CD Gate
## Acceptance Criteria
## Evidence and Release Decision
## Open Gaps and Waivers
## Definition of Done
```

## Version and Staleness Rules

- Bind each Test Spec to exactly one Feature Spec `spec_id`, version, and source hash/revision.
- Increment Test Spec version when coverage, profile, threshold, evidence, gate, data, or environment requirements change.
- Mark the Test Spec `stale` when its source Feature Spec version/hash changes; mark superseded versions immutable.
- Diff changed requirements and contracts before regenerating; preserve unaffected verification IDs.
- Block plans, results, review, and ship gates when the Test Spec is stale, superseded, unapproved, or mismatched.
- Never rewrite historical results to point to a newer Feature or Test Spec.

## Handoff and Anti-Patterns

After approval, hand the Test Spec to test-plan generation, `/to-issues` verification decomposition, and specialist agents. Live API, integration, E2E, performance, load, security, migration, and Chaos execution waits for a deployable and safe target.

Do not:

- derive expected behavior from implementation details
- invent contracts, thresholds, selectors, or error codes
- generate one test merely because a heading exists
- conflate Test Spec status with execution result status or `plan.source`
- merge implementation and independent verification ownership
- treat raw logs, screenshots, or runner output as normalized gate evidence
- delete a non-applicable section to hide risk assessment
- force load/stress/spike/soak/data/chaos into an incorrect normalized test type

## Quality Checklist

A Test Spec is ready for approval only when it has:

- exact source binding and lifecycle metadata
- complete requirement and acceptance coverage or approved waivers
- explicit Test Objective, Quality Requirements, Scope, and Risk Assessment
- appropriate L0-L6 levels and profile applicability decisions
- executable API, functional, integration, E2E, performance, security, data, compatibility, reliability, observability, and regression intent
- business workload model and measurable thresholds where performance risk applies
- test data/environment specifications and reproducibility constraints
- owners, adapters, evidence types, CI/CD gates, and gate impact
- no private implementation assumptions

## Evaluation Prompts

Use `test-prompts.json` beside this skill for repeatable evaluation. At minimum evaluate:

1. a normal login Feature Spec: API contract, BDD, lock/error/session cases, minimal E2E; no unconditional k6 or Chaos
2. a high-concurrency login/order Feature Spec: actor-based workload model, k6 adapter intent, SLO/capacity, idempotency/concurrency, stress/spike/soak applicability and gates
3. a SaaS/API Feature Spec with security, migration, compatibility, observability, rollback, and regression risks

## Relationship to Other Skills

```text
prd
  -> prd-to-spec
  -> Feature Spec approval
      ├── to-issues -> implementation + implementation-coupled unit tests
      └── spec-to-test -> Test Spec approval -> verification Issues/assets
  -> review-it -> note-it -> ship-it
```

- `prd-to-spec` generates the Feature Spec, not this Test Spec.
- `tdd` governs implementation-coupled unit tests.
- `to-issues` decomposes an approved Test Spec into verification Issues; it does not replace the Test Spec.
- `review-it` and `ship-it` reject stale, mismatched, unapproved, or missing blocking evidence.
