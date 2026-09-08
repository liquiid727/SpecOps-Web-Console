# GoalSpec — Agent-Native SDLC

> GoalSpec treats requirements, contracts, implementation, independent testing,
> evidence, review, and acceptance as one traceable delivery chain.

Canonical standard: [SpecOS GoalSpec Requirement Workspace Standard](agent-native-sdlc-standard.md).

## Core model

```text
PRD or Issue entry → Spec Package → Implementation
                  ↘ Test → Evidence / Review → Acceptance
```

A PRD records a planned product or business outcome. A root Issue records a
precise bug, regression, or local change. They are peer entry artifacts, not
execution task lists. The child Spec is the executable system contract and may
be implemented directly. Test is an independent verification design produced
when testing, QA, regression, release, or risk requires it.

## Canonical workspace

```text
.requirements/requirements/R0NN-<slug>/
├── prd.md OR issue.md
├── index.yaml                 # entry_kind: prd | issue
├── acceptance.md
└── specs/S01-<slug>/
    ├── spec.md
    ├── test.md                # optional independent verification design
    ├── review.md
    ├── acceptance.md
    └── evidence/
        ├── implementation.md
        ├── index.yaml
        └── plans/ runs/ gates/ artifacts/
```

Existing `specs/*/issues/ISSUE-*.md` files remain readable as historical
delivery records. New work does not create implementation Issues merely to
split a Spec. When a change begins as a precise bug or local request, use the
root `issue.md` entry.

## Stable identifiers

| Artifact | Identifier |
|---|---|
| Requirement Workspace | `R0NN` |
| Product requirement | `REQ-R0NN-NNN` |
| Spec Package | `S0N` |
| Contract behavior | `SPEC-R0NN-S0N-NNN` |
| Test scenario | `TEST-R0NN-S0N-NNN` |
| Root Issue entry | `ISSUE-R0NN` or repository-defined local suffix |
| Review finding | `REVIEW-R0NN-S0N-NNN` |
| Evidence reference | `EV-R0NN-S0N-NNN` |

IDs are stable and are not reused or reordered. Evidence binds the entry,
Spec version, revision, environment, result, and available correlation IDs.

## Delivery lifecycle

Use `prd` for product requirements and `to-issues` for precise bugs,
regressions, and local changes. A bug covered by an existing approved Spec can
proceed to authorized repair against that contract. Use `prd-to-spec` when the
contract is missing or changes; a small repair does not require a duplicate Spec.

1. Accept a PRD or root Issue entry.
2. Produce independently deliverable child Specs only where ownership,
   lifecycle, or acceptance differs.
3. Implement directly from the approved Spec and record implementation facts
   plus the smallest relevant checks in `evidence/implementation.md`.
4. Independently design and execute `test.md` when verification is required;
   store normalized results and artifacts under `evidence/`.
5. Reconcile implementation evidence, verification evidence, and review
   findings before QA/product acceptance.

`Implementation Complete`, `Evidence Ready`, and `Accepted` are separate
states. Passing a local check or completing a historical Issue never creates a
QA decision. Only acceptance records may declare `accepted`, `blocked`, or
`accepted-with-waiver`.

## Change handling

When approved public behavior changes, revise and version the owning Spec and
mark affected Test/Evidence bindings stale. A root Issue may reference an
existing Spec Package, but it never becomes a competing behavioral contract.

Templates under `.requirements/templates/` are the canonical source for new
workspaces. Historical R002/R003 packages and child Issue files are not
retroactively migrated.
