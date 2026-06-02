# Agents

This directory defines local agent routing, role contracts, and scoped skill loading for SpecOS.

## How To Use

- Start with `manifest.yaml` to choose the correct agent role.
- Resolve `role_prompt` paths relative to `.agents/`; resolve `canonical`, `skills[*].path`, and `context_includes` from the repository root unless noted otherwise.
- After selecting a role, only load that role's declared `role_prompt`, `canonical`, `skills`, and `context_includes`.
- Use `roles/` for local role-specific responsibilities, inputs, outputs, and guardrails.
- Keep role outputs aligned with canonical assets under `ai/agents/`.
- Prefer assigning one role per bounded task.

## Role Selection

- Spec normalization: `spec-editor`
- Product UI design: `ui-design-agent`
- Architecture and domain boundaries: `ddd-domain-agent`
- API contract generation: `openapi-agent`
- Database and migration planning: `db-migration-agent`
- API scenario tests: `bruno-test-agent`
- End-to-end business journeys: `e2e-test-agent`
- UI scenario tests: `playwright-test-agent`
- CI and release gates: `ci-editor`
- Local scripts and workflow wiring: `execution-editor`
- Test structure and coverage: `test-editor`

## Dispatch Flow

The default entry agent receives the user request, classifies the work, then routes bounded tasks to the narrowest matching role from `manifest.yaml`. This is a routing contract for agent teams; the current repository stores the contract and role prompts, while concrete runtime dispatch is implemented by the host agent system or future workflow runner.

For a deterministic local route preview, run:

```bash
node packages/cli/dist/main.js route-request --request "<需求文本>"
```

The command returns `requestKind`, `workTypes`, `primaryAgent`, `supportingAgents`, required rules, role-bound skills, and the next lifecycle step. It does not execute the selected agents; it makes the routing decision explicit before intake, implementation, testing, review, or release work starts.

```mermaid
flowchart TD
  A["User request / business context"] --> B["Default entry agent"]
  B --> C["Read context in order: readme, rules, spec-draft, specs, tests, agents"]
  C --> D{"Work type?"}

  D -->|Draft or spec normalization| E["spec-editor"]
  D -->|Domain boundary or invariant| F["ddd-domain-agent"]
  D -->|API contract| G["openapi-agent"]
  D -->|DB migration planning| H["db-migration-agent"]
  D -->|UI design / handoff| I["ui-design-agent"]
  D -->|Test planning| J["test-editor"]
  D -->|API scenario tests| K["bruno-test-agent"]
  D -->|Business E2E journey| L["e2e-test-agent"]
  D -->|UI browser coverage| M["playwright-test-agent"]
  D -->|CI / release gates| N["ci-editor"]
  D -->|Workflow scripts| O["execution-editor"]
  D -->|Review / risk check| P["reviewer"]

  E --> Q{"Output target"}
  F --> Q
  G --> Q
  H --> Q
  I --> Q
  J --> Q
  K --> Q
  L --> Q
  M --> Q
  N --> Q
  O --> Q
  P --> Q

  Q -->|Proposed change| R["specs/changes/<change-id>"]
  Q -->|Accepted source of truth| S["specs/current/"]
  Q -->|Tests and results| T["tests/"]
  Q -->|Scripts / workflows| U["scripts/ or ai/workflows/"]
  Q -->|Review output| V["review findings / open questions"]

  R --> W{"Human approval gate"}
  W -->|Accepted| S
  W -->|Needs work| B
  S --> X["Implementation, test, and review agents read current specs"]
  X --> Y["Report validation evidence and unresolved questions"]
  Y --> Z["Archive completed change under specs/archive/"]
```

## Prompt Assembly

When a role is selected, assemble prompt context in this order:

1. Root `AGENTS.md`
2. `.codex/instructions.md`
3. Selected role metadata from `manifest.yaml`
4. Selected `role_prompt`
5. Selected canonical file under `ai/agents/`
6. Selected declared skills
7. Selected required rules and context includes

## Project Context Placement

Stable project background, architecture facts, and domain language belong under `specs/current/`:

- `specs/current/project-context.md`
- `specs/current/architecture-context.md`
- `specs/current/domain-context.md`

Role prompts should reference these files through `.agents/manifest.yaml` `context_includes` instead of duplicating accepted project facts inside `.agents/roles/` or `ai/agents/`.

## Skill Loading Rules

- Skills are opt-in per role and must be declared in `manifest.yaml`.
- Do not preload repository-local or external skills for unrelated roles.
- If a role has `skills: []`, run it with role docs and rules only.
- For cross-domain work, switch agents or split the task instead of broadening one agent's context.

## Shared Rules

- Every role must cite the current spec, proposed change, draft, rule, or workflow it is using.
- Every output must include open questions when information is missing.
- Role work should be narrow, reviewable, and safe to compose with other agents.
