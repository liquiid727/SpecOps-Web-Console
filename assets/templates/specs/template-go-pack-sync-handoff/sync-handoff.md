# Sync Handoff Template

```markdown
## Sync Handoff
context: <affected contexts>
changed_semantics:
  - <状态机变化>
  - <Redis key 变化>
  - <契约变化>
  - <流程变化>
approved_design: true | false
upstream_fact_links:
  - <来源路径，没有则写 none>
allowed_target_paths:
  - <允许写入的目标文件，没有则写 none>
blocked_paths:
  - <禁止写入的目标文件，没有则写 none>
files_to_update:
  - <module doc / spec / architecture doc>
```
