# SpecOS GoalSpec Requirement Workspace Standard

Version: 2.0
Scope: PRD / Issue / Spec / Test / Evidence / Review / Acceptance

## 1. Core model

```text
PRD or Issue entry → Spec Package → Implementation
                  ↘ Test → Evidence / Review → Acceptance
```

PRD and Issue are peer entry artifacts. A PRD captures a planned product or
business requirement. An Issue captures a precise bug, regression, or local
change with reproduction and expected behavior. Neither is an execution task
list. A Spec is the executable system contract; implementation follows it
directly. Test is an independent verification design. Evidence records facts,
results, quality limitations, and links needed for acceptance.

| Artifact | Owns |
|---|---|
| PRD | product outcome, scope, requirements, acceptance, decomposition |
| Issue | precise defect/change, reproduction, impact, expected result |
| Spec | executable behavior, constraints, invariants, technical boundaries |
| Test | independent scenarios, checks, fixtures, exit criteria |
| Evidence | implementation facts, commands/results, formal runs, risks, quality conclusion |
| Review | findings and required changes |
| Acceptance | QA/product decision and waiver |

Do not create implementation Issues merely to split a Spec. Existing
`specs/*/issues/` files are historical records and remain readable; new work
uses the entry `issue.md` when the change begins as a bug or precise local
request.

## 2. Canonical workspace

```text
.requirements/requirements/R0NN-<slug>/
├── prd.md OR issue.md
├── index.yaml                 # entry_kind: prd | issue
├── acceptance.md
└── specs/S0N-<slug>/
    ├── spec.md
    ├── test.md                 # independent verification, may be drafted later
    ├── review.md
    ├── acceptance.md
    └── evidence/
        ├── implementation.md  # execution facts and minimal checks
        ├── index.yaml
        ├── plans/ runs/ gates/ artifacts/
```

A bug may reference an existing Spec Package. If behavior changes, revise and
version the Spec; do not make the Issue a competing contract.

## 3. Traceability and ownership

Use stable `R0NN`, `REQ-*`, `SPEC-*`, `TEST-*`, `EV-*`, `REVIEW-*`, and
`AC-*` identifiers. A root Issue uses `ISSUE-R0NN` (or a repository-prescribed
local suffix) and is recorded in `index.yaml`; it is not a child implementation
unit. Evidence must identify the applicable entry, Spec version, commit or
revision, environment, command/runner, result, and remaining risk.

## 4. Workflow

1. Accept a PRD or Issue entry and record its scope.
2. Produce one or more independently deliverable child Specs only where
   ownership, lifecycle, or acceptance genuinely differs.
3. Implement directly from the approved Spec. Preserve its goal, invariants,
   non-goals, and observable completion conditions.
4. During ordinary development, record implementation facts and only the
   smallest directly relevant check in `evidence/implementation.md`.
5. Generate and run `test.md` independently when testing, regression, QA,
   release, or risk requires it. Test work must not silently change production
   behavior.
6. Aggregate implementation and verification evidence, review findings, and
   acceptance decisions. Evidence does not itself equal acceptance.

Implementation mode is the default. Do not add tests or broaden validation
just because code changed. After a relevant minimal check passes, stop unless
there is a failure, a new change, or a concrete unresolved concern. Explicit
requests for testing, QA, regression, release, or production readiness switch
the task to verification-focused work.

## 5. Spec contract

A child Spec must define observable seams, Given/When/Then behavior, state and
error semantics, authorization, side effects, observability, constraints,
invariants, non-goals, risk, and acceptance mapping. It must not contain
execution results or duplicate Test/Evidence records. Approved public behavior
changes increment the Spec version and may stale related Test and Evidence.

## 6. Readiness and acceptance

`PRD/Issue Ready` means the entry has a clear outcome or reproducible defect.
`Spec Ready` means implementation can proceed without inventing behavior.
`Implementation Complete` means the Spec was applied and facts were recorded;
it is not QA acceptance. `Evidence Ready` means required verification facts and
limitations are addressable. `Accepted` is recorded only in acceptance files
by the QA/product owner.

Historical R002/R003 packages are not migrated by this standard. New tooling
must not require legacy implementation Issue files for ordinary Spec work.
