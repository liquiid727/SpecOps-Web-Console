# CLI-GUI-032 issue 104 implementation handoff

- Decision: **blocked**.
- Existing implementation: route CRUD, dnd-kit pointer/keyboard sensors, up/down controls, candidate limit, `aria-live`, and edit focus restoration are present in `ModelRoutingSettings`.
- Residual implementation risk: candidate rows expose names but do not independently prove all server-provided exclusion reasons, no-candidate remediation, archive/in-use handling, or route-specific ordering announcements.
- Local verification: focused component/runtime tests, typecheck, `ui:check`, build, and `npx specos check` passed; see `tests/results/cli-gui-032.issue-104.local.json`.
- Blocking gap: pointer/keyboard parity, 1/8 boundaries, duplicate handling, focus/aria-live, EN/ZH long-name responsive behavior, and browser screenshots/traces are absent.

