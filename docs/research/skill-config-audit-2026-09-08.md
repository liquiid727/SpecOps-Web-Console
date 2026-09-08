# Skill and Configuration Maintenance

Status: implemented local configuration maintenance, authorized by the user on 2026-09-08. This is an audit and change record, not a GoalSpec delivery acceptance decision.

## Source and scope

The user approved the preceding audit's minimal corrections for personal and project instructions and explicitly requested renaming the active coordinator to Fairy.

Governing sources: [project instructions](../../AGENTS.md), [change discipline](../../rules/shared/change-discipline.md), and [GoalSpec](../spec-modes/GoalSpec/README.md). Profile: cross-surface configuration and model-visible instruction changes. No new product requirement or release is claimed.

Official references inspected during the audit:

- [GPT-6 guidance](https://developers.openai.com/api/docs/guides/latest-model): audit instruction conflicts and scale verification to the task.
- [GPT-5.6 guidance](https://developers.openai.com/api/docs/guides/latest-model?model=gpt-5.6): preserve goals, boundaries and success criteria, and evaluate changes on representative tasks.
- [Skill loading](https://learn.chatgpt.com/docs/build-skills): discovery metadata and selected skill bodies are distinct; installation does not mean execution on every task.
- [AGENTS.md loading](https://learn.chatgpt.com/docs/agent-configuration/agents-md): new runs rebuild the instruction chain.

## Preflight and affected surfaces

The worktree already contained user changes to the registry, review/ship/loop skills, rules, templates and R003 artifacts. Edits were made against the existing file contents. Installed skill copies were patched independently rather than replaced with repository copies.

| Surface | Actual consumer | Check |
| --- | --- | --- |
| Personal instructions | New Codex runs reading the global AGENTS.md | File inspection; fresh full model instruction injection remains unverified |
| Project instructions | Root AGENTS.md and SpecOS role prompt assembly | Naming, YAML parsing and referenced paths |
| Skill metadata | Local Codex app-server skills/list | Fresh process, forceReload, selected paths and descriptions |
| Skill behavior | Independent agents reading frozen/current skills | Same four bounded task requests |
| Review helper | Bash helper's printed Codex command | Before/after dry runs with a local Git fixture and stubbed gh |
| UI guidance | specos-ui-design and linked governance | Existing canonical paths and delivery ownership |

No new human decision was needed after the explicit approval. API provider settings, model choice, reasoning effort, official system skills, caches and unrelated personal skills were intentionally left unchanged.

## Changes

- Global AGENTS.md retains Fairy and evidence-based collaboration preferences; adds task authorization, proportionate validation and available-tool guidance.
- Active project instructions, registry, orchestration workflows, fullstack template and workflow diagram use Fairy. Historical accepted PRD/Spec/review ownership records and backlog notes retain their original attribution.
- Project context entries are discovery scopes. Optional skills are selected by the task, not loaded merely because they are listed. Host delegation has no mandatory minimum; routing preview numeric defaults remain unchanged.
- `.codex/instructions.md` uses current Requirement Workspaces and main-role routing. `.codex/README.md` distinguishes automatic AGENTS.md loading from SpecOS-selected instructions.
- `specos-ui-design` and UI governance use current Requirement Workspace, Issue, review, evidence and acceptance paths.
- `diagnosing-bugs` separates diagnosis from requested fixes, permits evidence-backed analysis without a runnable reproduction, and removes fixed hypothesis/repetition counts. It retains meaningful reproduction and regression checks for complex defects.
- `design-an-interface` compares real alternatives without requiring a particular tool or minimum number of workers.
- `review-it` separates ordinary read-only review from authorized GoalSpec closeout. Existing delivery evidence and QA ownership requirements remain intact.
- The review helper emits explicit Codex target options and preserves an explicit `--base` instead of replacing it with a detected PR base. It prints a suggested review command; it does not execute the model review.
- `humanize-it` retains task-specific writing strategy, factual fidelity and optional tooling, while replacing score-driven repetition with concrete quality checks and stopping conditions. It does not claim external detector results.

## Verification results

- Official skill validator: all nine modified SKILL.md files passed (four repository skills, four installed copies, one project UI skill).
- `npm test --workspace @specos/core`: 9 tests passed across 2 files.
- Parsed `.agents/manifest.yaml`, confirmed Fairy and checked all role prompt, canonical prompt and declared skill paths.
- `git diff --check`: passed. No old coordinator name remains in the active instruction/workflow/template surfaces checked.
- Fresh local Codex CLI 0.153.4 app-server `skills/list` with `forceReload: true`: all five targeted skills enabled, updated descriptions returned, no skill loading errors.
- Fresh `config/read`: default model remains `gpt-5.6-terra` with high reasoning effort. This does not establish the backend model serving an existing GPT-6 conversation.
- Bash syntax and helper command checks: both installed and repository helpers passed the updated local and explicit-base cases. The four baseline cases did not emit the required explicit target commands; all four updated cases did. No model review or remote PR operation was executed by these checks.

## Behavioral comparison

Independent agents received the same bounded requests and only the corresponding frozen or current skill bodies. No production file edits or external writes were allowed.

| Request | Before | After |
| --- | --- | --- |
| Diagnose an object accumulator returning a string; do not modify | Correct cause, Node reproduction, no edit; skipped mandatory later phases | Correct cause, Node reproduction, no edit; diagnosis-only path applies |
| Review a loop changed from less-than 3 to less-than-or-equal 3 | Found four attempts; explained unavailable GoalSpec closeout | Found four attempts; selected ordinary read-only review |
| Compare two interfaces for a small capacity-100 LRU cache | Two alternatives; bypassed mandatory workers due to task constraints | Two alternatives directly; no worker requirement |
| Rewrite a technical statement preserving 100 requests, p95 240ms to 180ms, production unverified | Preserved facts; bypassed score/summary requirements | Preserved facts using the bounded rewrite workflow |

Both versions completed these narrow tasks without unauthorized writes. The comparison supports reduced instruction conflict, not a demonstrated increase in correctness, speed, token efficiency or quota. No controlled GPT-6-versus-GPT-5.6 benchmark was run.

## Activation, rollback and limitations

Backups, original hashes, post-edit hashes, per-file diffs, redacted loaded-state evidence and the helper test are stored in the dated `skill-tune-20260908-*` directory under the user's Codex backups directory. The exact local path is provided in the conversation, not committed here.

Start a new Codex conversation/session to pick up changed global and project instructions. Skill discovery was verified through a fresh process; an already-running conversation may retain earlier instructions. No cache file was edited or cleared.

Run `node <backup-directory>/restore.cjs` for a rollback dry run; add `--apply` to restore the pre-edit snapshots. The script checks backup hashes and refuses to overwrite later changes. It restores the pre-existing dirty contents, not Git HEAD, and leaves this audit report intact.

Not verified: full new-session AGENTS.md prompt injection, production UI behavior, complete GoalSpec delivery/QA acceptance, every installed skill/tool, actual provider identity, and model-specific latency/token/cost changes. Frontend test/build were not run because no application behavior or layout changed; the workflow diagram only received the coordinator label replacement.
