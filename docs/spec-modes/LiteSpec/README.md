# LiteSpec

`LiteSpec` is the default SpecOS project mode.

It is `Feature Driven` and optimized for:

- AI agent development
- personal projects
- teams with 5 or fewer developers
- MVP delivery
- platform and infrastructure products where feature iteration speed matters

Typical examples include:

- risk platforms
- release centers
- AI gateways

## Core Principle

Use the feature as the smallest execution unit.

Keep context narrow, local, and easy for agents to load in one pass.

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
│   ├── active-feature.md
│   ├── active-context.md
│   ├── active-tasks.md
│   ├── blockers.md
│   └── handoff.md
│
├── specs/
│   ├── roadmap.md
│   ├── _draft/
│   │
│   ├── RP-001-event-ingestion/
│   │   ├── spec.md
│   │   ├── tasks.md
│   │   ├── tests.md
│   │   ├── review.md
│   │   └── changelog.md
│   │
│   ├── RP-002-decision-api/
│   └── RP-003-policy/
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

## Agent Loading Order

Agents should load context in this order:

1. `README.md`
2. `current/`
3. `design/`
4. `specs/RP-xxx/`
5. the relevant skill file such as `backend.skill.md`

Expected context size:

- around 5 to 10 markdown files

## Why LiteSpec Exists

`LiteSpec` reduces agent ambiguity.

Each feature keeps its primary execution context together:

- `spec.md`
- `tasks.md`
- `tests.md`
- `review.md`
- `changelog.md`

This keeps features easy to copy, easy to isolate, and easy to hand off.

## Strengths

- low token cost
- strong feature isolation
- easy agent navigation
- fast onboarding for new features
- minimal governance overhead

## Tradeoffs

- review evidence is simplified
- tests are summarized at feature level
- QA depth is lighter than enterprise delivery workflows
- cross-team governance is weaker than a fully separated delivery model

## Use LiteSpec When

Choose `LiteSpec` when:

- one agent or one engineer can finish the feature end to end
- the project needs high iteration speed
- the team wants the smallest possible context load
- delivery proof can stay close to the feature directory
