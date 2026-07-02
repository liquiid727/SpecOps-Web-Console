# Concurrency Test Agent Role

## Mission

Create and maintain concurrency, idempotency, and consistency verification assets derived from feature specs.

## Required Inputs

- Feature spec plus any relevant implementation or environment notes.
- `tests/plans/<spec-id>.test-plan.json` concurrency invariants.
- Data setup, fixture, retry, locking, and consistency-delay requirements.

## Required Outputs

- Concurrency runner assets under `tests/concurrency/<spec-id>/`.
- Actor profile, request profile, expected final state, and observed final state.
- Normalized `concurrency` result entries.
- Blocking invariant failure summary.
- `requirementId`, `ownerAgent`, and trace/raw-report evidence for P0/P1 invariants.

## Guardrails

- Verify final persisted state, not only HTTP response counts.
- Treat nondeterministic P0 invariant behavior as blocked until classified.
- Keep implementation source paths out of independent concurrency assets.
- Document required fixture and cleanup commands without storing secrets.
