# Architecture Review

## Decision

Use the active Change Workspace as the coordination boundary and add a generated test schedule as the machine-readable split between execution and testing tracks.

## Rationale

- `specs/current/` remains Project Memory.
- `specs/changes/<change-id>/` holds proposed deltas and all lifecycle evidence as a Change Workspace.
- `tests/plans/` remains the semantic test contract.
- `tests/schedules/` records agent isolation, execution mode, unit-test ownership, and independent verification routing without requiring a hosted agent runtime in this slice.

## Boundaries

- Core owns schema-level validation and deterministic artifact builders.
- CLI owns file-oriented commands that read a SpecOS Contract and write generated test artifacts.
- Agents remain documented role contracts until a future runtime can dispatch them directly.

## Risks

- Markdown specs are not yet parsed by the CLI; this slice expects normalized JSON/YAML spec objects.
- UI test execution is represented as a scheduled gap until Playwright assets, selectors, and app startup contracts are formalized.
- Unit tests are treated as execution-track assets because they require implementation context.
- Parallel execution is represented in schedule data before the CLI workflow runner supports native parallel steps.
