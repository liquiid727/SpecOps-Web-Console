# Design Review

## User Behavior Impact

The workbench gains a dedicated place to inspect reusable agent team packs without forcing users to understand bundle internals first.

## Required States

- Empty: no matching agent team assets are present.
- Loading: catalog and workspace preview resolve normally through existing screens.
- Success: users can inspect, select, export, and install a team pack.
- Failure: existing export validation surfaces remain responsible for missing dependencies or conflicting asset combinations.

## UI Notes

- The dedicated route should feel parallel to `Spec 模版` and `Agent 模版`.
- Asset detail pages should keep the same preview and “send to workspace” interaction used by other assets.
- Export review should call out the need for explicit project reference when `agent-teams/` content is included.
