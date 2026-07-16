# SpecOS Project Rules

## Core Principle

Every meaningful change should preserve the chain:

`draft -> design -> roadmap/epic -> feature spec -> implementation -> review -> merge`

If a task skips any link in the chain, call that out explicitly.

## Work Intake

- Identify whether the request is draft, spec, implementation, test, CI, or review work.
- Locate the closest source of truth before editing.
- Read `docs/spec-modes/` and `current/` when project mode or active delivery state affects the task.
- Use `spec-draft/` as intake material only.
- Read `design/` as the stable platform and architecture truth.
- Read `specs/roadmap.md` for epic grouping, release order, and spec dependency planning.
- Read feature specs from `specs/<SPEC-ID>-<slug>/spec.md`.
- Keep implementation evidence under `implementation/`, review evidence under `reviews/`, and test evidence under `tests/`.
- Record assumptions when the source of truth is incomplete.

## Artifact Rules

- Design docs must remain broad, durable, and singular for a platform or system.
- `LiteSpec`, `GoalSpec`, and `EnterpriseSpec` are the three documented operating modes. Default to `LiteSpec`; use `GoalSpec` for a standing issue-driven six-step goal loop; use `EnterpriseSpec` when delivery governance requires it.
- Feature specs must include: meta, goal, why this exists, out of scope, deliverables, domain, application, repository, API, database impact, test plan, and definition of done.
- Specs must express dependencies by spec id and prerequisites as upstream contracts already provided.
- API artifacts must include request/response examples and stable error semantics.
- Test artifacts must map to business scenarios and cover happy path, limit cases, and error cases.
- UI artifacts must cover empty, loading, success, and failure states.
- Workflow artifacts must document inputs, outputs, gates, and human approval points.
- Merge readiness requires implementation, review, and test evidence that references the same `spec_id`.

## Engineering Rules

- Keep changes minimal and aligned with existing directory boundaries.
- Prefer documented templates over ad-hoc formats.
- Do not duplicate canonical rules; link to `rules/` instead.
- Prefer feature-sliced specs over broad subsystem specs.
- Keep generated outputs deterministic and reviewable.
- Protect human-authored drafts, review notes, reports, and task files from accidental overwrite.

## Validation Rules

- Run the most specific available validation for changed code.
- For `spec-web-ui/`, validate with `npm run test` and `npm run build` when frontend behavior changes.
- For documentation and rules, validate by checking links, names, and consistency with the affected workflow.
- If validation is not run, state the reason and the exact command that should be run next.
