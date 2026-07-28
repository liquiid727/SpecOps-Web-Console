# Handoff Template

```markdown
## Handoff
context: <受影响的 bounded context 列表>
risk_level: P0 | P1 | P2
changed:
  - <代码路径 + 层级落点>
  - <状态机/流程是否变化>
  - <幂等键/Redis key/契约是否变化>
sync_needed: true | false
sync_targets:
  - <module doc / spec / architecture doc>
next_agent: reviewer | test | sync | ci | none
```
