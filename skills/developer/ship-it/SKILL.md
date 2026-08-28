---
name: ship-it
description: Use when implementation, review, QA acceptance, and verification are complete and the user requests a local commit, remote push, PR, merge, or Issue delivery for a Spec-driven change.
allowed-tools:
  - Bash(git:*)
  - Bash(gh:*)
---

# GoalSpec Ship

`ship-it` delivers an already-verified GoalSpec Issue. The canonical local
Issue remains the source of truth; GitHub is an optional projection and must
never be assumed from a bare number.

## Modes

Select the mode from explicit user intent:

| Mode | Actions | External Issue behavior |
|---|---|---|
| local | commit the scoped change locally | no push, PR, comment, or close |
| remote | commit and push, optionally create a PR | GitHub Issue is optional |
| remote-merge | commit, push, create/check/merge PR | close only an explicitly mapped Issue |

Do not infer remote operations from “done” or from the existence of a GitHub
CLI. Push, PR creation, merge, and remote Issue closure are state-changing
operations and require explicit authorization.

## Hard preconditions

Resolve a canonical local Issue path or an explicit `R0NN`, `S0N`, or Issue ID.
Read the Requirement Workspace and owning Spec Package before any Git action:

```text
prd.md → index.yaml → specs/S0N-<slug>/spec.md
       → test.md → issues/ISSUE-*.md
       → review.md → evidence/ → acceptance.md
```

The local Issue MUST have:

- `primary_spec`, `source_spec_version`, `source_spec_hash`, and `depends_on`;
- all dependencies complete or explicitly waived;
- a complete Completion Record with changed files, tests, evidence, and Spec Deviation;
- a matching, approved, non-`stale` Test Design when independent verification is required;
- normalized required evidence under the same child `evidence/` directory and registered in `evidence/index.yaml`;
- a resolved Review Gate with no open blocking finding;
- child `acceptance.md` with `decision: accepted` or `accepted-with-waiver` and
  `promotion: allowed`.

`feature-verify` owns child and root QA decisions. `ship-it` MUST NOT create,
rewrite, or infer `acceptance.md`. A missing, blocked, stale, failed, or
version-mismatched gate stops shipping. A Draft PR is allowed only when the
user explicitly requests one and its body clearly says it is blocked.

## Record the delivery target

Before staging, record or resolve:

- canonical Issue ID and absolute local path;
- `spec_id`, Spec version/hash, Test Design version, and evidence references;
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

Use the local ID in the commit message. Add a GitHub number only when an
explicit remote mapping exists:

```bash
git commit -m "Implement ISSUE-R001-S01-001-login"
```

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

## Step 4: checks and merge

```bash
gh pr checks
gh pr merge --squash --delete-branch
```

Do not merge with failed checks, unresolved review blockers, missing QA
acceptance, stale evidence, or an unapproved waiver. Resolve conflicts and
rerun the relevant review/tests before retrying. When branch protection
requires human approval, stop and report the missing approval.

## Step 5: close the delivery record

After a remote merge, update the local Issue Completion Record with the final
commit, PR, merge revision, and evidence references. If an external GitHub
Issue was explicitly mapped, add a concise implementation comment containing:

- canonical local Issue ID/path;
- Spec/Test Design versions;
- PR and final commit;
- test/evidence summary.

Only close the external Issue if the approved PR mapping or the user's explicit
instruction authorizes it. A local Issue is not “QA accepted” merely because a
GitHub Issue was closed; preserve the separate `Issue Done`, `Spec Package
Accepted`, and `Requirement Done` meanings. Do not create a separate
implementation-notes file such as `docs/issue#*.html`; decisions, deviations,
tradeoffs, and open questions stay in the Issue Completion Record.

## Stop conditions

Stop and report the exact blocker when:

- the local Issue or parent Spec Package cannot be resolved;
- a dependency, source version/hash, Test Design, evidence, or Completion Record is missing;
- `review.md` has an open blocking finding;
- child QA acceptance is absent, blocked, or promotion is denied;
- the user has not authorized the requested external Git operation;
- the worktree contains unrelated changes that cannot be safely isolated.

The final report must name the mode, canonical Issue, commit/PR/merge result,
Spec/Test/evidence references, QA decision, external Issue mapping, and any
skipped or blocked action.
