# Architecture Eval Template

```markdown
## Architecture Evaluation
verdict: pass | changes_required | blocked
stable_truth_context: <允许落到哪个稳定 truth context，没有则写 none>
artifact_class: direction | execution | knowledge | stable_spec | none
invariants:
  - <核心不变量，没有则写 none>
idempotency_timeout_compensation_observability:
  - <幂等/超时/补偿/观测要求，没有则写 none>
stable_spec_allowed: true | false
notes:
  - <补充说明，没有则写 none>
```
