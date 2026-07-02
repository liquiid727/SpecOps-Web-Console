# Spec Modes

SpecOS supports two official project authoring modes:

- `LiteSpec`: Feature Driven, optimized for agent development efficiency
- `EnterpriseSpec`: Delivery Driven, optimized for QA, audit, release, and governance quality

Use these modes as project templates and operating conventions.

## Recommended Fit

`LiteSpec` is the recommended default for:

- AI agent development
- personal projects
- teams with 5 or fewer developers
- MVP delivery
- infrastructure and platform products that need fast iteration

`EnterpriseSpec` is recommended for:

- teams with 20 or more people
- QA-heavy delivery environments
- PM, audit, and compliance workflows
- finance, risk, security, and SaaS systems
- projects that require formal release and rollback evidence

## Default Rule

Default to `LiteSpec`.

Upgrade to `EnterpriseSpec` when any of the following is true:

- the feature touches payment, risk, permission, security, audit, or compliance
- formal QA gate evidence is required
- release, rollback, or rollout records are required
- performance, concurrency, or security testing is mandatory
- multiple teams or multiple specialist agents must collaborate
- the feature needs durable delivery evidence beyond a single review pass

## Mode Directories

- [LiteSpec](./LiteSpec/README.md)
- [EnterpriseSpec](./EnterpriseSpec/README.md)

## CLI

Use `specos init --mode litespec` for the default project shape.

Use `specos init --mode enterprisespec` when the scaffold should start with the governed delivery skeleton.

## Shared Rules

Both modes should keep these conventions consistent:

- stable `Spec ID` naming such as `RP-001`
- one durable `design/` truth layer
- an explicit `current/` workspace for active delivery state
- agent loading from `README.md` first, then current state, then design, then feature-specific content
- stable feature ownership and traceability by `Spec ID`

## Mode Selection Principle

- `LiteSpec`: choose when feature delivery speed and low-token context matter most
- `EnterpriseSpec`: choose when delivery traceability, QA rigor, and release governance matter most

## Comparison

| Dimension | LiteSpec | EnterpriseSpec |
| --- | --- | --- |
| Goal | agent development efficiency | enterprise delivery quality |
| Feature isolation | very strong | moderate |
| Token cost | low | high |
| QA model | simplified | full process |
| Test structure | feature-local | categorized by test type |
| Review shape | one feature review file | multi-stage review folders |
| Agent context | small | loaded by role |
| Multi-team collaboration | moderate | strong |
| Auditability | moderate | strong |
| Learning cost | low | high |

## Short Decision Rule

Use `LiteSpec` when one engineer or one agent can finish a feature end to end with minimal governance overhead.

Use `EnterpriseSpec` when the project must also prove implementation quality, test evidence, review evidence, and release safety to multiple stakeholders.
