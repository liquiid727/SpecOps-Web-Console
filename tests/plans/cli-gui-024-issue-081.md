# CLI-GUI-024 / Issue 081 test matrix

| Requirement | Evidence | Result |
|---|---|---|
| Baseline regression | typecheck, full Vitest, build, ui:check, Rust tests, specos check | passed |
| Transcript projection/reduction | 50,000 synthetic events in Node | warning; informational only |
| Concurrent session isolation | Playwright isolation test, 3 repeats | passed: 3/3 |
| 50k transcript scroll/locate | temporary browser fixture + trace + normalized p95/DOM/long-task/memory data | passed: load-more p95 152.74ms, target 750ms |
| >5000-line Diff | temporary Git browser fixture + trace + normalized scroll/locate/DOM/long-task data | passed: 6,003 lines, 47 rendered rows |
| Combined four-session performance | clean isolated browser run, repeated 3 times | passed: post-ready interaction long tasks empty |

## Recovery conditions

Evidence is recorded in `tests/results/cli-gui-024.issue-081.local.json` and `tests/results/cli-gui-024.issue-081.browser.raw.json`, with Chromium traces under `cli-gui/test-results/`. The approved CLI-GUI-024 performance target is p95 ≤750ms and the observed Transcript load-more p95 is 152.74ms. No historical product-scale browser run was available for the separate 20% regression comparison; QA therefore uses `accepted-with-waiver` until that baseline is established.
