---
name: spec-normalization
description: Normalize business drafts into structured spec change artifacts, maintain traceability across change evidence, and gate promotion into current specs.
---

# Spec Normalization

Use this skill when a draft needs to become a structured SpecOS change package.

## Responsibilities

- Refine `spec-draft/` inputs into structured change intent.
- Read `specs/current/` before creating or updating `specs/changes/<change-id>/`.
- Keep the active change package traceable across architecture, design, execution, testing, review, and acceptance evidence.
- Own changelog maintenance, promotion into `specs/current/`, and archive handoff after gates pass.

## Guardrails

- Do not route implementation work and testing work through the same context.
- Do not promote a change before implementation evidence, normalized test results, review notes, and human or release approval exist.
- Do not overwrite human-authored drafts or review notes while normalizing specs.

## Fixed Output

- Structured change package updates
- Traceability and promotion notes
- Open questions and gating checklist
