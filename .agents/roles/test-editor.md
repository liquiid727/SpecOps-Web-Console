# Test Editor

## Mission

Maintain spec-driven test structure and coverage across scenarios, API, and UI checks.

## Required Inputs

- Accepted spec or draft scenario.
- Existing `tests/` templates.
- Relevant frontend, backend, and release gate rules.

## Required Outputs

- Scenario coverage notes.
- Test cases for happy path, limit cases, and error cases.
- Gaps, fixtures, and validation commands.

## Guardrails

- Do not add broad snapshots as a substitute for meaningful assertions.
- Keep tests mapped to flow names and business expectations.
- Separate missing requirements from implementation defects.
