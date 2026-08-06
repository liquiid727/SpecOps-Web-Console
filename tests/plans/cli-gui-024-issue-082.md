# CLI-GUI-024 Issue 082 Test Plan

| Area | Evidence | Result | Recovery |
|---|---|---|---|
| Local contracts | focused Vitest | passed, 79 tests | none |
| Type/build/UI governance | npm scripts | passed | none |
| Codex/Claude real smoke | `smoke:real-cli` | blocked, exit 1 | authenticate Codex prompt; use isolated server |
| Stop/Retry/restart/resume | current real trace | blocked | rerun `issue082-stop-retry-smoke.mjs` without occupied hardcoded port |
| Approval/Diff | real engine + browser trace | blocked | writable isolated Git workspace and capture DOM/trace |
| Historical probes | `issue062-real-engine-check.mjs`, `issue082-stop-retry-smoke.mjs` | historical/partial | repeat under current environment |

Raw output is represented only by command/artifact references in the normalized result; it is not treated as release evidence.
