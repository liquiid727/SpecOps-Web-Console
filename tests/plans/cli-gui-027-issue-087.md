# Test plan — issue 087

Run provider injection/model merge tests and static checks. The local run covers Anthropic/Codex injection, concurrent isolation, no-provider regression, fake AgentBackend `launchArgs`/`launchEnv`, resume reference propagation, model merge precedence, and token-free response/state/logger assertions.

Result: local gates passed with a bounded waiver for real CLI/provider/Tauri execution and later deployment-selected provider behavior. Raw observations: `tests/results/cli-gui-027.issue-087.provider.raw.json`.
