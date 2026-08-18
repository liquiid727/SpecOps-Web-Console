# SpecOS

SpecOS is a spec-driven AI workspace for software teams. It keeps product design, feature specs, agent execution, reviews, and tests in one traceable delivery chain instead of scattered prompts and documents.

## Delivery Model

The canonical lifecycle is:

```text
PRD -> Feature Spec (Spec) -> Spec-Test -> Issues -> Code/Test -> Feature Verify -> Ship
```

The canonical repository model is:

```text
.requirements/     Requirement Package workflow root: requirements/R0NN-<slug>/{prd,spec,test,issues}.md, plus templates/, examples/, skills/
design/            one canonical design doc per platform or system
docs/spec-modes/   GoalSpec (Agent-Native SDLC) is the single official mode; plugins/ holds optional variants
archive/legacy/    historical delivery evidence from the previous global-dir model
```

SpecOS favors one durable design document per system and one co-located Requirement Package per requirement. Each package keeps PRD, Spec, Spec-Test, and Issues together so agents can implement end to end without inventing scope.

## What Is In This Repository

This repository currently contains these product surfaces:

- `packages/cli`: CLI scaffolding, validation, bundle install, and workflow entrypoints
- `spec-web-ui`: catalog, export preview, and bundle composition workbench
- `test-console`: normalized test-plan and result console

[Code: Bugrail](https://github.com/liquiid727/bugrail) is a sibling product (CodeG fork). It is not vendored here. Local checkout: `~/code/bugrail`.

It also includes reusable project assets:

- `rules/`: engineering and delivery governance
- `skills/`: reusable developer, content-creator, education, and Codex-customization skill packs
- `ai/agents/`: canonical agent role definitions
- `assets/`: Catalog-ready role, team, skill, and template sources
- `packages/catalog/`: Catalog values, queries, and registry configuration
- `packages/bundler/`: bundle planning and install-target configuration
- `packages/installer/`: validated bundle installation
- `docs/spec-modes/`: project mode guidance (GoalSpec = Agent-Native SDLC, single official mode)
- `.requirements/`, `design/`: the spec delivery backbone; `archive/legacy/` holds historical evidence from the previous model

## Agent Model

SpecOS routes all agent work through a five-category layered model:

- `pola` is the coordinator. It classifies requests and routes them, but does not execute delivery work itself.
- Four main agents are the only user-facing entrypoints: `architecture-agent`, `implementation-agent`, `testing-agent`, and `qa-agent`.
- Every other registered role is a specialist with a `managed_by` owner; main agents open specialists as on-demand subagents.
- `qa-agent` owns final acceptance and release readiness, including `reviewer`, `ci-editor`, and `deployment-agent` work.

The role registry lives in `.agents/manifest.yaml`. Project modes overlay role behavior on top of this hierarchy without changing it.

## Project Modes

SpecOS uses one official project authoring mode:

- [GoalSpec](docs/spec-modes/GoalSpec/README.md): Agent-Native SDLC — PRD → Spec → Spec-Test → Issues → Code/Test → Verify, with co-located Requirement Packages under `.requirements/`

Lighter/heavier governance variants (LiteSpec, EnterpriseSpec) are demoted to optional plugin specs under [docs/spec-modes/plugins/](docs/spec-modes/plugins/). Mode guidance lives in [docs/spec-modes/README.md](docs/spec-modes/README.md). All work runs on the same layered agent registry; the mode overlays role behavior, not the routing hierarchy.

## Current Status

SpecOS is still in active prototype development. The repo already supports scaffolding, catalog browsing, export, and validation, but the lifecycle and templates are still evolving.

Today the intended usage is:

- use the GoalSpec (Agent-Native SDLC) workflow documented in `docs/spec-modes/GoalSpec/`
- create one Requirement Package per requirement under `.requirements/requirements/R0NN-<slug>/` (`prd.md` → `spec.md` → `test.md` → `issues.md`)
- copy templates from `.requirements/templates/` or use the `/requirement-package` skill
- keep stable platform decisions in `design/`
- reference examples under `.requirements/examples/`
- implement and verify against those packages; historical evidence lives read-only in `archive/legacy/`

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

To start with the default GoalSpec workflow:

```bash
npx @specos/cli init --template fullstack --mode goalspec
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
docs/spec-modes/     GoalSpec (Agent-Native SDLC) mode guide; plugins/ optional variants
.requirements/       requirement packages (requirements/, templates/, examples/, skills/)
design/              canonical platform design documents
archive/legacy/      historical delivery evidence from the previous model
```

## For Contributors

Start with:

- [AGENTS.md](AGENTS.md)
- [rules/README.md](rules/README.md)
- [GoalSpec (Agent-Native SDLC) workflow](docs/spec-modes/GoalSpec/README.md)
- [.requirements/ index](.requirements/README.md)
- [spec-web-ui/README.md](spec-web-ui/README.md)

Keep changes traceable to a design doc, requirement package (`prd.md`/`spec.md`), rule, review, or test artifact.
