# SpecOS Agent Instructions

This template is draft/spec-first.

- Read `README.md` first.
- Read `docs/spec-modes/` to confirm whether the project is running `LiteSpec` or `EnterpriseSpec`.
- Read `current/` before touching active delivery work.
- Treat `.prd/` as the editable source for intent.
- Treat `design/` as the stable design source.
- Treat `.features/roadmap.md` and `.features/<SPEC-ID>-<slug>/` as the planning and feature-spec source.
- Keep generated tests and reports traceable to the active `spec_id`.
- Route requests through the four main agents (`architecture-agent`, `implementation-agent`, `testing-agent`, `qa-agent`); open specialist roles only as on-demand subagents under their managing main agent.
