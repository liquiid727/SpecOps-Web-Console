# CLI-GUI-030 / Issue 096

## Implementation status

Implemented and independently verified the pure Route Resolver boundary.

- `cli-gui/server/model-route-resolver.ts`: preserves system < global < project < session precedence and run override provenance; computes all public exclusion codes with stable order/deduplication; combines Route and Deployment exclusions; blocks invalid fixed targets including no-route legacy fixed overrides; preserves candidate order and positions.
- `cli-gui/server/model-route-resolver.test.ts`: table-driven precedence/sourceTrace, every public exclusion, multi-cause candidates, fixed target safety, legacy/no-route and missing-route semantics, 1/8/9 candidate shape, deterministic timestamp, and static import/I/O boundary checks.

The resolver remains dependency-free at runtime: it consumes only supplied Route and Deployment summaries. It does not start Agent execution, perform fallback, access SecretStore, or perform API/session wiring.

## Evidence and disposition

Independent focused resolver suite: 43 passed. Full suite: 59 files, 540 passed, 4 skipped. Typecheck, lint, `ui:check`, build, `npx specos check`, `git diff --check`, and `/review-it` completed successfully; build emitted only the existing chunk-size warning.

The normalized result is `tests/results/cli-gui-030.issue-096.local.json`; raw local evidence is `tests/results/cli-gui-030.issue-096.route.raw.json`. Browser/platform, packaged-host, cross-process, and real external Provider/engine evidence are not claimed; browser/platform are N/A per the Test Spec. Local QA decision: `accepted`.
