# Evidence handoff supplement — 2026-09-08

## Scope and basis

User-authorized workflow/template supplement to
`rules/testing/production-test-standards.md` and the GoalSpec evidence contract.
This is a rule-backed documentation change, not a Requirement QA decision.

Preflight: the evidence template contained a minimal single-item example and
said an acceptance citation made raw output gate evidence. Existing production
rules already required normalization and item-level evidence. The screenshot's
specific S05 record was not found in this repository; its backing data and UI
behavior remain unverified. Existing unrelated worktree edits were preserved.

Consumers: verification owners and QA read the workflow/rules; generated
fullstack, spec-only and catalog packages consume the evidence template.
Planned verification: template consistency, local links, whitespace and manual
ownership/schema comparison. No application code or runner schema change.

## Result and checks

- Added `ai/workflows/verification-evidence-handoff.md`: manifest, coverage,
  gaps, artifacts, loop linkage and handoff checks.
- Expanded canonical evidence README and all three mirrors. Kept existing
  JSON status enums separate from the human-readable coverage classification.
- Connected production rules, GoalSpec, workflow entry and release gate policy.
- `node --test scripts/checks/goalspec-template-consistency.test.mjs`: 3 passed.
- Local Markdown link check: 7 links across the five changed workflow/rule/standard
  files resolved. Run-specific template placeholders are intentionally unresolved.
- `git diff --check`: passed after template changes.
- Manual checks: checkpoint remains local execution bookkeeping; verification
  records remain immutable; QA still owns acceptance; partial coverage cannot
  imply full package readiness; existing runner enum values were not extended.

Not verified: screenshot data, actual scenario execution, automated semantic
coverage enforcement, artifact retention services, UI rendering or production QA.
No historical evidence was rewritten and no synthetic pass records were created.

## Sync Handoff

source_spec_or_rule: rules/testing/production-test-standards.md
change_profile: cross-surface
production_consumers_or_real_entry_paths: verification owner handoff; QA; template export
changed_surface: workflow, rules, GoalSpec standard, evidence README and mirrors
neighbor_assets_checked: testing-agent manifest/role; Loop It checkpoint contract; core result validation; template mirror tests; release gate policy
updated_assets: workflow entry, handoff workflow, production rules, release rules, GoalSpec evidence section, four evidence READMEs
waived_assets: skills retain their existing normalized-evidence obligations; no skill behavior or checkpoint format change needed. UI and CLI implementation are outside this documentation supplement.
open_sync_risks: new semantic handoff checks require verification-owner execution; current CLI enforcement has not been extended
owner_agent: testing-agent
next_gate: review
