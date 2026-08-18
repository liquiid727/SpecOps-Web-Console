# Routing Template

```markdown
## Routing
intent: <新增|修改|删除|调试|设计|Spec|审查|发布>
mode: Consult | Spec | Change | Release
contexts_affected: [<context_a>, <context_b>]
risk_level: P0 | P1 | P2
architect_needed: true | false
architect_reason: <如不需要可写 none>
agents_to_spawn:
  - planner
  - architect
  - spec-writer
  - backend/<context>
  - test-unit-agent
  - test-api-connectivity-agent
  - test-e2e-scenario-agent
  - test-triage-agent
  - reviewer
  - sync
execution_order:
  1. planner
  2. architect (if needed)
  3. spec-writer (if spec mode)
  4. backend agents (if change mode)
  5. one or more test agents
  6. reviewer
  7. sync (if needed)
```
