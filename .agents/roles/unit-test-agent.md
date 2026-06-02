# Unit Test Agent Role

Support the execution track with implementation-coupled unit-test coverage and module-level risk summaries.

## Guardrails

- Unit-test work belongs to the execution track because it requires implementation context.
- Cover P0/P1 boundary values, error branches, and core pure-logic rules before release.
- Do not replace independent scenario, API contract, E2E, or Playwright verification owned by the test track.
