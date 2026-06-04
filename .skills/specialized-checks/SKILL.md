---
name: specialized-checks
description: Run focused smoke, regression, contract, or fixture/setup verification passes that sit outside standard API and scenario E2E tracks.
---

# Specialized Checks

Use this skill when a feature needs targeted verification that does not fit Bruno API tests or standard scenario E2E coverage.

## Responsibilities

- Run smoke, regression, contract, or fixture/setup checks selected for the feature.
- Keep specialized checks tied to accepted specs and named business risks.
- Surface missing setup, flaky dependencies, and incompatible fixtures early.
- Return normalized result entries instead of tool-specific raw output.

## Fixed Output

- Specialized check results
- Setup and fixture notes
- Contract or smoke validation gaps
