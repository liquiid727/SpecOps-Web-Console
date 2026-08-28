# SpecOS

SpecOS is a spec-driven AI workspace for software teams. It keeps product design, feature specs, agent execution, reviews, and tests in one traceable delivery chain instead of scattered prompts and documents.

## Delivery Model

The canonical lifecycle is:

```text
PRD Workspace -> Spec Packages -> Test Design -> Issue Files
-> Evidence / Review -> QA Acceptance -> PRD Acceptance -> Ship
```

The canonical repository model is:

```text
.requirements/     PRD Workspace root: requirements/R0NN-<slug>/ with root PRD and child Spec Packages
design/            one canonical design doc per platform or system
docs/spec-modes/   GoalSpec (Agent-Native SDLC) delivery guide
```

SpecOS favors one durable design document per system and one co-located PRD Workspace per requirement. A Workspace keeps the root PRD and all child Spec Packages together; each child owns its Spec, test design, Issue files, review, evidence, and QA acceptance.

## What Is In This Repository

This repository currently contains these product surfaces:

- `spec-web-ui`: catalog and local configuration workbench
- `test-console`: normalized test-plan and result console

[Code: Bugrail](https://github.com/liquiid727/bugrail) is a sibling product (CodeG fork). It is not vendored here. Local checkout: `~/code/bugrail`.

It also includes reusable project assets:

- `rules/`: engineering and delivery governance
- `skills/`: reusable developer, content-creator, education, and Codex-customization skill packs
- `ai/agents/`: canonical agent role definitions
- `assets/`: Catalog-ready role, team, skill, and template sources
- `packages/catalog/`: Catalog values, queries, and registry configuration
- `docs/spec-modes/`: GoalSpec (Agent-Native SDLC) delivery guide
- `.requirements/`, `design/`: the GoalSpec delivery backbone

## Agent Model

SpecOS routes all agent work through a five-category layered model:

- `pola` is the coordinator. It classifies requests and routes them, but does not execute delivery work itself.
- Four main agents are the only user-facing entrypoints: `architecture-agent`, `implementation-agent`, `testing-agent`, and `qa-agent`.
- Every other registered role is a specialist with a `managed_by` owner; main agents open specialists as on-demand subagents.
- `qa-agent` owns final acceptance and release readiness, including `reviewer`, `ci-editor`, and `deployment-agent` work.

The role registry lives in `.agents/manifest.yaml`. All work uses the same GoalSpec role hierarchy.

## GoalSpec Delivery

- [GoalSpec](docs/spec-modes/GoalSpec/README.md): Agent-Native SDLC — one PRD Workspace with independently deliverable Spec Packages under `.requirements/`

## Current Status

SpecOS is still in active prototype development. The repo already supports scaffolding, catalog browsing, local configuration, and validation, but the lifecycle and templates are still evolving.

Today the intended usage is:

- use the GoalSpec (Agent-Native SDLC) workflow documented in `docs/spec-modes/GoalSpec/`
- create one PRD Workspace per requirement under `.requirements/requirements/R0NN-<slug>/`: root `prd.md` + `index.yaml` + `acceptance.md`, then one `specs/S0N-<slug>/` package per delivery unit
- copy templates from `.requirements/templates/` or use the `/requirement-package` skill
- keep stable platform decisions in `design/`
- reference examples under `.requirements/examples/`
- implement and verify against those packages.

## Quick Start

### 1. Install and build

```bash
npm install
npm run build
```

### 2. Run the web workspace

```bash
cd spec-web-ui
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

### 4. Run Code: Bugrail

Bugrail lives in a separate repository. From a sibling checkout:

```bash
cd ../bugrail
make init
make dev
```

See [liquiid727/bugrail](https://github.com/liquiid727/bugrail) for desktop
builds and upstream CodeG sync.

## Repository Shape

```text
packages/catalog/    catalog values, queries, and registry configuration
packages/templates/  bootstrap template source of truth
spec-web-ui/         asset and local configuration workbench
test-console/        normalized test-plan and result console
rules/               reusable engineering governance
assets/              reusable role, team, skill, and template sources
ai/agents/           agent role definitions
docs/spec-modes/     GoalSpec (Agent-Native SDLC) delivery guide
.requirements/       requirement packages (requirements/, templates/, examples/, skills/)
design/              canonical platform design documents
```

## For Contributors

Start with:

- [AGENTS.md](AGENTS.md)
- [rules/README.md](rules/README.md)
- [GoalSpec (Agent-Native SDLC) workflow](docs/spec-modes/GoalSpec/README.md)
- [.requirements/ index](.requirements/README.md)
- [spec-web-ui/README.md](spec-web-ui/README.md)

Keep changes traceable to a design doc, root PRD, child Spec Package, rule, review, or evidence artifact. All new work uses the GoalSpec package layout.
