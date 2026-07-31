# CLI-GUI-020 Issue 064 Implementation Notes

## Meta

- Spec ID: `CLI-GUI-020`
- Source Issue: `.issues/issue-064-workspace-and-platform-port-migration.md`
- Status: `accepted_local`

## Delivered Files

- `cli-gui/client/lib/platform.ts`: PlatformAdapter interface + WebPlatformAdapter + TauriPlatformAdapter.
- `cli-gui/client/lib/platform.test.ts`: Browser/Tauri picker success, cancel, array result, unavailable dialog tests.
- `cli-gui/client/app/App.tsx`: openFolder via platform.pickFolder(); workspaces loaded via useAppStore (runtime port).
- `cli-gui/client/i18n.tsx`: pickerUnavailable, pickerBusy, pickerTimeout, pickerIntentInvalid keys (en+zh).

## Design Decisions

- Web mode always returns null from pickFolder (no arbitrary filesystem access).
- Tauri mode uses `__TAURI__.dialog.open({ directory: true })` — array result takes first entry.
- Workspace list is fetched from server state via ClientRuntime.sessions.state(), not stored in localStorage.
- `isTauri()` checks both `window.__TAURI__` presence and `VITE_TAURI` env var.

## Validation

- `npm --prefix cli-gui run test -- --run`: 50 files and 388 tests passed.
- Platform tests cover: web-mode null, Tauri success, Tauri cancel (null), Tauri array, Tauri no-dialog.
