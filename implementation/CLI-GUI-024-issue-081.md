# CLI-GUI-024 / Issue 081 — Independent verification handoff

## Scope

This handoff covers the product-scale performance and concurrency contract from
`.issues/issue-081-qa-performance-concurrency-baselines.md` and the approved
CLI-GUI-024 Test Spec. The implementation keeps the change bounded to the
Transcript/Diff rendering and the temporary Playwright fixture:

- `cli-gui/client/components/TranscriptPanel.tsx` projects the complete event
  stream but renders only a buffered display window, preserving turn grouping.
- `cli-gui/client/components/inspector-tabs.tsx` renders Diff lines in a fixed
  height window while retaining file/hunk headers and full scroll geometry.
- `cli-gui/server/application.ts` serves non-fork transcript cursors directly
  from the repository instead of rebuilding all prior pages on every request.
- `cli-gui/server/transcript-store.ts` caches unchanged JSONL reads and clears
  the cache on writes/deletes.
- `cli-gui/e2e/fixture-server.ts` provisions an exclusive temporary 50k JSONL
  transcript, a real temporary Git workspace with 6,003 diff lines, and four
  performance sessions when `SPECOS_E2E_PERF=1`.

## Independent evidence

- `tests/results/cli-gui-024.issue-081.browser.raw.json` preserves the raw
  normalized browser metrics and command references.
- Chromium trace artifacts are recorded under
  `cli-gui/test-results/` for the 50k Transcript, 6k Diff, and four-surface run.
- 50,000 Transcript events: 50 page batches, load-more p95 `152.74ms` against
  the approved `750ms` target, scroll max frame `35.5ms`, locate `0.1ms`, target
  found, 29 `.transcript-event` nodes, no long tasks.
- 6,003 Diff lines: scroll max frame `35.5ms`, locate `0.1ms`, 47 `.diff-line`
  nodes, full scroll geometry, no long tasks.
- Four product-scale browser surfaces passed 3/3 repeats. Startup was
  `3.16–3.38s` in the repeat run; post-ready Transcript/Diff interaction had no
  long tasks and the four-session isolation smoke also passed 3/3.

## Regression and waiver

The approved CLI-GUI-024 performance target is p95 ≤750ms; the observed
Transcript cursor p95 is below that target. No prior product-scale browser run
exists in the repository, so a literal 20% historical-regression comparison
cannot be made. QA records `accepted-with-waiver` for this single missing
historical baseline. This local result is not packaged Tauri evidence and does
not cover authenticated real Codex/Claude engine behavior handled by #082.

## Validation commands

`npm --prefix cli-gui run typecheck`, `npm --prefix cli-gui run test`,
`npm --prefix cli-gui run build`, `npm --prefix cli-gui run ui:check`,
`cargo test --manifest-path cli-gui/src-tauri/Cargo.toml`, `npx specos check`,
the normal Playwright suite (`12 passed, 3 skipped`), the product-scale
Playwright suite (`3 passed`), and the concurrent isolation repeat (`3 passed`)
all completed successfully.
