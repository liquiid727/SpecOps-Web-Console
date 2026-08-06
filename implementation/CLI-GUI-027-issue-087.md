# Issue 087 implementation handoff

Implementation was inspected and not changed; this issue adds independent provider-launch coverage in `cli-gui/server/application.test.ts`. The focused provider suite passed 104/104, with typecheck, lint, build, ui:check, and `npx specos check` passing.

Evidence covers dual-protocol PTY injection, concurrent provider isolation, no-provider baseline, fake AgentBackend `launchArgs`/`launchEnv`, resume reference propagation, compatible model merge, and secret-free serialization. Raw observations are recorded at `tests/results/cli-gui-027.issue-087.provider.raw.json`.

状态：accepted-with-waiver locally. The evidence is seam-level and isolated; real CLI/provider behavior, packaged Tauri, and later deployment-selected provider routing remain outside this issue.
