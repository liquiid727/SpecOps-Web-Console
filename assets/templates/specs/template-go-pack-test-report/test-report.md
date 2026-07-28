# Test Report Template

```markdown
## Test Report
test_track: unit | api_connectivity | e2e_scenario | triage
scope: unit | integration | e2e | mixed
risk_level: P0 | P1 | P2
execution_spec_path: <execution spec path or none>
coverage_gate:
  command: make p0-unit-gate | none
  result: pass | fail | not_run
matrix_sources:
  - <使用的行为矩阵 / checklist，没有则写 none>
executed_commands:
  - <实际执行的命令，没有则写 none>
generated_tests:
  - <测试文件路径，没有则写 none>
asset_sync_result:
  - <Test Plan / Test Report / API collection sync result，没有则写 none>
api_collection_status:
  - <updated | unchanged | skipped: <原因>>
coverage_summary:
  - package: <go package>
    threshold: <number>
    actual: <number>
    status: pass | fail
gate_failures:
  - <失败的 gate 或 none>
residual_risks:
  - <没有则写 none>
reviewer_focus:
  - <reviewer 需要重点复核的点，没有则写 none>
doc_impact:
  - <需要同步的文档，没有则写 none>
backlog_followups:
  - <后续待补测试 / 文档 / API collection 任务，没有则写 none>
next_agents:
  - reviewer | test-unit-agent | test-api-connectivity-agent | test-e2e-scenario-agent | test-triage-agent | sync | none
```
