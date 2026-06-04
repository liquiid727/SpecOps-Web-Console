---
name: execution-implementation
description: Apply accepted change specs to implementation code, scripts, migrations, configuration, and nearby unit tests while keeping validation evidence explicit.
---

# Execution Implementation

Use this skill when accepted change work needs concrete implementation wiring across code, scripts, configuration, or migrations.

## Responsibilities

- Apply accepted change specs to implementation code, scripts, migrations, and configuration.
- Write implementation-coupled unit tests for changed modules.
- Keep local command entrypoints and orchestration wiring aligned with the active change.
- Report validation commands, skipped validation, and implementation risks.

## Guardrails

- Do not own independent E2E, scenario, Bruno, Playwright, or normalized result assets.
- Keep unit tests close to implementation behavior without rewriting spec-level acceptance criteria.

## Fixed Output

- Implementation updates tied to the accepted change
- Local command or orchestration wiring notes
- Implementation-coupled unit test updates
- Validation summary and implementation risk notes
