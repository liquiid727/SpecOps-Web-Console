# EnterpriseSpec

`EnterpriseSpec` is the governed SpecOS project mode.

It is `Delivery Driven` and optimized for:

- large teams
- QA and testing functions
- PM and delivery management
- security review
- compliance and audit
- financial or SaaS delivery environments

## Core Principle

Use delivery evidence as the smallest governance unit.

Keep spec, implementation, tests, reviews, and operations artifacts separated so each role can load only what it owns.

## Directory Structure

```text
project/
├── README.md
│
├── design/
│   ├── architecture.md
│   ├── domain.md
│   ├── database.md
│   ├── deployment.md
│   ├── api-guidelines.md
│   └── security.md
│
├── current/
│   ├── release-status.md
│   ├── sprint-status.md
│   ├── active-feature.md
│   ├── blockers.md
│   ├── decisions.md
│   └── handoff.md
│
├── specs/
│   ├── roadmap.md
│   ├── release-plan.md
│   ├── _draft/
│   ├── RP-001-event-ingestion/
│   │   ├── spec.md
│   │   ├── task-plan.md
│   │   ├── model.md
│   │   ├── api.md
│   │   ├── migration.md
│   │   └── changelog.md
│   └── ...
│
├── implementation/
│   ├── RP-001/
│   │   ├── implementation.md
│   │   ├── migration.md
│   │   ├── rollout.md
│   │   └── rollback.md
│   └── ...
│
├── tests/
│   ├── plans/
│   ├── schedules/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   ├── performance/
│   ├── concurrency/
│   ├── security/
│   ├── api/
│   ├── scenarios/
│   └── results/
│
├── reviews/
│   ├── architecture/
│   ├── implementation/
│   ├── security/
│   ├── qa/
│   ├── release/
│   └── postmortem/
│
├── docs/
│   ├── adr/
│   ├── runbook/
│   ├── operations/
│   └── incidents/
│
└── .agents/
    ├── project-context.md
    ├── workflow.md
    ├── backend.skill.md
    ├── frontend.skill.md
    ├── testing.skill.md
    ├── review.skill.md
    ├── security.skill.md
    ├── performance.skill.md
    ├── release.skill.md
    └── prompt.skill.md
```

## Agent Loading By Role

Agents should not load the entire repository at once.

### Architecture Agent

Load:

- `design/`
- `specs/`
- `reviews/architecture/`

### Implementation Agent

Load:

- `current/`
- `specs/`
- `implementation/`
- `backend.skill.md`

### QA Agent

Load:

- `specs/`
- `tests/`
- `reviews/`
- `testing.skill.md`

### Security Agent

Load:

- `design/security.md`
- `security.skill.md`
- `tests/security/`
- `reviews/security/`

### Release Agent

Load:

- `implementation/`
- `reviews/release/`
- `docs/runbook/`
- rollout and rollback records

## Why EnterpriseSpec Exists

`EnterpriseSpec` is for delivery systems where producing software is not enough.

The project must also prove:

- what changed
- how it was implemented
- how it was tested
- who reviewed it
- how it can be released safely
- how it can be rolled back or operated afterward

## Strengths

- strong QA coverage
- separated test evidence
- multi-stage review support
- better audit and compliance posture
- strong multi-team collaboration
- clearer release and rollback governance

## Tradeoffs

- higher token cost
- more files to maintain
- more role boundaries
- higher learning cost than `LiteSpec`

## Use EnterpriseSpec When

Choose `EnterpriseSpec` when any of the following applies:

- payment, risk, permission, security, or audit scope
- formal QA gates are required
- release, rollout, or rollback evidence is required
- performance, concurrency, or security testing is mandatory
- multiple teams must collaborate
- delivery evidence must stand up to governance or compliance review
