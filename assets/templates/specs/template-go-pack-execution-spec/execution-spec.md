# Execution Spec Template

```markdown
## Execution Spec
direction_path: <关联的 direction.md 路径，没有则写 none>
risk_level: P0 | P1 | P2
truth_owner: <执行真相 owner，没有则写 unknown>
runtime_owner: <执行 runtime owner，没有则写 unknown>
stable_truth_context: <后续允许进入的稳定 truth context，没有则写 none>
stable_spec_allowed: true | false
implementation_phases:
  - <阶段说明，没有则写 none>
affected_layers:
  - <governance | domain | application | interfaces | infrastructure | docs，没有则写 none>
owner_packages:
  - <truth owner package，没有则写 none>
target_paths:
  - <预期落点文件或目录，没有则写 none>
api_contract_deltas:
  - <接口或契约变化，没有则写 none>
state_flow_deltas:
  - <状态流转或运行时流程变化，没有则写 none>
config_deltas:
  - <配置项或配置语义变化，没有则写 none>
redis_queue_deltas:
  - <Redis key / queue payload / cache 语义变化，没有则写 none>
failure_modes:
  - <失败模式，没有则写 none>
observability:
  - <日志/指标/审计要求，没有则写 none>
rollout:
  - <发布或灰度要求，没有则写 none>
test_scope:
  - <unit | integration | repository | api_collection | mixed | none>
test_inputs:
  - <测试输入，没有则写 none>
test_asset_outputs:
  - <Test Plan / Test Report / API collection update / 测试任务清单，没有则写 none>
api_collection_impact:
  - <README / collection / import / openapi / none>
coverage_gate_targets:
  - <包 + threshold + command，没有则写 none>
integration_requirements:
  - <真实 DB / race / 依赖服务 / none>
verification_commands:
  - <验证命令，没有则写 none>
expected_outcomes:
  - <验证通过的预期证据，没有则写 none>
reviewer_focus:
  - <reviewer 需要重点复核的点，没有则写 none>
doc_generation_inputs:
  - <Test Plan / Test Report / collection README / PR 产物输入，没有则写 none>
doc_maintenance_inputs:
  - <需要维护的上游 doc 输入，没有则写 none>
```
