# MVP02-A Issue 083 Gate Plan

| Gate | Source | Current result | Recovery condition |
|---|---|---|---|
| Local regression snapshot | #076/#078/#081/#082 records; specos check; typecheck | Passed locally | Re-run after relevant changes |
| Packaged/Tauri | #076 normalized record | Blocked | Install/use Tauri CLI, build bundle, capture startup/health/restart/shutdown evidence |
| Real retry/approval/diff | #078 normalized record | Blocked | Authenticated real-engine journey with retry, approval, and browser Diff trace |
| Browser performance/concurrency | #081 normalized record | Blocked | Clean fixture server, 50k transcript and >5k diff browser metrics, four-session evidence |
| Dual-engine approval/diff | #082 normalized record | Blocked | Authenticated Codex and Claude traces plus browser approval/Diff evidence |

Required source records:

- `tests/results/cli-gui-025.issue-076.local.json`
- `tests/results/cli-gui-023.issue-078.local.json`
- `tests/results/cli-gui-024.issue-081.local.json`
- `tests/results/cli-gui-024.issue-082.local.json`

The plan does not promote historical `CONDITIONAL` text or issue checkboxes to current pass evidence.
