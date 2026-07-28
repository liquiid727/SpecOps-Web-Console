# SpecOS

SpecOS is a spec-driven AI workspace for software teams. It keeps product design, feature specs, agent execution, reviews, and tests in one traceable delivery chain instead of scattered prompts and documents.

## Delivery Model

The canonical lifecycle is:

```text
Draft -> Design -> Roadmap/Epic -> Feature Spec -> Agent Implementation -> Review -> Merge
```

The canonical repository model is:

```text
docs/spec-modes/  project operating modes: LiteSpec, GoalSpec, and EnterpriseSpec
current/          active delivery workspace for the selected mode
spec-draft/        intake-only requirement drafts
design/            one canonical design doc per platform or system
specs/roadmap.md   epic, release, order, and dependency planning
specs/RP-001-.../  flat feature-spec directories
implementation/    implementation handoff and status by spec id
reviews/           review findings and approval evidence by spec id
tests/             shared verification assets keyed by spec_id
```

SpecOS favors one durable design document per system and many small feature specs. Feature specs stay narrow, explicit, and reviewable so agents can implement them end to end without inventing scope.

## What Is In This Repository

This repository currently contains three main product surfaces:

- `packages/cli`: CLI scaffolding, validation, bundle install, and workflow entrypoints
- `spec-web-ui`: catalog, export preview, and bundle composition workbench
- `test-console`: normalized test-plan and result console

It also includes reusable project assets:

- `rules/`: engineering and delivery governance
- `skills/`: reusable developer, content-creator, education, and Codex-customization skill packs
- `ai/agents/`: canonical agent role definitions
- `assets/`: Catalog-ready role, team, skill, and template sources
- `packages/catalog/`: Catalog values, queries, and registry configuration
- `packages/bundler/`: bundle planning and install-target configuration
- `packages/installer/`: validated bundle installation
- `docs/spec-modes/` and `current/`: project operating mode guidance and active delivery context
- `design/`, `spec-draft/`, `specs/`, `implementation/`, `reviews/`, `tests/`: the spec delivery backbone

## Agent Model

SpecOS routes all agent work through a five-category layered model:

- `pola` is the coordinator. It classifies requests and routes them, but does not execute delivery work itself.
- Four main agents are the only user-facing entrypoints: `architecture-agent`, `implementation-agent`, `testing-agent`, and `qa-agent`.
- Every other registered role is a specialist with a `managed_by` owner; main agents open specialists as on-demand subagents.
- `qa-agent` owns final acceptance and release readiness, including `reviewer`, `ci-editor`, and `deployment-agent` work.

The role registry lives in `.agents/manifest.yaml`. Project modes overlay role behavior on top of this hierarchy without changing it.

## Project Modes

SpecOS now documents three official project authoring modes:

- [LiteSpec](docs/spec-modes/LiteSpec/README.md): feature-driven, low-token, default for daily agent development
- [GoalSpec](docs/spec-modes/GoalSpec/README.md): workflow-driven, with approved Feature Specs branching into implementation Issues and version-bound Test Specs before review and ship
- [EnterpriseSpec](docs/spec-modes/EnterpriseSpec/README.md): delivery-driven, high-governance, for QA-heavy and audited environments

Mode selection guidance lives in [docs/spec-modes/README.md](docs/spec-modes/README.md). All three modes share the same layered agent registry; a mode overlay adjusts role behavior for its governance level, not the routing hierarchy.

## Current Status

SpecOS is still in active prototype development. The repo already supports scaffolding, catalog browsing, export, and validation, but the lifecycle and templates are still evolving.

Today the intended usage is:

- initialize a project baseline with the CLI
- choose the project mode from `docs/spec-modes/`
- keep active delivery state in `current/`
- write intake notes in `spec-draft/`
- keep stable platform decisions in `design/`
- plan feature order and dependencies in `specs/roadmap.md`
- author small feature specs under `specs/<SPEC-ID>-<slug>/`
- implement and review against those specs
- keep tests traceable to `spec_id`

## Quick Start

### 1. Install and build

```bash
npm install
npm run build
```

### 2. Initialize a project

```bash
npx @specos/cli init --template fullstack
npx @specos/cli check
```

To start with the governed enterprise skeleton:

```bash
npx @specos/cli init --template fullstack --mode enterprisespec
```

For local workspace development:

```bash
node packages/cli/dist/main.js init --template fullstack
node packages/cli/dist/main.js check
```

### 3. Run the web workspace

```bash
cd spec-web-ui
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Repository Shape

```text
packages/cli/        CLI entry points
packages/catalog/    catalog values, queries, and registry configuration
packages/bundler/    bundle planning and install-target configuration
packages/installer/  validated bundle installation
packages/templates/  bootstrap template source of truth
spec-web-ui/         asset workbench, export preview, bundle composer
test-console/        normalized test-plan and result console
rules/               reusable engineering governance
assets/              reusable role, team, skill, and template sources
ai/agents/           agent role definitions
docs/spec-modes/     mode playbooks for LiteSpec, GoalSpec, and EnterpriseSpec
current/             active project status and handoff context
spec-draft/          intake drafts
design/              canonical platform design documents
specs/               roadmap, feature specs, rules, templates
implementation/      implementation handoff by spec id
reviews/             review outputs by spec id
tests/               plans, schedules, and results
```

## For Contributors

Start with:

- [AGENTS.md](AGENTS.md)
- [rules/README.md](rules/README.md)
- [specs/README.md](specs/README.md)
- [spec-web-ui/README.md](spec-web-ui/README.md)

Keep changes traceable to a draft, design doc, feature spec, rule, review, or test artifact.
