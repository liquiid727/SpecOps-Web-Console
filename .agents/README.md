# Agents

This directory defines local agent routing and role contracts for SpecOS.

## How To Use

- Start with `manifest.yaml` to choose the correct role.
- Use `roles/` for role-specific responsibilities, inputs, outputs, and guardrails.
- Keep role outputs aligned with canonical assets under `ai/agents/`.
- Prefer assigning one role per bounded task.

## Role Selection

- Spec normalization: `spec-editor`
- Product UI design: `ui-design-agent`
- Architecture and domain boundaries: `ddd-domain-agent`
- API contract generation: `openapi-agent`
- Database and migration planning: `db-migration-agent`
- API scenario tests: `bruno-test-agent`
- UI scenario tests: `playwright-test-agent`
- CI and release gates: `ci-editor`
- Local scripts and workflow wiring: `execution-editor`
- Test structure and coverage: `test-editor`

## Shared Rules

- Every role must cite the spec, draft, rule, or workflow it is using.
- Every output must include open questions when information is missing.
- Role work should be narrow, reviewable, and safe to compose with other agents.
