# SpecOS

SpecOS is a spec-driven AI workspace for software teams. It treats product intent, engineering rules, agent roles, tests, and delivery artifacts as one traceable system instead of scattered documents and prompts.

The project is building toward an AI IDE experience where teams can define work once, keep it structured, and reuse that context across implementation, review, testing, and delivery.

## Why SpecOS

Most AI-assisted development breaks down when context becomes inconsistent. Requirements live in one place, prompts in another, tests somewhere else, and delivery rules often stay tribal.

SpecOS is designed to make that chain operational:

```text
project memory + change contract -> task plan -> evidence -> accepted project memory
```

That model helps teams:

- keep requirements and generated artifacts aligned
- turn specs into explicit owner-agent tasks before implementation starts
- reuse engineering rules, templates, skills, and agent packs
- export project-ready bundles instead of copying ad-hoc files
- make testing, review, and promotion traceable to the same contract

## What Is In This Repository

This repository currently contains three main product surfaces:

- `packages/cli`: a SpecOS CLI for scaffolding projects, validating bundles, installing exported assets, and running workflow-oriented commands
- `spec-web-ui`: a Next.js workspace for browsing catalog assets, assembling project configurations, and exporting installable bundles
- `test-console`: an early console for working with normalized test plans and execution results

It also includes reusable project assets such as:

- `rules/`: engineering and delivery governance
- `skills/` and `.skills/`: reusable skill packs and local skill assets
- `ai/agents/`: agent role definitions
- `agent-teams/`: reusable agent team packs
- `specs/`, `spec-draft/`, and `tests/`: the SpecOS project memory, task, and evidence backbone

## Current Status

SpecOS is in an active prototype stage. The repository already supports a working end-to-end foundation, but it is not yet a polished general-availability product.

Today you can:

- initialize a SpecOS project skeleton with the CLI
- browse catalog assets in `spec-web-ui`
- select rules, templates, skills, agent roles, and agent team packs
- export review snapshots and installable `.specos-bundle` payloads
- validate and install bundles into a target project
- generate normalized test-plan artifacts from prepared spec inputs

## Quick Start

### 1. Install and build the workspace

```bash
npm install
npm run build
```

### 2. Try the CLI

```bash
node packages/cli/dist/main.js init --template fullstack
node packages/cli/dist/main.js check
```

Other available commands include:

- `init --template spec-only`
- `validate-bundle <path>`
- `install-bundle <path>`
- `list-workflows`
- `run-workflow <workflowId>`
- `generate-test-plan <spec-file> --change <change-id>`

### 3. Run the web workspace

```bash
cd spec-web-ui
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Repository Shape

```text
packages/cli/        CLI entry points and templates
spec-web-ui/         asset catalog, workspace, export UI
test-console/        test-plan and result console
rules/               reusable engineering governance
agent-teams/         reusable agent team packs
ai/agents/           agent role definitions
spec-draft/          draft requirement inputs
specs/               project memory, change workspaces, and evidence archive
tests/               plans, schedules, and result assets
```

## For Contributors

The repository is organized around the SpecOS delivery model: spec layer -> task layer -> evidence layer. If you are contributing implementation or workflow changes, the best starting points are:

- [AGENTS.md](AGENTS.md)
- [rules/README.md](rules/README.md)
- [specs/README.md](specs/README.md)
- [spec-web-ui/README.md](spec-web-ui/README.md)

In general, changes should stay traceable to a draft, a SpecOS contract, a task, a rule, or evidence.
