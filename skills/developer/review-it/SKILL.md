---
name: review-it
description: Use when reviewing implementation changes, a local GoalSpec Issue, a branch or PR diff, or delivery evidence before commit or ship.
---

# GoalSpec Review Closeout

`review-it` produces two separate results:

1. code and design findings from the current diff;
2. a traceable Review record in the owning Spec Package.

It never makes the QA acceptance decision. `acceptance.md` belongs to
`feature-verify`, and a clean code review does not by itself make a change
ready to merge or promote.

## Triggers

Use when:

- the user asks for `review-it`, code review, autoreview, or review closeout;
- an implementation Issue is complete and must be reviewed before commit or ship;
- a local branch, PR branch, or delivery evidence set needs re-review after fixes.

## Resolve the GoalSpec target first

Resolve a canonical local Issue path or an explicit `R0NN`, `S0N`,
or Issue selector. Read the chain in this order:

1. Requirement Workspace `prd.md`, `index.yaml`, and root `acceptance.md` when relevant;
2. owning `specs/S0N-<slug>/spec.md` and its exact `version`;
3. owning `test.md` and its `source_spec_version`, `source_spec_hash`, and status;
4. the Issue file, its `primary_spec`, `depends_on`, and Completion Record;
5. the child `review.md`, `evidence/`, and `acceptance.md`.

Do not substitute a GitHub issue number for the local Issue ID. A GitHub Issue
is an optional external projection; the local file remains the source of truth.

## Review gates

Before calling the code review clean, verify:

- the Issue is under its owning Spec Package `issues/` directory;
- `primary_spec` resolves to the selected Spec and its source version/hash is current;
- all `depends_on` Issues are complete, or the dependency is explicitly waived;
- an approved, non-`stale` Test Design exists when independent verification is required;
- required P0/P1 results are normalized under the same `evidence/` directory and registered in `evidence/index.yaml`;
- every changed requirement has implementation and verification coverage, or an explicit waiver;
- the Completion Record lists changed files, tests, evidence, commit/PR when known, and Spec Deviation.

Separate the verdicts in the report:

| Verdict | Meaning |
|---|---|
| Code review | clean, actionable findings, or blocked by unresolved findings |
| Review artifact | `review.md` is updated with traceable findings and resolution |
| Delivery evidence | complete, stale, missing, failed, or waived |
| QA acceptance | read-only input; owned by `feature-verify` |

Missing QA acceptance is a delivery blocker for ship, but `review-it` must not
write or invent `acceptance.md`.

## Write the canonical Review record

Write findings to the owning child package's `review.md`; preserve existing
human-authored findings and append stable IDs such as
`REVIEW-R001-S01-001`. Every finding records:

```text
ID, Severity, Status, Source, Covers, Owner, Evidence, Resolution
```

Use `open` for unresolved findings, `resolved` after verification, and
`waived` only with approver, rationale, and expiry. A clean review sets the
Review Gate checkboxes and records the reviewed commit/diff and evidence
references. Never overwrite `acceptance.md`, the Test Design, or raw evidence.
Implementation decisions belong in the Issue Completion Record; do not create
a separate implementation-notes file such as `docs/issue#*.html`.

## Code review focus

Review the diff and adjacent code for:

1. hidden side effects and shared-state changes;
2. API, data, configuration, and CLI compatibility;
3. empty, error, boundary, retry, concurrency, and migration paths;
4. performance regressions and unnecessary I/O or allocations;
5. security and sensitive-data exposure;
6. misleading names or ownership boundaries;
7. missing tests, stale bindings, and weak evidence;
8. unnecessary abstraction or future maintenance cost.

Treat findings as advisory until verified against the real code and the parent
Spec. Reject speculative or broad rewrite suggestions; keep accepted fixes at
the smallest correct ownership boundary.

## Review target and commands

For dirty local changes, review the working tree. For committed or pushed work,
review the branch diff against the actual PR base:

```bash
git diff origin/main...HEAD > /tmp/review-it.diff
```

Supported review commands:

| Agent | Command |
|---|---|
| Claude Code / OpenCode | `/review` |
| Codex | `codex review` or `codex review /tmp/review-it.diff` |
| Antigravity | `/code-review` |
| DeepSeek TUI | `/review` or manual diff review |

The repository helper supports target detection and optional parallel tests:

```bash
skills/developer/review-it/scripts/review-it --dry-run
skills/developer/review-it/scripts/review-it --parallel-tests "<focused test command>"
```

If a review-triggered fix changes code or evidence, rerun focused tests and the
review until no accepted/actionable finding remains. Do not push merely to
obtain a review.

## Final report

Include:

- local Issue ID and owning Spec Package path;
- reviewed commit, branch, PR base, or dirty-tree target;
- `spec_id`, Spec version/hash, and Test Design version/freshness;
- tests and normalized evidence inspected;
- findings accepted, rejected, resolved, or waived;
- Review Gate status and any separate QA/ship blockers.

Do not claim “ready to ship” unless the Review artifact, delivery evidence, and
QA acceptance gates are all independently satisfied.
