---
name: review-it
description: Use when reviewing implementation changes, a GoalSpec Spec Package, a legacy local Issue, a branch or PR diff, or delivery evidence before commit or ship.
---

# GoalSpec Review Closeout

For delivery evidence, use the [Verification Evidence Handoff](../../ai/workflows/verification-evidence-handoff.md) as the evidence shape. Check observed assertion mappings, explicit gaps and artifact links; treat loop state as execution linkage only.

`review-it` supports ordinary read-only review, implementation checkpoint review, and GoalSpec delivery review. Choose the mode from the user's request before selecting artifacts.

## Review mode and authorization

- For a code, diff, branch, or PR review, inspect the requested target and relevant context, then report findings with evidence. Do not edit code, create review records, commit, or post external comments unless requested. A missing GoalSpec package does not block ordinary review.
- For an explicitly requested GoalSpec delivery closeout or the verification closeout stage of an authorized delivery workflow, apply the package gates below and write the canonical Review record when that recording is in scope. Preserve human-authored findings.
- If a package exists during a read-only review, its contract can inform findings, but delivery readiness is a separate verdict. Report missing delivery evidence without treating it as a code defect.
- A requested fix authorizes focused changes and their verification; a review request alone does not. Reuse authorization already given in the conversation.

GoalSpec delivery closeout produces two separate results:

1. code and design findings from the current diff;
2. a traceable Review record in the owning Spec Package.

It never makes the QA acceptance decision. `acceptance.md` belongs to
`feature-verify`, and a clean code review does not by itself make a change
ready to merge or promote.

## Triggers

Use when:

- the user asks for `review-it`, code review, autoreview, or review closeout;
- a Spec implementation or legacy implementation Issue is complete and must be reviewed before commit or ship;
- a local branch, PR branch, or delivery evidence set needs re-review after fixes.

## Resolve the GoalSpec target for delivery closeout

Resolve an explicit `R0NN` or `S0N` selector, or a canonical legacy local Issue
path when the selected package still uses child Issues. Read the chain in this
order:

1. Requirement Workspace `prd.md`, `index.yaml`, and root `acceptance.md` when relevant;
2. owning `specs/S0N-<slug>/spec.md` and its exact `version`;
3. `evidence/implementation.md` and the implementation revision/fingerprint;
4. owning `test.md` and its binding when independent verification is required;
5. any selected historical Issue and Completion Record;
6. the child `review.md`, remaining `evidence/`, and `acceptance.md`.

Do not substitute a GitHub issue number for the local Issue ID. A GitHub Issue
is an optional external projection; the local file remains the source of truth.

## Implementation checkpoint review

For an implementation checkpoint, check the approved Spec, changed code,
focused validation, implementation evidence, and applicable project preflight.
When maintaining a historical Issue, also check its dependency readiness and
Completion Record. Formal verification evidence and QA acceptance are not
prerequisites for this verdict unless the selected work explicitly requires
them.

Record the inspected diff/worktree fingerprint and scoped findings when record writing is authorized. A clean implementation review permits `implemented_pending_verification`, not `verified`, package acceptance, or ship. Do not set package-wide Review Gate checkboxes from this scoped verdict. Repair actionable in-scope findings only under existing implementation/fix authorization; recheck affected behavior without rerunning unchanged unrelated checks.

## Review gates

Before calling GoalSpec delivery review complete, verify:

- the selected entry and implementation evidence resolve to the owning Spec
  Package and current Spec version;
- any selected historical Issue is under the owning package, resolves through
  `primary_spec`, and has satisfied or waived dependencies;
- an approved, non-`stale` Test Design exists when independent verification is required;
- required P0/P1 results are normalized under the same `evidence/` directory and registered in `evidence/index.yaml`;
- every changed requirement has implementation and verification coverage, or an explicit waiver;
- `evidence/implementation.md` lists changed files, minimal checks, evidence,
  commit/PR when known, deviations, skipped checks, residual risk, and
  intentionally untouched areas;
- where required by the project, the change profile and Execution Preflight are
  complete; semantic work names a real consumer/entry path and concrete
  affected-surface checks;

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

For authorized delivery closeout, write findings to the owning child package's `review.md`; preserve existing
human-authored findings and append stable IDs such as
`REVIEW-R001-S01-001`. Every finding records:

```text
ID, Severity, Status, Source, Covers, Owner, Evidence, Resolution
```

Use `open` for unresolved findings, `resolved` after verification, and
`waived` only with approver, rationale, and expiry. A clean delivery closeout with all required coverage sets the
Review Gate checkboxes and records the reviewed commit/diff and evidence
references. Never overwrite `acceptance.md`, the Test Design, or raw evidence.
Implementation decisions belong in the implementation evidence; do not create
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
9. whether the changed surface has a real consumer/entry path and evidence that observes it.

Treat findings as advisory until verified against the real code and the parent
Spec. Reject speculative or broad rewrite suggestions; keep accepted fixes at
the smallest correct ownership boundary.

## Review target and commands

For dirty local changes, review the working tree. For committed or pushed work,
review the branch diff against the actual PR base:

Determine the actual base from repository or PR context. Do not assume every repository uses `origin/main`.

Supported review commands:

| Agent | Command |
|---|---|
| Claude Code / OpenCode | `/review` |
| Codex | `codex review --uncommitted`, `codex review --base <actual-base>`, or `codex review --commit <sha>` |
| Antigravity | `/code-review` |
| DeepSeek TUI | `/review` or manual diff review |

The positional argument to `codex review` is a prompt, not a diff-file option. Inspect the installed CLI help when options differ. Direct diff inspection in the current session is sufficient when it can complete the requested review; do not start a second model solely because a command is listed.

The repository helper prints a suggested review command and can run explicitly requested tests; it does not execute the model review itself:

```bash
skills/developer/review-it/scripts/review-it --dry-run
skills/developer/review-it/scripts/review-it --parallel-tests "<focused test command>"
```

If an authorized review-triggered fix changes code or evidence, rerun focused tests and the
review until no accepted/actionable finding remains. Do not push merely to
obtain a review.

## Final report

For an ordinary review, lead with actionable findings, severity, file/line evidence, and relevant validation gaps. If none are found, say so and state the scope inspected. Do not require package metadata or a written Review record for this mode.

For GoalSpec delivery closeout, also include:

- entry ID, owning Spec Package path, and any historical local Issue ID;
- reviewed commit, branch, PR base, or dirty-tree target;
- `spec_id`, Spec version/hash, and Test Design version/freshness;
- tests and normalized evidence inspected;
- findings accepted, rejected, resolved, or waived;
- Review Gate status and any separate QA/ship blockers.
- change profile, observed surfaces, skipped checks, and residual risk.

Do not claim “ready to ship” unless the Review artifact, delivery evidence, and
QA acceptance gates are all independently satisfied.
