# CLI GUI MVP02 Verification Workflow

## Purpose

This is the CLI GUI application of the repository-wide GoalSpec test standard.
It defines ownership and evidence boundaries for MVP02-A and MVP02-B without
creating a second test system. `tests/` remains the executable evidence location;
this file defines how CLI GUI work enters it.

## Canonical Flow

```text
Feature Spec
  -> independent Test Spec
  -> Test Plan
  -> Schedule
  -> Test Run
  -> Normalized Result
  -> Gate Report
  -> QA Acceptance
```

The same `spec_id`, `spec_version`, `test_spec_version`, and source hash must be
carried through every artifact. A stale or mismatched Test Spec invalidates the
release path even when code tests pass.

## Evidence Levels

| Level | Owner | Output | Release meaning |
|---|---|---|---|
| Implementation-coupled | `implementation-agent`, `unit-test-agent` | module tests and implementation handoff | Proves local behavior at a code seam |
| Independent | `testing-agent` and specialists | normalized `tests/results/*.json` | Proves the public contract and required evidence |
| Real engine | `e2e-test-agent` / `specialized-check-agent` | versioned trace/log/result | Proves a locked vendor path, not a mock |
| Packaged host | `e2e-test-agent`, `playwright-test-agent`, `specialized-check-agent` | artifact/version/trace/screenshot/result | Proves Tauri sidecar/WebView behavior |
| QA acceptance | `qa-agent` | accepted/blocked/accepted-with-waiver | Consumes evidence; does not manufacture it |

## Role Contract

| Agent | Stable inputs | Required outputs | Prohibited actions | Handoff fields | Blocking conditions |
|---|---|---|---|---|---|
| `architecture-agent` | User request, canonical design, roadmap, `.features/`, rules | Architecture decision, scope/non-goals, specialist dispatch, preconditions | Do not promote research or placeholders to support; do not own test execution | `sourceSpec`, `decision`, `affectedSlices`, `delegatedRoles`, `openQuestions`, `nextGate` | Missing source-of-truth or unresolved ownership boundary |
| `ddd-domain-agent` | Approved/rebaseline Feature Spec, platform design, domain rules | Bounded contexts, aggregates, invariants, boundary risks | Do not move orchestration into domain; do not invent unmapped terms | `context`, `entities`, `commands`, `invariants`, `integrationSeams`, `risks` | Product Session/Backend Session/Turn/Attempt ownership is ambiguous |
| `cli-gui-agent` | CLI GUI Feature Spec, `cli-gui/DESIGN.md`, component barrels, runtime ports | UI implementation/design impact, i18n notes, browser checklist | No direct HTTP/WS/Tauri/vendor access in domain components; no fake capability | `changedSurfaces`, `states`, `i18nKeys`, `domContracts`, `commands`, `blockers` | UI state or capability is not backed by a runtime contract |
| `ui-design-agent` | UI Feature/Test Spec, canonical UI rules, existing CLI GUI primitives/patterns | Screen hierarchy, component reuse, responsive/state notes | Do not copy external visual style; do not overwrite canonical platform truth | `screen`, `primitiveReuse`, `states`, `a11y`, `responsive`, `openQuestions` | Missing state/copy/token contract |
| `implementation-agent` | Approved Feature Spec, implementation handoff, design contracts | Production code, implementation-coupled unit tests, validation notes | No independent scenario/result assets; no release claim from local tests | `specId`, `changedFiles`, `unitEvidence`, `localCommands`, `fallbacks`, `remainingRisks` | Spec missing, migration/error semantics unclear, or unit regression |
| `testing-agent` | Approved Feature/Test Spec, plans, schedules, standards, design | Independent strategy, owner map, normalized evidence plan, gap/readiness report | No implementation ownership; no P0/P1 release claim without normalized evidence | `specId`, `testSpecVersion`, `coverageMatrix`, `ownerMap`, `resultPaths`, `rerun`, `blockers` | Test Spec stale, owner/evidence missing, or blocking evidence absent |
| `test-editor` | Feature Spec/Test Spec, production standard, plan/schema templates | Independent Test Spec, plan, schedule, standard matrix, fixture/gate matrix | No implementation-coupled unit ownership; no raw output as evidence | `sourceHash`, `testSpecHash`, `requirements`, `ownerAgent`, `evidence`, `flakePolicy`, `dataPolicy`, `securityPolicy` | Missing branch, owner, evidence type, or stale binding |
| `unit-test-agent` | Public seams plus implementation context, Test Spec requirements | Pure logic/implementation-coupled tests and normalized unit summary | No UI/E2E/API replacement; no private test notes in independent contract | `requirementId`, `target`, `command`, `status`, `coverageRisk`, `artifactRefs` | P0/P1 transition/error branch untested |
| `playwright-test-agent` | Browser Test Spec, DOM contracts, viewport/i18n/a11y requirements | Browser state tests, screenshots, traces, flake classification, normalized scenario result | No frontend implementation edits; no screenshot-only pass | `requirementId`, `flow`, `viewport`, `locale`, `domAssertions`, `artifactRefs`, `flakeClassification` | Missing focus/state/locale evidence, flaky P0, or no trace for required flow |
| `e2e-test-agent` | Business Test Spec, API/runtime contracts, fixtures/cleanup | Cross UI/API/data journey matrix, run, cleanup, normalized result | No duplicate business logic; no bypassing cleanup or server contracts | `journey`, `preconditions`, `actions`, `apiAssertions`, `dataState`, `cleanup`, `artifactRefs` | Journey cannot prove UI/API/data/cleanup together |
| `performance-test-agent` | Performance targets, baseline, synthetic fixtures, environment | 50k transcript/diff/startup/latency run and normalized result | No declaring architectural support as performance proof; no raw-only gate | `baseline`, `workload`, `environment`, `metrics`, `threshold`, `artifactRefs`, `decision` | Missing baseline, exceeded P0/P1 SLO, or unclassified environment limit |
| `concurrency-test-agent` | Invariants, race matrix, session/turn contracts | Duplicate/cancel/approval/retry/concurrent-session results | No replacing deterministic unit tests; no ignoring final-state invariant | `actors`, `requests`, `invariant`, `expectedFinalState`, `observedFinalState`, `artifactRefs` | Invariant failure, nondeterminism, or unclassified race |
| `reviewer` | Feature/Test Spec, implementation handoff, normalized results, rules | Findings, traceability review, approval blockers | No QA acceptance; no waive missing evidence | `severity`, `file`, `finding`, `specRule`, `evidenceRef`, `recommendation` | Correctness/regression, stale chain, or unsafe missing neighbor update |
| `ci-editor` | Plans, schedules, result schema, release rules, package commands | Reproducible commands, schema/gate enforcement, CI handoff | No weakening P0/P1 gate for local convenience; no raw-output promotion | `command`, `scope`, `expectedExit`, `resultPath`, `gateImpact`, `syncHandoffStatus` | Invalid plan/result, missing evidence, unclassified flaky/SLO/concurrency failure |
| `qa-agent` | Feature Spec, implementation notes, reviewer findings, normalized results, Gate Report | `accepted`, `blocked`, or `accepted-with-waiver` and promotion recommendation | Do not create tests/plans/results; do not consume raw runner output; do not decide from checkboxes | `specId`, `evidenceSet`, `decision`, `blockers`, `residualRisk`, `waiverOwner`, `expiry`, `nextGate` | Missing/failed/stale/invalid P0/P1 evidence, packaged/real-engine obligation, or unresolved review blocker |

## Artifact Contract

For each CLI GUI slice:

- Feature Spec: `.features/<SPEC-ID>-<slug>/spec.md`
- Independent Test Spec: `.features/<SPEC-ID>-<slug>/test-spec.md`
- Implementation: `implementation/<SPEC-ID>-mvp02a-foundation.md` plus existing issue notes
- Review entry: `reviews/<SPEC-ID>/review-entry.md`
- Test Plan: `tests/plans/<SPEC-ID>.test-plan.json`
- Schedule: `tests/schedules/<SPEC-ID>.test-schedule.json`
- Normalized run: `tests/results/<SPEC-ID>.<run-id>.json`
- Gate report: `tests/results/<SPEC-ID>.<change-id>.gate-report.json` and
  `reviews/<change-id>/gate-report.md` (the path emitted by `validate-test-gates`)

Every normalized item carries `requirementId`, `ownerAgent`, `evidenceQuality`,
`attempts`, `flakeClassification`, and `artifactRefs`. `artifactRefs` must point
to trace, screenshot, log, raw-report, or gate-report artifacts as required by the plan.

## QA Decision Rules

- `accepted`: all declared blocking evidence is normalized, valid, version-bound, and review findings are closed.
- `blocked`: any required P0/P1 evidence is missing, failed, stale, invalid, flaky without classification, or the declared packaged/real-engine gate did not run.
- `accepted-with-waiver`: only an explicit human-approved waiver may cover a known residual risk; the waiver owner and expiry are mandatory.

Local `npm` output can be attached as a command summary, but it is not a normalized
independent result. `qa-agent` must return `blocked` for this rebaseline until the
missing result and package/engine gates are produced.

## Scope Schedule

1. `CLI-GUI-020..025`: independent contract, UI/E2E, performance, concurrency, real-engine, and packaged checks.
2. `reviewer`: cross-rule and cross-artifact review after normalized results exist.
3. `ci-editor`: validate all plans/results and enforce the gate commands.
4. `qa-agent`: consume the complete evidence set and decide acceptance.

Remote Control stays out of this schedule. It may reuse the local contracts later,
but it cannot be inferred from MVP02-A local evidence.
