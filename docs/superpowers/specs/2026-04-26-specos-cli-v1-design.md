# SpecOS CLI V1 Design

Date: 2026-04-26
Status: Draft design approved for planning
Source: `todo/SpecOS-AI v1.md`, `readme.md`, `.rules/project.md`

## Purpose

SpecOS CLI V1 turns the current SpecOS idea into an installable Node/TypeScript package that other fullstack projects can use as their AI development baseline.

The package should provide a repeatable chain:

```text
spec-draft -> spec.yaml -> test-plan.json -> Bruno API tests -> Playwright UI tests -> scenario-result.json -> unified report -> CI gate
```

The goal is not to replace coding agents. The goal is to give Codex, Claude Code, Gemini, and similar tools a stable project configuration, artifact contract, and validation path.

## V1 Product Shape

SpecOS V1 ships as an npm package:

```bash
npm install -D @specos/cli
npx specos init
npx specos check
npx specos generate
npx specos report
```

The CLI is fullstack-aware, but the first closed loop prioritizes API and scenario-test correctness because the existing draft already emphasizes API response rules, Redis keys, error codes, UUIDs, DDD structure, middleware, Bruno, and CI checks.

## Repository Structure

The repository should evolve toward this package layout:

```text
packages/
  core/
    schemas/
    validators/
    artifacts/
    workflows/
  cli/
    commands/init.ts
    commands/check.ts
    commands/generate.ts
    commands/report.ts
  templates/
    fullstack/
      .specos/
      rules/
      skills/
      ai/agents/
      spec-draft/
      spec/
      tests/
spec-web-ui/
test-console/
```

`packages/core` owns schemas, validators, artifact IO, and workflow contracts.
`packages/cli` owns command parsing, filesystem writes, and user-facing CLI output.
`packages/templates` owns reusable project starter content.
`spec-web-ui` reads and writes the same artifacts defined by `packages/core`.
`test-console` consumes unified scenario results and does not need to know how tests were generated or executed.

## Target Project Layout

After `npx specos init`, a target project should contain:

```text
.specos/
  manifest.yaml
  workflows/
  templates/
AGENTS.md
rules/
skills/
ai/agents/
spec-draft/
spec/
tests/
```

The initialized files must be deterministic, reviewable, and safe to commit. The command must not overwrite human-authored specs, drafts, rules, reports, or review notes without an explicit overwrite flag.

## Core Artifacts

### `.specos/manifest.yaml`

Defines the project baseline:

- project name and type
- frontend and backend stack
- enabled rule packs
- enabled agent templates
- artifact directories
- workflow names
- CI check command
- optional provider configuration references

Provider secrets must not be written to the manifest.

### `spec.yaml`

The machine-readable SpecOS Contract. It must include:

- stable spec id and version
- goals and non-goals
- actors
- user flows
- system flows
- business rules
- edge cases
- API contracts when relevant
- UI route or flow contracts when relevant
- observability expectations
- test coverage expectations
- traceability links back to draft input

### `test-plan.json`

The generated test plan. It must map every case back to the source spec and cover at least:

- happy path
- limit case
- error case
- multi-step flow case

API cases can produce Bruno-compatible skeletons.
UI cases can produce Playwright-compatible skeletons.

### `scenario-result.json`

The unified result format consumed by `test-console`. It must include:

- run id
- spec id and version
- workflow id
- environment
- scenario status
- step status
- assertions
- request and response summaries for API steps
- UI action summaries for browser steps
- trace id or log references when available
- failure reason and suggested next action

## CLI Commands

### `specos init`

Initializes a target project with the SpecOS baseline:

- writes `.specos/manifest.yaml`
- installs template rules and skills
- installs agent role templates
- creates spec draft and SpecOS Contract directories
- creates test plan and result directories
- creates workflow examples
- creates a CI example
- updates or creates `AGENTS.md` with a SpecOS section

The command should be idempotent. Existing human-authored files are preserved unless the user passes an explicit overwrite option.

### `specos check`

Validates the project chain:

- manifest is valid
- required directories exist
- SpecOS Contracts follow schema
- specs contain rules, flows, edge cases, and test coverage expectations
- generated test plans reference valid specs
- scenario results reference valid test plans
- workflows declare inputs, outputs, gates, and human approval points

The command exits non-zero when required links are missing.

### `specos generate`

Generates deterministic artifacts by default:

- `test-plan.json`
- Bruno API test skeletons
- Playwright UI test skeletons
- initial report input files with empty API/UI result collections

If provider configuration is present, the command may perform AI enhancement:

- fill in richer API assertions
- add boundary cases
- add invalid-input cases
- expand multi-step user flows
- explain unresolved assumptions

AI enhancement must never silently replace deterministic artifacts. Changes must remain reviewable.

### `specos report`

Reads scenario results and produces normalized report data for `test-console`.

The command should work even when only API results or only UI results exist. Missing result categories should be represented as empty states rather than errors unless the workflow explicitly requires them.

## UI Integration

`spec-web-ui` should become an artifact editor and selector, not a separate source of truth. It should read and write artifacts through `packages/core` contracts.

`test-console` should consume `scenario-result.json` and report output generated by `specos report`. It should show empty, loading, success, and failure states for scenario runs.

## Workflow Gates

V1 workflows should support human approval points:

```text
draft accepted by human
spec normalized by agent
test plan reviewed by human
tests generated
tests executed
report reviewed
CI gate passed
```

Full automation is intentionally out of scope for V1.

## Error Semantics

CLI errors should be stable enough for CI:

- `SPECOS_MANIFEST_INVALID`
- `SPECOS_SPEC_INVALID`
- `SPECOS_TRACE_MISSING`
- `SPECOS_TEST_PLAN_INVALID`
- `SPECOS_SCENARIO_RESULT_INVALID`
- `SPECOS_WORKFLOW_INVALID`
- `SPECOS_PROVIDER_MISSING`
- `SPECOS_ARTIFACT_EXISTS`

Each error should include:

- code
- message
- file path when applicable
- suggested fix

## Testing Strategy

V1 should cover:

- schema validation unit tests in `packages/core`
- command behavior tests in `packages/cli`
- fixture-based init tests against `packages/templates/fullstack`
- generation tests that compare deterministic output to snapshots or golden fixtures
- report normalization tests from mixed API and UI scenario results

For existing frontend packages, relevant UI changes should continue to use:

```bash
npm run test
npm run build
```

from the affected package directory.

## Non-Goals

V1 does not include:

- full automatic code generation
- a complete agent orchestration platform
- multi-language SDK support
- automatic secret or provider setup
- replacing Codex, Claude Code, Gemini, or rexcli
- publishing the npm package before local package validation works

## Assumptions

- Node/TypeScript is the V1 implementation stack.
- The package name is `@specos/cli` unless changed before publishing.
- Fullstack support means API and UI artifacts share the same spec and report chain.
- AI enhancement is optional and must be disabled by default when provider configuration is absent.
- Bruno and Playwright are the first supported generated test targets.

## Implementation Decisions

- Use npm workspaces for the monorepo because the existing UI packages already use npm lockfiles.
- Use Zod-style runtime schemas in `packages/core` unless implementation inspection finds an existing schema convention to reuse.
- Use a small TypeScript command parser in `packages/cli`; avoid introducing a heavy CLI framework for V1.
- Keep `spec-web-ui` and `test-console` as existing sibling packages during the first CLI implementation, then move them into the workspace only if package sharing requires it.
- Ship a GitHub Actions CI example first, plus a plain shell command documented for other CI systems.
