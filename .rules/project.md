# SpecOS Project Rules

## Core Principle

Every meaningful change should preserve the chain:

`draft -> accepted spec -> generated artifact -> test -> review/report`

If a task skips any link in the chain, call that out explicitly.

## Work Intake

- Identify whether the request is draft, spec, implementation, test, CI, or review work.
- Locate the closest source of truth before editing.
- Prefer accepted specs under `spec/`; use `spec-draft/` and `draft/` only as non-final input.
- Record assumptions when the source of truth is incomplete.

## Artifact Rules

- Specs must include goals, non-goals, flows, rules, exceptions, tests, observability, and open questions when applicable.
- API artifacts must include request/response examples and stable error semantics.
- Test artifacts must map to business scenarios and cover happy path, limit cases, and error cases.
- UI artifacts must cover empty, loading, success, and failure states.
- Workflow artifacts must document inputs, outputs, gates, and human approval points.

## Engineering Rules

- Keep changes minimal and aligned with existing directory boundaries.
- Prefer documented templates over ad-hoc formats.
- Do not duplicate canonical rules; link to `rules/` instead.
- Keep generated outputs deterministic and reviewable.
- Protect human-authored drafts, review notes, reports, and task files from accidental overwrite.

## Validation Rules

- Run the most specific available validation for changed code.
- For `spec-web-ui/`, validate with `npm run test` and `npm run build` when frontend behavior changes.
- For documentation and rules, validate by checking links, names, and consistency with the affected workflow.
- If validation is not run, state the reason and the exact command that should be run next.
