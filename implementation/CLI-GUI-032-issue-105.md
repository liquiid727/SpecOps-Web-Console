# CLI-GUI-032 issue 105 implementation handoff

- Decision: **blocked**.
- Existing implementation: `NewSessionDialog` and `ResolvedRouteControl` consume server-resolved route facts; `PromptComposer` sends an optional `routeOverride` and the owning chat flow clears the fixed selection in `finally`.
- Scope of this pass: verify the existing session/composer seam; no client-side route algorithm or Secret handling was added.
- Local verification: focused component/runtime/resolver tests, typecheck, `ui:check`, build, and `npx specos check` passed; see `tests/results/cli-gui-032.issue-105.local.json`.
- Blocking gap: first/second-send behavior, success/failure/cancel clearing, frozen actual deployment, invalid/no-candidate/unsupported blocking, and browser/Secret negative evidence are absent.

