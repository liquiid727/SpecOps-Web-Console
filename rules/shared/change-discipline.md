# Cross-Surface Change Discipline

## Purpose

Use this rule for any work that changes behavior, contracts, validation,
ownership, or delivery evidence across more than one surface. It makes the
reasoning behind an agent change reviewable without creating a second design
or acceptance process.

## Change profile

Every new Issue declares one `change_profile`:

| Profile | Meaning | Minimum record |
|---|---|---|
| `mechanical` | Formatting, spelling, generated mirror, or equivalent non-semantic edit | Why the edit is mechanical |
| `behavior` | Observable behavior or contract changes | Full execution preflight and closeout |
| `cross-surface` | A semantic change affects two or more governed surfaces | Full execution preflight, surface matrix, and closeout |
| `high-risk` | Security, migration, release, irreversible, or high-blast-radius work | Full execution preflight, surface matrix, closeout, and independent verification |

Do not label a semantic change `mechanical` to avoid a check. If the profile
is uncertain, use the more conservative profile and record the uncertainty.

## Execution preflight

Before implementation, record in the Issue:

1. confirmed facts, with source paths or commands;
2. unverified assumptions and how they will be checked;
3. production consumers or real entry paths;
4. affected surfaces, each with a consumer/entry path and planned check;
5. unrelated worktree changes that must be preserved; and
6. human decisions required, or `None` with rationale.

The supported surface names are `source`, `package-api`, `cli-config`,
`browser-ui`, `generated-output`, `model-visible-output`,
`build-release-artifact`, `persistence-protocol`, and
`security-concurrency-cleanup`. A semantic Issue must include at least one
concrete surface row; `Not applicable` is not a substitute for a real entry
path or planned check.

## Evidence and ownership

- Evidence records identify the observed surface, consumer entry path, and
  a run, service, session, or trace identifier when one exists.
- Product/system decisions belong in PRD, Spec, or stable design. Local
  implementation alternatives belong in the Issue Completion Record. Review
  findings belong in `review.md`; QA decisions belong in `acceptance.md`.
- A workflow cannot create a second review or acceptance state. It may only
  require the existing records to be present and current.

## Honest closeout

Before an Issue advances, its Completion Record states tests executed,
evidence references, alternatives considered, checks skipped, verified
behavior, known limitations or residual risk, and intentionally untouched
areas. Empty fields are not a pass; use `None` or `Not applicable — reason`
when accurate.
