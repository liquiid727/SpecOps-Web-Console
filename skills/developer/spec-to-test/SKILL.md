---
name: spec-to-test
description: Use when deriving an independent verification design from an approved GoalSpec child Spec Package.
---

# Spec to Test — GoalSpec

Design the Test Design for the [Verification Evidence Handoff](../../ai/workflows/verification-evidence-handoff.md): every TEST needs an observable assertion, owner, evidence type and gate impact, including how not-run and blocked cases are recorded.

Create the verification contract for one child Spec Package. This skill designs coverage and evidence requirements; it does not execute tests, write implementation tests, or record final PASS/FAIL results.

## Canonical input and output

Read one approved child package:

```text
.requirements/requirements/R0NN-<slug>/
├── prd.md
├── index.yaml
└── specs/S0N-<slug>/
    └── spec.md
```

Write the Test Design beside that Spec:

```text
.requirements/requirements/R0NN-<slug>/specs/S0N-<slug>/test.md
```

Start from `.requirements/templates/spec-package/test.md`; do not invent a second Test Design frontmatter schema.

`test.md` is a plan, not an execution report. Actual output belongs in `evidence/{plans,schedules,runs,gates,artifacts}/` and must be registered in `evidence/index.yaml`.

## Required source order

1. `README.md`, `rules/`, `docs/spec-modes/GoalSpec/`, and relevant `design/`;
2. root `prd.md` and `index.yaml`;
3. selected child `spec.md`, including its exact version;
4. testing and release-gate rules;
5. existing child `test.md`, `review.md`, `evidence/`, and `acceptance.md` when updating.

Do not derive expected behavior from private implementation details or from current code when it conflicts with the approved Spec.

## Test contract

Every test scenario uses a stable ID:

```text
TEST-R001-S01-001
```

Allocate the next unused numeric TEST sequence within the child package.
Never reuse or renumber an existing TEST ID.

The `test.md` frontmatter must bind to the exact child Spec version:

```yaml
requirement: R001
spec_package: S01
source_spec: ./spec.md
source_spec_id: SPEC-R001-S01
source_spec_version: 1.0.0
source_spec_hash: <sha256-or-immutable-revision>
status: draft # draft | review | approved | stale | superseded
owner: <owner>
```

The document must include:

- coverage mapping from every P0/P1 `REQ` and `SPEC` to one or more `TEST` IDs,
  including applicable `BR`, `INV`, `EDGE`, and `AC` IDs;
- a concrete public seam, test category, level, test data, environment, setup,
  Given/When/Then actions, observable assertions, failure assertions, required
  evidence, and gate impact (`blocking`, `warning`, or `informational`) for each
  TEST;
- test data, environment assumptions, cleanup/isolation, entry/exit criteria,
  risk tier, and CI/CD Gate Matrix;
- explicit test scope, regression scope, flaky classification policy, and the
  command/runner, commit, timestamp, artifact, and source-binding metadata
  required in each Evidence record; an `EV-*` identifier is optional and never
  replaces `evidence/index.yaml` registration;
- applicable happy path, negative, authorization, state transition, invariant,
  retry/duplicate, concurrency, external failure, audit/observability, and
  exploratory cases;
- a clear distinction between implementation-coupled tests and independent API, scenario, UI/E2E, performance, security, or concurrency evidence.

For Agent behavior or `qualityProfile: agent-workflow`, add an Agent Eval Plan
with a risk- and dataset-justified PR smoke selection, merge/nightly full dataset, metrics,
thresholds, online sampling, trajectory alerts, degradation and handoff
assertions, and the human reviewer for AI-generated cases. Otherwise write
`Not applicable`.

AI-generated cases are drafts only. Require human review of coverage,
assertions, risk tier, dataset, isolation policy, and gate impact before the
Test Design can be approved.

Do not use generic placeholders such as "controlled fixture" or "public
interface exercised" without naming the fixture, command/API/route, input,
expected output, and failure behavior.

## Verification layers and reusable evidence

Distinguish focused implementation checks, package behavior verification, and integrated Foundation/release gates. For each gate, declare its owner, execution phase, scope and invalidating inputs. Follow mandatory project gate rules; where shared gates are allowed, reference one integrated run instead of requiring each package to rerun an identical full suite.

Preserve a result and traceable mapping for every required TEST. One normalized run may cover multiple TESTs and Issues; register references according to the evidence schema rather than duplicating raw output. Reuse requires unchanged relevant source/worktree, command/configuration, dependencies and environment, not just a matching commit label.

Keep scenarios at observable behavior/risk boundaries. Parameterized cases and shared setup may cover related assertions without a separate workflow or artifact for each assertion. Size datasets and repeated runs from risks and required confidence, not a universal count. Do not omit required negative, security, concurrency or release checks.

Record failure handling: production defects return to authorized implementation, test defects require contract-grounded correction, and environment failures block only dependent checks. A failed or pending required gate is never a pass. Changes to these generation guidelines do not alter existing approved Test Designs.

## Version gate

If the source Spec is draft or the Test Design is based on a different Spec
version/hash, mark the existing Test Design `stale` and block release evidence.
When a public Spec changes, diff the affected REQ/SPEC/AC IDs, preserve
unaffected TEST IDs, increment the Test Design version, bind the regenerated
document to the new Spec version/hash, and leave historical evidence unchanged.

## Handoff

```text
approved S0N/spec.md
  → S0N/test.md
  → testing-agent executes the selected verification scope
  → S0N/evidence/
  → S0N/acceptance.md
```
