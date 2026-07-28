# Task Plan Template

```markdown
## Task Plan
total_tasks: <N>
risk_summary: P0:<n> P1:<n> P2:<n>
parallel_groups:
  group_1: [T001, T002]
  group_2: [T003]
tasks:
  - task_id: <T001>
    context: <bounded context>
    layer: governance | docs | domain | application | interfaces | infrastructure
    description: <具体任务>
    truth_owner: <模块真相 owner>
    runtime_owner: <运行时 owner>
    dependencies: [<task_id>, ...]
    can_parallel: true | false
    risk_level: P0 | P1 | P2
    risk_reason: <风险说明>
```
