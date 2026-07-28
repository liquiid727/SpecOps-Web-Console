# SpecOS Agent Instructions

This template is draft/spec-first.

- Treat `.prd/` as the editable source for intent.
- Treat `design/` as the stable design source.
- Treat `.features/roadmap.md` and `.features/<SPEC-ID>-<slug>/` as the planning and feature-spec source.
- Keep generated tests and reports traceable to the active `spec_id`.
- Route requests through the four main agents (`architecture-agent`, `implementation-agent`, `testing-agent`, `qa-agent`); open specialist roles only as on-demand subagents under their managing main agent.
