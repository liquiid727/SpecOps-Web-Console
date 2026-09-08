---
name: ship-it
description: Use when the user requests CI validation, an explicit local WIP checkpoint, or delivery by commit, push, PR, or merge for a GoalSpec or standalone change.
allowed-tools:
  - Bash(git:*)
  - Bash(gh:*)
  - Bash(make:*)
  - Bash(npm:*)
  - Bash(node:*)
---

# GoalSpec Ship / Standalone CI

`ship-it` delivers an already-verified GoalSpec Issue or a change in a local
repository that does not use GoalSpec Issues. The canonical local Issue
remains the source of truth when it exists; GitHub is an optional projection
and must never be assumed from a bare number.

`ship-it` in CI or delivery mode produces one evidence-based `## CI Record`. In GoalSpec
context it validates the existing record and release evidence. In standalone
context it runs the repository's safe, reproducible validation commands and
then produces the record itself.

## Delivery modes

Select the mode from explicit user intent:

| Mode | Actions | External Issue behavior |
|---|---|---|
| ci-only | run safe applicable validation and report | no staging, commit, push, PR, comment, or close |
| checkpoint | commit an explicitly authorized local WIP scope | no delivery, push, PR, comment, or close |
| local | commit the scoped change locally | no push, PR, comment, or close |
| remote | commit and push, optionally create a PR | GitHub Issue is optional |
| remote-merge | commit, push, create/check/merge PR | close only an explicitly mapped Issue |

Do not infer remote operations from “done” or from the existence of a GitHub
CLI. Push, PR creation, merge, and remote Issue closure are state-changing
operations and require explicit authorization.

## Non-delivery checkpoint mode

Use `checkpoint` only when the user explicitly asks to save a local WIP
checkpoint and explicitly identifies the scope as either the whole current
worktree or named paths. It is not a GoalSpec delivery and does not require a
canonical Issue, completed dependencies, evidence, review, or acceptance.

Before staging, inspect `git status --short` and the staged scope for secrets,
credentials, local databases, caches, generated bulky files, or unexpected
paths. Stop and ask if any are present. When the user explicitly authorized the
whole worktree, unrelated changes are part of the checkpoint scope; otherwise
stage only the named paths.

Create a local-only commit whose subject starts `chore(checkpoint):` and whose
body states `WIP checkpoint only; not shipped or delivered.` Do not change any
Issue, review, evidence, acceptance, or Requirement status. Never push, open a
PR, comment, close an external Issue, or describe the checkpoint as verified.

Checkpoint mode ends after the local commit report. The delivery context, CI Record and acceptance gates below do not apply to this mode; never represent it as verified delivery.

## CI-only mode

A request to run CI authorizes validation, not Git writes. Resolve the changed scope and run its safe applicable checks; in GoalSpec use the declared check scope. Report missing QA or release evidence separately from check results, without requiring completed delivery gates before running CI. Then stop before staging or committing. Reuse unchanged valid results with their fingerprints rather than rerunning solely to fill a record.

## Delivery context

For CI or delivery, determine the context before selecting validation or staging:

- `goalspec`: the user supplied or the repository contains a resolvable
  Requirement Workspace and owning Spec Package. Apply the GoalSpec
  preconditions at delivery;
  CI-only uses the declared checks without requiring delivery readiness.
- `standalone`: no GoalSpec selector was supplied and no local Requirement
  Workspace can be resolved. Run the standalone CI flow below. Do not invent
  Spec, Test, Evidence, QA, or Issue identifiers.

If the user explicitly supplied an Issue, `R0NN`, or `S0N` selector and it
cannot be resolved, stop with that blocker; never silently fall back to
standalone context.

Standalone context removes the GoalSpec traceability requirement, not the
requirements for validation, scoped staging, explicit remote authorization,
or honest reporting of skipped checks.

## GoalSpec hard preconditions

Resolve an explicit `R0NN` or `S0N`, or a canonical historical local Issue path.
Read the Requirement Workspace and owning Spec Package before any Git action:

```text
prd.md or issue.md → index.yaml → specs/S0N-<slug>/spec.md
       → evidence/implementation.md
       → optional test.md → review.md → evidence/ → acceptance.md
```

Before GoalSpec delivery (not CI-only), the selected Spec Package MUST have:

- implementation evidence bound to the current entry, Spec version, and tested
  revision, with changed files, checks, deviations, skipped checks, and
  residual risk;
- for a historical Issue selection, current source bindings, satisfied or
  waived dependencies, and a complete Completion Record;
- a matching, approved, non-`stale` Test Design when independent verification is required;
- normalized required evidence under the same child `evidence/` directory and registered in `evidence/index.yaml`;
- a resolved Review Gate with no open blocking finding;
- child `acceptance.md` with `decision: accepted` or `accepted-with-waiver` and
  `promotion: allowed`.

`feature-verify` owns child and root QA decisions. `ship-it` MUST NOT create,
rewrite, or infer `acceptance.md`. A missing, blocked, stale, failed, or
version-mismatched gate stops shipping. A Draft PR is allowed only when the
user explicitly requests one and its body clearly says it is blocked.

## Standalone CI flow

When no local GoalSpec Workspace is available:

1. Inspect `git status`, the current diff, `package.json`, `Makefile`, relevant
   package manifests, `scripts/checks/`, and applicable workflow documentation.
2. Choose validation commands in this order: commands explicitly supplied by
   the user, repository-documented commands, then safe commands declared by
   the changed package. Do not execute publish, deploy, merge, cleanup, or
   other irreversible workflow steps as CI.
3. Run the selected commands and preserve each command, exit result, and
   skipped-check reason. For this repository, the normal root candidates are
   `npm run test` and `npm run build`; use more focused commands when the
   changed area documents them.
4. Treat a non-zero validation command, an unreproducible command, or a
   missing applicable check as a blocker. `not_applicable` is allowed only for
   a documented change type for which no executable check applies.
5. Continue to staging or remote delivery only when the CI Record is complete
   and `change_validation_status: pass` (or a justified `not_applicable` for a
   non-code change). A standalone delivery must never claim GoalSpec QA
   acceptance.

For standalone local commits, use the repository's documented commit style
when one exists. Otherwise use `chore: <short change summary>` and record the
actual message in the CI Record. For standalone PRs, use `Spec trace: not
applicable — no local GoalSpec Issue` and include the complete CI Record.

## CI Record gate

Before staging, read the latest task-relevant CI Record when one exists. A
record registered under a child `evidence/index.yaml` is the execution source
of truth; a CI Record in an implementation evidence is a delivery summary. If
both exist, key-field disagreement blocks shipping. In standalone context,
the record generated by the standalone CI flow is authoritative because there
is no GoalSpec evidence package.

The final report MUST include this structure, filling every field rather than
omitting unknowns:

```markdown
## CI Record
delivery_context: goalspec | standalone
intent_class: change | review | analysis | release
change_validation_status: pass | fail | partial | not_applicable
executed_checks:
  - <command + result; none when applicable>
skipped_checks:
  - <check + reason; none when applicable>
verified_behavior:
  - <observed behavior, or none before verification>
known_limitations_or_residual_risk:
  - <risk, or none>
intentionally_untouched:
  - <area + reason, or none>
git_status_checked: true | false
stage_scope:
  - <related files or directories; none when applicable>
unrelated_changes_excluded: true | false
pre_commit_status: passed | failed | not_run | not_applicable
review_required: true | false
review_status: pending | completed | not_applicable
release_ledger: <path | none>
commit_messages:
  - <actual message; none before commit>
sync_handoff_status: pass | partial | fail | not_applicable
merge_ready: true | false
blocking_items:
  - <blocker or none>
```

Where project policy requires Sync Handoff for semantic changes to specs, rules, agents, skills, workflows, tests, CI gates, or release evidence, `sync_handoff_status` must be `pass` or have an explicit waiver before delivery. In CI-only mode, report missing handoff evidence as a readiness gap without blocking safe diagnostic checks. Projects without this policy record `not_applicable` with that reason. In projects requiring this policy, it may be `not_applicable` only for typo-only,
formatting-only, or comment-only edits, with the reason recorded under
`skipped_checks`.

## Record the delivery target

Before staging, record or resolve:

- in GoalSpec context: canonical Issue ID and absolute local path;
- in GoalSpec context: `spec_id`, Spec version/hash, Test Design version, and
  evidence references;
- in standalone context: repository root, delivery context, executed CI
  commands, and the explicit reason GoalSpec fields are not applicable;
- Review status and QA decision;
- local-only, remote, or remote-merge mode;
- optional GitHub Issue number and its explicit mapping to the local Issue.

Never put `Closes #N` in a PR merely because a number is available. Use it only
when the user supplied or approved the mapping. Without that mapping, the PR
must link the canonical local Issue path and must not close any GitHub Issue.

## Step 1: inspect and stage only the scoped change

```bash
git status
git diff --stat HEAD
git diff -- <implementation files> <tests> <evidence> <Issue file> <review.md>
git add <files related to this Issue>
```

Do not stage unrelated dirty-worktree changes. Do not stage secrets, caches,
generated local state, or another Issue's artifacts.

## Step 2: commit with the canonical Issue ID

In GoalSpec context, use the local ID in the commit message. Add a GitHub
number only when an explicit remote mapping exists:

```bash
git commit -m "Implement ISSUE-R001-S01-001-login"
```

In standalone context, use the repository-defined style or the documented
fallback `chore: <short change summary>`; never fabricate an Issue ID.

If the final commit hash must be recorded in the Completion Record, update the
record in a narrowly scoped follow-up commit or amend only with authorization.
Do not silently rewrite an already reviewed commit.

## Step 3: remote push and PR (remote modes only)

Create a feature branch before pushing when currently on `main`/`master`:

```bash
git checkout -b feat/issue-r001-s01-001-login
git push -u origin feat/issue-r001-s01-001-login
```

The PR body MUST include:

```text
## Summary
- <implementation summary>

## GoalSpec trace
- Local Issue: .requirements/requirements/R001-<slug>/specs/S01-<slug>/issues/ISSUE-R001-S01-001-login.md
- Spec: SPEC-R001-S01-001@<version>
- Test Design: TEST-R001-S01@<version>
- Review: specs/S01-<slug>/review.md
- QA acceptance: specs/S01-<slug>/acceptance.md
- Evidence: specs/S01-<slug>/evidence/<run-id>

## Test plan
- <commands and results>
```

Add `Closes #N` only for the approved explicit mapping. Otherwise omit all
automatic-close keywords.

For standalone context, replace `## GoalSpec trace` with:

```text
## Delivery trace
- Context: standalone
- GoalSpec trace: not applicable — no local GoalSpec Issue
- CI Record: included below with commands and results
```

## Step 4: checks and merge

```bash
gh pr checks
gh pr merge --squash --delete-branch
```

Do not merge with failed checks, unresolved review blockers, missing QA
acceptance or stale evidence in GoalSpec context; in standalone context, do
not merge with failed CI, pending required review, or failed branch
protection. Resolve conflicts and rerun the relevant review/tests before
retrying. When branch protection requires human approval, stop and report the
missing approval.

## Step 5: close the delivery record

After a remote merge in GoalSpec context, update implementation evidence with
the final commit, PR, merge revision, and evidence references. If a historical
local Issue remains in the selected flow, update its Completion Record too. If
an external GitHub Issue was explicitly mapped, add a concise implementation
comment containing:

- canonical entry and Spec Package path, plus any historical local Issue ID;
- Spec/Test Design versions;
- PR and final commit;
- test/evidence summary.

Only close the external Issue if the approved PR mapping or the user's explicit
instruction authorizes it. Neither a local nor GitHub Issue is “QA accepted”
merely because it was closed; preserve the separate implementation-complete,
Spec Package Accepted, and Requirement Done meanings. Do not create a separate
implementation-notes file such as `docs/issue#*.html`; decisions, deviations,
tradeoffs, and open questions stay in the implementation evidence.

## Stop conditions

Stop and report the exact blocker when:

- an explicitly requested entry, local historical Issue, or Spec Package cannot be
  resolved;
- standalone context has no safe, reproducible applicable validation command;
- the CI Record is incomplete, contradictory, failed, or missing required
  Sync Handoff evidence;
- in GoalSpec delivery mode, a required source binding, implementation record,
  Test Design, evidence, or historical Completion Record is missing;
- in GoalSpec delivery mode, `review.md` has an open blocking finding;
- in GoalSpec delivery mode, child QA acceptance is absent, blocked, or promotion is denied;
- the user has not authorized the requested external Git operation;
- the worktree contains unrelated changes that cannot be safely isolated.

The final report names the selected mode, actual actions, results, and skipped
or blocked work. GoalSpec delivery includes the entry, Spec/Test/evidence, QA,
any historical Issue, and external mapping; standalone CI/delivery does not
invent those fields. CI-only reports checks and readiness gaps without Git
writes. Checkpoint reports its authorized paths and local commit, explicitly
not verified or delivered.
