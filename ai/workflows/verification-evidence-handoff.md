# Verification Evidence Handoff

## Scope and authority

This workflow implements the evidence requirements in
[Production Test Standards](../../rules/testing/production-test-standards.md)
and the [GoalSpec standard](../../docs/spec-modes/GoalSpec/agent-native-sdlc-standard.md).
The testing-agent owns verification packaging; qa-agent owns acceptance.
It adds no acceptance state and does not authorize execution beyond the selected
Spec verification scope. Implementation-only focused checks retain their existing scope.

## Inputs

- Current approved child Spec, Test Design, and selected verification scope.
- Declared test selection, environment and runner configuration.
- Actual runner output and existing evidence index; a checkpoint is optional.

If approval or source bindings are absent, retain a diagnostic record and name
the blocker. Do not label that record formal completion evidence.

## Outputs

Use the owning package's `evidence/` directory and existing runner schema:

| Artifact | Required content |
| --- | --- |
| `runs/<run-id>.json` | Normalized observed results, production evidence fields, source and environment identity |
| `artifacts/<run-id>/` | Raw report/log and applicable trace, screenshot or video; stable external artifact references are also allowed |
| `artifacts/<run-id>/summary.md` | Run manifest, coverage matrix, gaps, rerun guidance and links below |
| `index.yaml` | Actual paths and run IDs; explicit covered TEST IDs, without implying unexecuted coverage |
| `gates/` | Gate report referencing the evaluated runs and remaining blocking gaps |

The summary supplements the runner schema; it does not introduce new enum
values into normalized JSON. An index entry must identify the summary as a
summary, not a normalized-result. Failed/interrupted attempts remain available;
a rerun gets a new run ID. Correct a historical mistake with a linked correction
record rather than rewriting its observed outcome.

## Required summary sections

1. **Run manifest:** run ID, entry ID, Spec/Test versions and hashes, any
   historical Issue IDs, actual
   start/end time, baseline commit, tested worktree fingerprint when dirty,
   environment identity (runtime/dependencies and relevant fixture/configuration),
   real entry path, exact command and working directory, exit code, normalized
   result path and raw artifact links. Unknown values stay unknown with a reason.
   A baseline commit plus “dirty tree” is insufficient to identify tested changes.
   Record a reproducible source reference or explicitly mark reproducibility limited.
2. **Coverage matrix:** one row per required TEST/requirement mapping, including
   SPEC and verification owner/work item, observed assertion or report case locator,
   execution outcome, evidence quality, gate impact and artifact reference.
   Classify rows as executed, not-run or blocked; show pass/fail/flaky only for
   observed results. A waived row links to the existing acceptance waiver with
   scope, approver and expiry. Preserve failures preceding a successful retry.
3. **Gaps and next actions:** every not-run/blocked or insufficient-evidence row
   has a concrete reason, responsible owner, prerequisite and smallest rerun
   command (or an explicit reason no command exists yet). Compare against the
   full required Test Design selection, not just the tests the runner discovered.
4. **Decision scope:** summarize execution totals separately from mapped TEST
   coverage and gate readiness. Report the exact blocking TEST IDs. Link to the
   gate report and existing acceptance record, or state that these were not run
   or not decided. Passing tests do not create an acceptance decision.
5. **Execution linkage:** if Loop It produced the run, record its stable selection
   key and the relevant work/run IDs. The local checkpoint references this run
   for continuation; the evidence remains understandable if that checkpoint is
   unavailable. Next actions here describe gaps; live queue state belongs in
   the checkpoint and canonical Issue records.

Use the package [evidence template](../../.requirements/templates/spec-package/evidence/README.md).
For shared runs, link to the canonical retained report and map only the actual
assertions relevant to each package. “Same command as S01” needs a resolvable
immutable manifest reference, not a prose-only cross-reference.

## Handoff checks

Before verification closeout, the verification owner must:

- Open each referenced normalized result and required artifact; verify that
  paths or authorized external references resolve and identify the same run.
- Reconcile Spec/Test bindings, tested revision, environment and scope. Stale
  results remain historical evidence and cannot prove the current change.
- Check each claimed mapping against actual assertion/report content. Aggregate
  command success cannot establish all branches or multiple packages' coverage.
- Account for every required TEST, including absent runner cases, and apply
  the approved risk/waiver policy to blocking gaps.
- Validate the existing result schema and gate using the project's supported
  commands. Record exactly which automated checks and manual checks ran; do not
  claim these semantic checks are all enforced by today's CLI.

Only then hand off entry ID, `specId`, Test version, coverage, owner map, run IDs, result
paths, blockers, rerun guidance and next gate to QA. QA reconciles these with
Issues and review findings before writing acceptance. Missing tool capability
is reported as a limitation; missing evidence cannot be replaced with an
invented report or retrospective pass.

## Presentation contract

Human-readable output starts with the scoped result, followed by coverage,
gaps, run details and artifact links. No evidence means “not run”; unavailable
artifacts mean “missing evidence”; a report load failure must not appear as a
passing run. During execution show “running” without a final verdict. These
are output requirements, not a claim that an existing UI implements them.
