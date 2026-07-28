# Current

`current/` is the active delivery workspace and handoff state for the current project mode.

Use it to record which spec, change package, or issue loop is in flight right now, so agents can load delivery context without re-deriving it from history.

## Expected Content

- Active project mode notes and the in-flight spec or change id.
- Handoff state between primary and specialist agents.
- Pointers into `spec-draft/`, `specs/`, `implementation/`, and `tests/` for the active work.

Keep entries short-lived: when work ships, move durable facts into `design/`, `specs/`, `implementation/`, or `reviews/` and clear the stale state here.
