# CI Record Template

```markdown
## CI Record
delivery_context: goalspec | standalone
intent_class: change | review | analysis | release
change_validation_status: pass | fail | partial | not_applicable
executed_checks:
  - <command + result，没有则写 none>
skipped_checks:
  - <check + reason，没有则写 none>
verified_behavior:
  - <observed behavior, or none>
known_limitations_or_residual_risk:
  - <risk, or none>
intentionally_untouched:
  - <area + reason, or none>
git_status_checked: true | false
stage_scope:
  - <本次应纳入提交的文件/目录，没有则写 none>
unrelated_changes_excluded: true | false
pre_commit_status: passed | failed | not_run | not_applicable
review_required: true | false
review_status: pending | completed | not_applicable
release_ledger: <doc/deploy/release-ledger.md | none>
commit_messages:
  - <actual commit message; none before commit>
sync_handoff_status: pass | partial | fail | not_applicable
merge_ready: true | false
blocking_items:
  - <阻断项，没有则写 none>
```
