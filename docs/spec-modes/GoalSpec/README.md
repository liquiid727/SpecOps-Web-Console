# GoalSpec

`GoalSpec` is the workflow-driven SpecOS project mode.

It sits between `LiteSpec` and `EnterpriseSpec`: heavier than a single-feature-directory flow, lighter than a fully role-separated governance model.

It is `Workflow Driven` and optimized for:

- small teams that already work issue by issue
- projects that want explicit review and ship gates without a full QA/audit apparatus
- delivery through a single standing six-step loop instead of ad-hoc feature work

## Core Principle

Use the six-step goal loop as the unit of delivery:

```
/prd -> /prd-to-spec -> /to-issues -> /goal -> /review-it -> /ship-it
```

Every feature enters through `/prd`, gets split into small issues by `/to-issues`, and each issue runs the same implement/review/ship chain before the next one starts.

## Directory Structure

```text
project/
├── README.md
│
├── design/
│   ├── architecture.md
│   ├── domain.md
│   ├── database.md
│   ├── api-guidelines.md
│   ├── deployment.md
│   └── coding-guidelines.md
│
├── current/
│   ├── project-status.md
│   ├── sprint-status.md          # loop status: open / in-progress / in-review / shipped
│   ├── active-context.md
│   └── handoff.md
│
├── specs/
│   ├── roadmap.md
│   ├── issues/
│   │   └── README.md             # issue index produced by /to-issues
│   └── RP-001-feature/
│       ├── spec.md
│       ├── tasks.md
│       ├── tests.md
│       ├── review.md             # /review-it output
│       └── changelog.md          # /ship-it output
│
├── implementation/
│   └── RP-001/                   # changed-surface summary per /goal run
│
├── docs/
│   └── workflow.md                # the six-step loop, written out for this project
│
└── .agents/
    ├── project-context.md
    ├── workflow.md
    ├── backend.skill.md
    ├── frontend.skill.md
    ├── testing.skill.md
    ├── review.skill.md
    └── prompt.skill.md
```

## Six-Step Loop → Directory Map

| Step | Command | Output | Agent role |
| --- | --- | --- | --- |
| Plan | `/prd` | `spec-draft/` | spec-editor |
| Design (optional) | `/prd-to-spec` | `design/` | spec-editor |
| Split | `/to-issues` | `specs/issues/README.md`, `specs/RP-xxx/tasks.md` | spec-editor |
| Implement | `/goal` | `specs/RP-xxx/`, `implementation/RP-xxx/` | implementation-agent |
| Review | `/review-it` | `specs/RP-xxx/review.md` | testing-agent, reviewer |
| Ship | `/ship-it` | commit/PR/merge, `specs/RP-xxx/changelog.md` | ci-editor, deployment-agent |

## Agent Loading Order

1. `README.md`
2. `current/`
3. `design/`
4. `specs/issues/` (which issue is active)
5. `specs/RP-xxx/`

Expected context size: similar to `LiteSpec`, plus the issue index.

## Why GoalSpec Exists

`LiteSpec` has no standing shape for splitting work into issues or gating review/ship; `EnterpriseSpec` requires more governance structure than most small teams need day to day. `GoalSpec` gives a fixed six-step chain — plan, design, split, implement, review, ship — with one file per step's evidence, so delivery is repeatable without adopting full delivery-evidence governance.

## Strengths

- repeatable, named steps for every change (no ad-hoc process)
- explicit issue index keeps parallel work visible without full role separation
- review and ship gates exist by default, unlike `LiteSpec`
- low token cost compared to `EnterpriseSpec`'s role-sliced loading

## Tradeoffs

- no categorized test evidence (unit/e2e/performance/security) — escalate to `EnterpriseSpec` if that's required
- review stays a single file per feature, not a multi-stage `reviews/` tree
- less suited to multi-team parallel work than `EnterpriseSpec`

## Use GoalSpec When

Choose `GoalSpec` when:

- the team already thinks in issues and wants `/to-issues` -> `/goal` -> `/review-it` -> `/ship-it` as the default loop
- `LiteSpec`'s single-file-per-feature flow doesn't provide enough structure for review and delivery tracking
- the project doesn't yet need `EnterpriseSpec`'s categorized QA, audit, and release-evidence apparatus
