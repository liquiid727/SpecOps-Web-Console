# Spec Modes

SpecOS supports three official project authoring modes:

- `LiteSpec`: Feature Driven, optimized for agent development efficiency
- `GoalSpec`: Workflow Driven, optimized for a repeatable dual-track loop (prd -> prd-to-spec -> spec approval -> implementation + independent test specification -> review -> ship)
- `EnterpriseSpec`: Delivery Driven, optimized for QA, audit, release, and governance quality

Use these modes as project templates and operating conventions.

## Recommended Fit

`LiteSpec` is the recommended default for:

- AI agent development
- personal projects
- teams with 5 or fewer developers
- MVP delivery
- infrastructure and platform products that need fast iteration

`GoalSpec` is recommended for:

- small teams that already work issue by issue and want a named plan/design/split/implement/review/ship loop
- projects that want explicit review and ship gates but not full role-separated governance
- teams migrating from `LiteSpec` toward `EnterpriseSpec` who aren't ready for the full delivery-evidence apparatus yet

`EnterpriseSpec` is recommended for:

- teams with 20 or more people
- QA-heavy delivery environments
- PM, audit, and compliance workflows
- finance, risk, security, and SaaS systems
- projects that require formal release and rollback evidence

## Default Rule

Default to `LiteSpec`.

Upgrade to `GoalSpec` when the team wants a standing issue-driven loop with versioned Feature Specs, independent Test Specs, review, and ship gates, but doesn't yet need the full EnterpriseSpec audit apparatus.

Upgrade to `EnterpriseSpec` when any of the following is true:

- the feature touches payment, risk, permission, security, audit, or compliance
- formal QA gate evidence is required
- release, rollback, or rollout records are required
- performance, concurrency, or security testing is mandatory
- multiple teams or multiple specialist agents must collaborate
- the feature needs durable delivery evidence beyond a single review pass

## Mode Directories

- [LiteSpec](./LiteSpec/README.md)
- [GoalSpec](./GoalSpec/README.md)
- [EnterpriseSpec](./EnterpriseSpec/README.md)

## CLI

Use `specos init --mode litespec` for the default project shape.

Use `specos init --mode goalspec` when the scaffold should start with the dual-track implementation and independent verification workflow.

Use `specos init --mode enterprisespec` when the scaffold should start with the governed delivery skeleton.

## Shared Rules

All three modes should keep these conventions consistent:

- stable `Spec ID` naming such as `RP-001`
- one durable `design/` truth layer
- an explicit `current/` workspace for active delivery state
- agent loading from `README.md` first, then current state, then design, then feature-specific content
- stable feature ownership and traceability by `Spec ID`

## Modes And The Layered Agent Model

All three modes run on the same layered agent registry in `.agents/manifest.yaml`: `pola` coordinates, the four main agents (`architecture-agent`, `implementation-agent`, `testing-agent`, `qa-agent`) are the only routable entrypoints, and every other role is a specialist opened on demand by its `managed_by` main agent. A mode never changes who routes or who manages whom; it only overlays role behavior for its governance level:

- `LiteSpec` overlays the implementation and testing chains plus `reviewer` for a single-pass, feature-local review. The QA family mostly runs on base prompts; `qa-agent` still owns acceptance, but the evidence stays feature-local.
- `GoalSpec` overlays the dual-track loop end to end. `qa-agent` carries a mode overlay that owns the Review and Ship gates, opening `reviewer`, `ci-editor`, and `deployment-agent` on demand.
- `EnterpriseSpec` overlays all four stages plus the full QA family (`qa-agent`, `reviewer`, `ci-editor`, `deployment-agent`) for categorized evidence, release gates, and explicit waivers.

## Mode Selection Principle

- `LiteSpec`: choose when feature delivery speed and low-token context matter most
- `GoalSpec`: choose when the team wants a repeatable issue-driven loop with review and ship gates, but not full role-separated governance
- `EnterpriseSpec`: choose when delivery traceability, QA rigor, and release governance matter most

## Comparison

| Dimension | LiteSpec | GoalSpec | EnterpriseSpec |
| --- | --- | --- | --- |
| Goal | agent development efficiency | repeatable Spec-driven dual-track loop | enterprise delivery quality |
| Feature isolation | very strong | strong, indexed by issue | moderate |
| Token cost | low | low-to-moderate | high |
| QA model | simplified | review/ship gate, no categorized evidence | full process |
| Test structure | feature-local | feature-local | categorized by test type |
| Review shape | one feature review file | one feature review file, gated by `/review-it` | multi-stage review folders |
| Agent context | small | small, plus issue index | loaded by role |
| Multi-team collaboration | moderate | moderate | strong |
| Auditability | moderate | moderate, traceable by issue | strong |
| Learning cost | low | low-to-moderate | high |

## Short Decision Rule

Use `LiteSpec` when one engineer or one agent can finish a feature end to end with minimal governance overhead.

Use `GoalSpec` when delivery should run through a named plan/design/split/implement/review/ship loop with an explicit issue index, but full delivery-evidence governance isn't needed yet.

Use `EnterpriseSpec` when the project must also prove implementation quality, test evidence, review evidence, and release safety to multiple stakeholders.
