# Test Spec: CLI-GUI-031

- Source spec: `CLI-GUI-031`, version `1.0`
- Source hash: `9a92056d7eda3aa1d1e6c499237ed5c5b2fd75469fa6e383839ef7ec684b82e8`
- Test goal: prove Task/Attempt state machines, failure/effect classification, exactly-once safe fallback, confirmation, persistence recovery, and redaction.

## Scenarios

- Happy: primary succeeds; clean allowed failure creates exactly one automatic fallback; confirmed retry creates a new Attempt; terminal states and selectedAttemptId are persisted.
- Limit: forbidden failures create one Attempt; fallback disabled/exhausted stops; persistent-to-spawn transport fallback stays within one Attempt; missing usage/cost stays absent.
- Error: invalid transition, revision/token/hash mismatch, cancellation, timeout, approval denial, corrupt middle JSONL line, and incomplete tail follow defined error/recovery semantics.
- Migration: N/A for AppState; verify execution format v1 reader/writer versioning and old sessions without execution files return empty history.
- Security: secret canary absent from execution/transcript/log/API; historical deployment snapshot remains redacted and readable after resource deletion.
- Concurrency: failure vs cancel, duplicate completion frames, confirmation double-click, and repeated clientMessageId produce one task outcome and no duplicate fallback.
- Browser: N/A as implementation gate; expose deterministic persisted summaries/cards for CLI-GUI-032 browser tests.
- Platform: N/A; fault-injection covers transport/runtime boundaries independent of OS.

## Public seam and fixtures

- Seams: execution entities/transitions, JSONL repository, failure/effect normalizer, coordinator, single-Attempt orchestrator, transcript repository, confirmation/cancel API, revision lock.
- Fixtures: every failure class, effect states clean/possible/confirmed/unknown, two deployments, malformed JSONL, canary secret, duplicate events, race barriers.

## Commands and acceptance mapping

- `npm --prefix cli-gui test -- --run server/route-execution-coordinator.test.ts server/execution-store.test.ts server/agent-backends.test.ts server/orchestrator.test.ts server/application.test.ts` -> FR-1/FR-15..24/FR-29 state, fallback, recovery, security, concurrency.
- `npm --prefix cli-gui run typecheck && npm --prefix cli-gui run lint` -> DoD static gates.
- `npx specos check` -> traceability.
- Blocking: exactly-once state/fallback, effect confirmation gate, cancellation races, JSONL recovery, canary redaction.
