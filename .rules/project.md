# SpecOS Project Rules

## Core Principle

Every meaningful change should preserve the chain:

`prd -> child spec -> test design -> issues -> implementation / independent verification -> evidence/review -> acceptance -> ship`

If a task skips any link in the chain, call that out explicitly.

## Work Intake

- Identify whether the request is draft, spec, implementation, test, CI, or review work.
- Locate the closest source of truth before editing.
- Read `docs/spec-modes/GoalSpec/` and the active Requirement Workspace when delivery state affects the task.
- Use `.requirements/requirements/R0NN-<slug>/` as the single source of truth: root `prd.md` / `index.yaml`, then one selected `specs/S0N-<slug>/` with `spec.md`, `test.md`, `issues/ISSUE-*.md`, `review.md`, `evidence/`, and `acceptance.md`.
- Read `design/` as the stable platform and architecture truth.
- Keep implementation decisions in Issue Completion Records and all test plans, schedules, runs, gates, and artifacts under the owning child package `evidence/` directory.
- Record assumptions when the source of truth is incomplete.

## Artifact Rules

- Design docs must remain broad, durable, and singular for a platform or system.
- GoalSpec v2 is the only Agent-Native SDLC contract. Do not add project-mode selectors, overlays, or compatibility paths.
- Requirement Packages must include: meta, goal, why this exists, out of scope, deliverables, domain, application, repository, API, database impact, test plan, and definition of done.
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
