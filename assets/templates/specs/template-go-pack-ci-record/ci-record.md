# CI Record Template

```markdown
## CI Record
intent_class: change | review | analysis | release
change_validation_status: pass | fail | partial | not_applicable
executed_checks:
  - <command + result，没有则写 none>
skipped_checks:
  - <check + reason，没有则写 none>
git_status_checked: true | false
stage_scope:
  - <本次应纳入提交的文件/目录，没有则写 none>
unrelated_changes_excluded: true | false
pre_commit_status: passed | failed | not_run | not_applicable
review_required: true | false
review_status: pending | completed | not_applicable
release_ledger: <doc/deploy/release-ledger.md | none>
commit_messages:
  - <emoji type(scope): 中文；English；纯 merge readiness 写 none；仓库要求 merge commit 时可写 emoji merge(target)>
merge_ready: true | false
blocking_items:
  - <阻断项，没有则写 none>
```
