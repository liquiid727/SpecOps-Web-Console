---
name: loop-it
description: Use when executing a selected batch of approved GoalSpec local Issues, or an explicitly requested remote Issue batch, with dependency, evidence, review, and checkpoint gates.
---

# Loop Issues — GoalSpec

For verification work, use the [Verification Evidence Handoff](../../ai/workflows/verification-evidence-handoff.md) when packaging normalized results. Record assertion-level TEST/requirement coverage, every not-run or blocked item, artifact links, rerun guidance, and the loop selection key. A checkpoint cannot substitute for formal evidence.

Execute stable Issues as a resumable batch with one active writer. This skill never creates PRDs, Specs, Test Designs, or QA acceptance decisions. If requirements or parent contracts are still changing, stop and return to the owning skill.

## Batch contract

“All Issues” means **queue every discovered, selected Issue through to its
declared terminal state**, not “attempt them in one ever-growing agent turn.”
Create a durable selection checkpoint before the first write and resume it at
every clean Issue boundary. A stopped model, context rotation, or terminal
restart is a handoff event; it is never permission to abandon remaining ready
Issues or to redo completed checks.

The coordinator reports the discovered selection, topological order, ready
wave, and next blocking dependency before writes. There is one writer in a
shared worktree. Read-only preflight or verification preparation may run in
parallel only when it cannot alter the worktree, test database, server ports,
or checkpoint.

## Source mode

Use local GoalSpec delivery by default for this repository. Use remote GitHub mode only when the user explicitly requests remote Spec execution.

### Local canonical source

Resolve `artifacts.requirementsDir` from `.specos/manifest.yaml`, then recursively discover only:

```text
<requirementsDir>/R0NN-<slug>/specs/S0N-<slug>/issues/ISSUE-R0NN-S0N-NNN-<slug>.md
```

A direct Issue path or an explicit `R0NN`, `S0N`, or Issue ID selector is authoritative; without a selector, list groups and ask once. When the user says “all Issues” for a selected requirement/spec range, enumerate the canonical files and use the complete discovered set. A stated count that differs from discovery is a selection warning to report, not a reason to silently drop files; resolve it with an explicit include/exclude choice.

Remote mode may use GitHub Issue numbers, but each remote Issue must still identify its canonical `R/S/ISSUE` source before implementation.

## Batch preflight

Run this once per selection before the first Issue, and cache its result in the
checkpoint with SHA-256 digests of the source artifacts:

1. Discover the complete selected set, validate bindings, duplicate ownership,
   and the dependency graph, then calculate deterministic ready waves.
2. Verify that the working tree policy permits the selection. If user-owned
   in-progress changes belong to the first Issue, inventory and preserve them;
   do not make the whole batch re-audit them before every later Issue.
3. Start or adopt one isolated test environment for the batch when browser or
   integration evidence is declared. Probe its health, bootstrap route, data
   directory/content root, and required ports before implementation begins.
4. Record focused commands, package verification commands, and the final
   release gate separately. Do not promote a final gate into every Issue.

If an artifact digest changes, rerun only its affected preflight checks. If the
environment probe fails, diagnose it before executing an Issue that requires that environment.
Treat every bootstrap, content-root, data-dir, port, or initialization failure
as one **environment-initialization incident** until a successful probe proves
otherwise. Continue diagnosis while each attempt tests a concrete hypothesis and yields new evidence. Stop repeated equivalent failures without new information; record commands, symptoms, attempted fixes, and next owner, and block only Issues needing that environment.

## Preconditions

Stop before writes when any of these fail:

1. Git repository exists. Inventory existing changes, preserve unrelated work, and confirm the selected writes can be isolated. Block overlapping ownership that cannot be safely resolved; unrelated dirty files alone do not block execution.
2. The selected Issue exists and has `kind`, `track`, `requirement`, `spec_package`, `primary_spec`, `source_spec_version`, and `depends_on`.
3. The root PRD and `index.yaml`, child `spec.md`, and approved child `test.md` exist.
4. Root/child source artifacts are approved and the Issue is bound to the current Spec/Test version, or an explicitly authorized binding migration passes the reconciliation rules below.
5. `.loop-local-state/` is ignored by Git. Checkpoints never enter an Issue commit.
6. Apply the project's change-profile and Execution Preflight policy when required. Record confirmed facts, assumptions, real consumers/entry paths, affected surfaces, planned checks, unrelated changes and human decisions. In SpecOS, follow `rules/shared/change-discipline.md`; do not impose that file or schema on projects that do not use it.

## Required read order

At batch preflight, read the shared chain once:

```text
README.md
→ rules/
→ docs/spec-modes/GoalSpec/
→ relevant design/
→ root prd.md
→ root index.yaml
→ child spec.md
→ child test.md
→ all selected child review.md / evidence/ / acceptance.md
```

Before each Issue, read its Issue contract and only the code, tests, and child
artifacts whose recorded digest changed since batch preflight. Re-read the full
parent chain only when a digest changed or the checkpoint says it was not
loaded. Never substitute a summary for the selected Issue itself.

If a parent artifact is missing, unapproved, or version-mismatched, mark the run blocked and do not implement.

## Dependency and selection rules

- Read dependencies from Issue frontmatter `depends_on`; use body `## Dependencies` only as a human-readable mirror.
- Missing dependencies, duplicate ownership, stale bindings, and circular dependencies are hard stops. Never break a cycle by arbitrary numeric order.
- Topologically sort the selected graph; use the stable Issue ID only as a tie-breaker.
- Do not silently expand a selection to external dependencies. Require an explicit include-dependencies choice.
- Execute a ready wave in stable Issue-ID order with one writer unless the user
  explicitly authorizes isolated writable workspaces. Do not call this “strict
  sequence” when the dependency graph has independent ready work.
- Batch independent read-only discovery, file reads, hashes, and health probes
  when the available tools support it. Do not parallelize writes or checks that
  share a database, server port, browser profile, or checkpoint.

## Approved binding migration

An approved Spec/Test revision can leave otherwise valid Issues carrying old
frontmatter bindings. Treat this as a migration candidate, not an automatic
contract rewrite. Proceed only when all of the following are true:

1. The current root PRD, child Spec, and Test Design are approved.
2. The Issue's `primary_spec`/`source_spec_id` still exists in the current Spec,
   and its declared Test ID still exists in the current Test Design.
3. The user explicitly authorizes repairing the Issue bindings for this run.
4. The migration changes only Issue frontmatter (`source_*_version`,
   `source_*_hash`, and stale markers/status bookkeeping); never change PRD,
   Spec, Test Design, Issue body Must scope, or acceptance artifacts.

Before implementation, record the old/new versions and SHA-256 values in the
implementation evidence or migration note, then set the canonical Issue status
back to `todo` unless the Issue is already actively being resumed. If a
primary ID/Test ID disappeared, the Must scope no longer matches, or the
parent is unapproved, stop and return to the owning requirements workflow.

## Checkpoint

Store one atomic checkpoint per selection:

```text
.loop-local-state/<stable-selection-key>.json
```

Checkpoint statuses are execution bookkeeping and must not be confused with QA acceptance:

```text
pending → in_progress → implemented → reviewed → shipped
                         └──────────→ blocked / failed
```

The canonical Issue status remains:

```text
todo → in-progress → implemented_pending_verification → verified
```

`implemented_pending_verification` means code and the Issue-declared focused
validation are complete; it never means the Test Design, Spec Package, or
Requirement is accepted. Update the checkpoint after every transition. Preserve
a corrupt checkpoint and ask whether to resume or start a new selection.

The checkpoint also stores source-artifact digests, selected order and ready
waves, user-approved dirty files, environment identity and probe result,
commands already green with commit/environment IDs, deferred findings, and a
short next-action handoff and authorized target states. Record context usage only when the host exposes it; unavailable usage is unknown, not an estimated mandatory field. A
fresh agent must be able to continue from this file without rereading completed
transcripts.

## Scope and failure control

Freeze an implementation Issue to its declared Must scope after its focused
test turns green. A visual or review pass may reveal a separate enhancement
(for example a theme preference, remembered viewport, or adjacent UX polish).
Record it as a deferred finding and continue; do not fold it into the active
Issue unless it directly makes a declared acceptance condition fail. For such a
failure, state the condition and minimal corrective change before editing.

Do not convert validation into open-ended environment exploration. Reuse the
batch environment for every eligible UI Issue. A browser check occurs only
when Issue validation declares it or a focused test cannot observe a declared
UI acceptance condition. One successful environment probe is evidence for its
configuration, not evidence that every later Issue passed.

User-authorized dirty files must be named and attributed at batch start. The
Issue file list means the contract's allowed change set; the Completion Record
may add an extra file only after review records why it is required for the
declared Must scope. Before advancing, record ownership and a diff/content fingerprint for attributed files. Completed in-scope changes may remain uncommitted when commit is not authorized. Later Issues may build on them through declared dependencies; preserve attribution and never stage unrelated work.

## Single-Issue loop

1. Resume the selection checkpoint, confirm the Issue is in the current ready
   wave, and update it to `in_progress` atomically.
2. Read the Issue contract plus only invalidated parent/code context.
3. Implement only the Spec's Must scope. Do not rewrite PRD/Spec or weaken tests.
4. For `track: implementation`, run only the focused, changed-scope commands
   declared in the Issue `Validation` section. Do not automatically run the
   Test Design coverage matrix, full regression, performance, concurrency,
   E2E, or release Gate. Add or update a code-coupled unit test only when the
   Issue declares a suitable seam; otherwise record the required `N/A` rationale.
5. For `track: verification`, execute the assigned Test Design scenarios,
   write or reference normalized evidence under the owning child package's
   `evidence/{plans,schedules,runs,gates,artifacts}/`, and register it in
   `evidence/index.yaml`. Every blocking result must identify TEST,
   SPEC/version, ISSUE, commit, environment, time, and result.
6. Update the implementation evidence with changed files, tests, evidence,
   commit, design decisions, alternatives considered, skipped checks, verified
   behavior, residual risk, intentionally untouched areas, deviations,
   tradeoffs, open questions, and Spec
   Deviation. An implementation Issue without explicitly required evidence
   records `N/A — verification Issue owns release evidence`.
   Do not create a separate implementation-notes file such as `docs/issue#*.html`.
7. Run `/review-it` in implementation checkpoint mode for implementation work, or delivery evidence mode for verification closeout. Record findings within the authorized workflow. Reuse valid unchanged checks; repair actionable in-scope defects and recheck. Unresolved blockers block affected work, not independent ready Issues.
8. An implementation Issue may commit after its declared focused validation and
   review pass, with canonical status `implemented_pending_verification`. A
   verification Issue may advance to `verified` only when its required evidence
   and gates pass. In local mode, commit only the listed Issue files and use a
   fast-forward merge when explicitly authorized. In remote mode, use `/ship-it`
   only when explicitly authorized.
9. Never write child or root QA acceptance from this loop. `feature-verify` owns `specs/S0N/acceptance.md` and root `acceptance.md`.

After an Issue passes its authorized execution-stage checks, persist the handoff and immediately select the next
ready Issue. Run a package verification Issue after its implementation
dependencies are complete; run the Foundation/release gate once at the point
declared by the selected verification plan, not once per implementation Issue.
When one Issue is blocked, leave each dependent descendant `pending` with a
`blocked_by` list of its unresolved ancestors; it is not terminal and must
appear in the final report. Continue other ready waves that do not require the
blocked Issue's files, environment, or exclusive resources. Recompute the selection outcome after each transition:

- `complete`: every selected Issue reached its authorized target state and no selected required work remains. Implementation-only selections can finish at `implemented_pending_verification`; verification selections require their declared evidence and gates. Completion does not imply QA acceptance or shipping.
- `running`: selected work remains and a ready Issue can execute safely.
- `blocked`: selected work remains but none can execute because of unresolved dependencies, authority, tools, or environment. Report the concrete blockers and next actions.

An empty discovery result is not successful execution: report the selector mismatch. On resumption, remove only resolved ancestors from `blocked_by`, then recompute readiness.

## Context continuity

Save a concise handoff at meaningful Issue boundaries and before an actual host context limit or interruption. Do not impose a fixed context percentage or invent usage measurements. Use supported host compaction/resumption when available; a Skill cannot create an automatic successor turn. Continue ready work while the current host permits it. If tools or continuation are unavailable, report the precise limitation and next action without claiming completion.

If execution discovers a conflict with the approved Spec or project
architecture, mark the run blocked and record the conflict as a finding or Spec
Deviation. Do not resolve it by silently changing implementation, parent
contracts, tests, or recorded evidence; the parent Spec revision marks bound
Test Designs and Issues stale before a new execution selection begins.

## Batch execution and recovery

- Keep the complete selected set in one checkpoint, including finished, ready, blocked, and pending descendants. Reconcile canonical Issue records, actual diffs and run evidence on resume; a checkpoint is a cache, not authority to upgrade a status. Preserve contradictory records and explain corrections supported by evidence.
- Dependency readiness follows the declared contract: implementation completion may satisfy an implementation dependency while formal verification remains pending. Do not invent a QA or release dependency. If a dependency's required maturity is ambiguous and affects safety, resolve it before consuming that output.
- Cache shared preflight and successful checks using the relevant source, worktree diff, command/configuration, dependencies and environment fingerprints. Reuse only still-valid results; changed shared inputs invalidate affected checks. Reading a summary is not proof of a test pass.
- Separate focused implementation checks, package verification, and integrated release gates. Run shared gates at their declared phase and reference one valid normalized run across covered TEST/Issue IDs when the approved schema allows. Preserve each required mapping and result; never infer coverage from a generic green command.
- Existing approved Issues/Test Designs remain authoritative. If they require a global gate, keep verification pending until it passes; do not waive it through this Skill. Continue independent implementations whose declared dependencies permit it.
- On verification failure, identify production defect, test/fixture defect, environment failure, or contract conflict. In an authorized implementation batch, return a production defect to its selected implementation scope, apply the bounded fix, then rerun affected checks and verification. Verification-only authorization does not permit production edits.
- Correct a stale test only when the approved contract unambiguously supports the expected behavior and test editing is authorized. Do not weaken assertions, restore obsolete product behavior, or change an approved Test Design just to make a run green.
- Missing execution tools are a host limitation. Use an available supported equivalent only after confirming repository, branch and filesystem access. Do not repeatedly drive terminal/editor windows through GUI keystrokes to replace missing shell/file tools.
- A reviewed implementation may remain uncommitted at `implemented_pending_verification`. Record `commit: not requested` and a worktree fingerprint where the schema permits; do not fabricate a commit or treat `shipped` as the batch's mandatory terminal state. Formal evidence still must satisfy its declared revision policy.
- Continue ready work after each completed stage without asking for repeated approval of the same authorized scope. Stop only for an actual unresolved dependency, unsafe overlap, missing authority/tool, or contract decision. Never claim batch completion while selected required work remains.
- Preserve project-required change profiles, Execution Preflight and observed-surface checks. Where the project does not mandate those fields, record the necessary facts in existing records rather than requiring a retroactive Issue schema migration.

## Safety gates

Never advance an implementation Issue to `implemented_pending_verification` when:

- the source Spec/Test is stale or unapproved;
- a required dependency is not complete;
- a review blocker is unresolved;
- the Completion Record or project-required Execution Preflight is incomplete;
- changes overlap unrelated work and cannot be safely isolated.

Never advance a verification Issue to `verified`, or QA to acceptance, when:

- the source Spec/Test is stale or unapproved;
- a required dependency is not complete;
- P0/P1 evidence is missing, failed, or unclassified;
- a review blocker is unresolved;
- the Completion Record is incomplete;
- changes overlap unrelated work and cannot be safely isolated.

The final summary must list selection, Issue IDs, dependency order, applicable change profiles and observed surfaces, changed files, tests, evidence, review status, selection outcome, checkpoint status, blockers, and skipped validation.
