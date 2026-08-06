# QA Report — CLI-GUI-024 / Issue #081

## Decision

`accepted-with-waiver`

## Evidence summary

- Independent normalized result: `tests/results/cli-gui-024.issue-081.local.json`.
- Raw browser report: `tests/results/cli-gui-024.issue-081.browser.raw.json`.
- Chromium traces: 50k Transcript, 6k Diff, and four-surface trace artifacts
  under `cli-gui/test-results/`.
- 50k Transcript: load-more p95 `152.74ms` against the approved CLI-GUI-024
  target of `750ms`; scroll max frame `35.5ms`; locate `0.1ms`; 29 rendered
  event nodes; target found; no long tasks.
- 6,003-line Diff: scroll max frame `35.5ms`; locate `0.1ms`; 47 rendered
  line nodes with full scroll geometry; no long tasks.
- Four product-scale surfaces: repeated `3/3`; startup `3.16–3.38s` in the
  repeat run; post-ready interaction long tasks empty.
- Regression suite: typecheck, Vitest `448 passed / 4 skipped`, build,
  `ui:check`, Rust 5 tests, `npx specos check`, normal Playwright `12 passed /
  3 skipped`, and concurrent isolation `3/3`.

## Waiver

The repository has no prior product-scale browser run, so a literal 20%
historical-regression comparison cannot be computed. The approved p95 target is
available and is met by a wide margin; this missing historical baseline is the
only waiver. The synthetic browser fixture is valid local performance evidence,
but it is not packaged Tauri evidence or authenticated Codex/Claude engine
evidence.

## Remaining risks

- Record a stable historical browser baseline on the target CI/browser matrix
  and remove this waiver after a 20% comparison.
- Keep #076 packaged and #082 real-engine gates separate; this decision does
  not promote those blocked gates.
