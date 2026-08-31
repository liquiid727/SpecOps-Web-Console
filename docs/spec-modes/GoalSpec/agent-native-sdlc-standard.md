# SpecOS Requirement Workspace Template Standard

Version: 1.0
Scope: PRD / Spec / Spec-Test / Issue / Review / Evidence / Acceptance

## 1. Core flow and ownership

```text
PRD → Spec Packages → Issues → Loop It → Evidence → Spec Acceptance → PRD Acceptance
```

One Requirement Workspace (`R0NN`) records one user or business need. Its PRD
is the product contract; each child Spec Package (`S0N`) is an independently
deliverable and independently acceptable system result.

| Artifact | Question it answers | Owns |
|---|---|---|
| PRD | Why is this needed and what outcome is required? | user/business goals, scope, REQ, rules, AC, package decomposition |
| Spec | How must this result fit the real project? | executable system contract |
| Spec-Test | How do we objectively prove the contract? | verification design, evidence and gate requirements |
| Issue | What is the next bounded unit of work? | implementation or verification work and completion record |
| Evidence | What happened in a real execution? | immutable run facts and artifacts |
| Acceptance | Can this package or requirement advance? | QA/product decision, risk and waiver |

Lower layers MUST NOT silently redefine approved higher-layer behavior. When
implementation reality conflicts with an approved Spec, block the affected
Issue, record a finding or Spec Deviation, revise the Spec, and mark bound Test
Designs and Issues stale before resuming.

## 2. Canonical workspace

The path root is configured by `.specos/manifest.yaml`. New work uses:

```text
.requirements/requirements/R0NN-<slug>/
├── prd.md
├── index.yaml
├── acceptance.md
└── specs/S0N-<slug>/
    ├── spec.md
    ├── test.md
    ├── issues/ISSUE-R0NN-S0N-NNN-<slug>.md
    ├── review.md
    ├── acceptance.md
    └── evidence/
```

`index.yaml` aggregates child package path, status, ownership, dependency,
required flag, covered REQs, and business outcome. A child package owns its
Spec, Test Design, Issues, evidence, review, and QA decision. Do not create a
root `spec.md`, `test.md`, or `issues.md` for new work.

## 3. Stable traceability

| Layer | Format |
|---|---|
| Workspace | `R0NN` |
| Product requirement | `REQ-R0NN-NNN` |
| Business rule / invariant / edge | `BR-` / `INV-` / `EDGE-R0NN-NNN` |
| Acceptance criterion | `AC-R0NN-NNN` |
| Contract behavior | `SPEC-R0NN-S0N-NNN` |
| Test scenario | `TEST-R0NN-S0N-NNN` |
| Issue | `ISSUE-R0NN-S0N-NNN` |
| Review finding | `REVIEW-R0NN-S0N-NNN` |
| Optional evidence anchor | `EV-R0NN-S0N-NNN` |

IDs are permanent after approval. Every Issue has exactly one `primary_spec`;
cross-package references belong in `covers`, never in a second owning package.
Evidence remains addressable by `evidence/index.yaml` and its artifact path or
run ID. `EV-*` is optional and is used only where a stable cross-document
reference is useful.

## 4. PRD: product contract

PRD answers **why** and **what**, not which store, component, directory, or
database abstraction to create. It MUST define Background, Goals, Non-Goals,
Actors, Scope, user/business flows, stable REQ/BR/INV/EDGE/AC IDs, and a
decomposition into independently valuable `S0N` packages.

Every REQ and AC names an observable result. PRD-ready work has resolved
blocking questions, clear boundaries, verifiable acceptance criteria, and a
package decomposition with explicit dependencies. Non-functional goals,
constraints, risks, lifecycle, and UX requirements are required when
applicable; otherwise record `Not applicable` with a reason.

## 5. Spec: repository-grounded implementation contract

A Spec is written after reading the PRD, repository, architecture, existing
code, interfaces, data, and conventions. It describes one independent business
outcome, not a frontend/backend/database directory.

Every `SPEC-*` maps to one or more REQs and defines a public seam, observable
Given/When/Then behavior, authorization, state transitions, data semantics,
error behavior, idempotency/concurrency, side effects, observability, risk and
AC mapping. Applicable sections cover relevant modules, data/API or IPC/CLI
contracts, security, performance, compatibility, migration, rollback, and
implementation constraints. Mark an inapplicable conditional section `Not
applicable` with its rationale.

`spec.md` does **not** contain test IDs, test data, coverage matrices, Issue
lists, or execution results. Those are owned by `test.md`, `issues/`, and
`evidence/` respectively. For change PRDs, each affected Spec includes Added,
Modified, Removed, and testable Unchanged Guarantees.

## 6. Spec-Test and evidence

`test.md` is a verification design bound to the exact approved Spec
version/hash. It maps required REQ/SPEC/BR/INV/EDGE/AC behavior to `TEST-*`
scenarios; defines scope, environment, fixture/seed data, isolation, concrete
Given/When/Then assertions, failure assertions, required evidence, gate impact,
regression scope, flaky handling, and exit criteria.

It selects applicable unit, integration, contract, E2E, security, performance,
compatibility, failure-injection, and exploratory coverage. It never records
final PASS/FAIL results. Execution output is immutable evidence under the same
child package and is registered in `evidence/index.yaml`. Each evidence record
identifies related TEST/SPEC/ISSUE IDs, source version/hash, commit, environment,
time, command or runner, result, artifacts, and flaky classification.

## 7. Issues and Loop It

Issues are one-file, independently understandable, independently executable,
reviewable units. Split by independent vertical behavior, risk profile, or
verification owner; do not create omnibus Issues by document heading or code
layer.

Implementation Issues own code, suitable code-coupled tests, and only the
focused validation commands declared in their `Validation` section. They may
reach `implemented_pending_verification`; they do not claim formal QA
acceptance or run the full Test Design by default.

Verification Issues own formal Test Design execution, normalized evidence,
`evidence/index.yaml` registration, and release-gate results. They do not
silently modify production behavior; a discovered defect returns as a new or
reopened implementation Issue.

Loop It executes approved, version-current Issues in dependency order. It reads
the parent chain, validates dependencies and source bindings, executes only the
Issue's Must scope, records the Completion Record, runs review, and stops for
unresolved blockers. It never redesigns PRD/Spec/Test Design or writes QA
acceptance decisions.

## 8. Versioning, readiness, and done

Approved changes to public Spec behavior increment the Spec version and mark
bound Test Designs and Issues stale or superseded. A stale Issue MUST NOT enter
Loop It. Historical evidence remains bound to its original version and commit.

| Gate | Required condition |
|---|---|
| PRD Ready | product scope/AC/decomposition clear; no blocking question |
| Spec Ready | system contract and conditional technical constraints explicit |
| Test Ready | current Spec binding, coverage and exit criteria approved |
| Issue Ready | bounded scope, current bindings, dependencies and validation explicit |
| Issue Done | local work and Completion Record complete; not a QA decision |
| Spec Accepted | required Issues complete, evidence supports exit criteria, review resolved/waived, mapped AC verified |
| Requirement Done | required Specs accepted, PRD AC/UAT accepted, no blocking question |

QA decisions are only `accepted`, `blocked`, or `accepted-with-waiver`. A waiver
names its risk, owner, approver, rationale, expiry, and follow-up when needed.

## 9. Source order

```text
Approved latest PRD / Change Requirement
↓
Approved child Spec
↓
Architecture / ADR
↓
Actual Code
↓
Existing Tests
```

Before a new Issue, read repository rules and relevant design, then root
`prd.md`/`index.yaml`, child `spec.md`, approved `test.md`, Issue, current
review/evidence/acceptance records, and actual code/tests.
