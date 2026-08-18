# Review Checklist

用于实现者自查或 reviewer 快速审查 DDD 分层与领域建模问题。

- 业务合法性是否进入了 domain API，而不是散落在 handler / application？
- `application` 是否仍然只做 orchestration、事务、幂等、外部集成协调？
- 是否出现了新的业务 `switch/if` 落在 `interfaces` 或 `application`？
- 新增的 status/type/mode/provider/source 是否收敛成 enum、VO 或 typed constant？
- 是否仍存在裸字符串、裸整数魔法值跨层扩散？
- entity 是否承载了必要不变量，而不是只做字段容器？
- 规则横跨多个 entity / VO 时，是否落在 domain service，而不是堆在 use case？
- request 层 `oneof` / binding 规则是否只用于协议约束，没有被当成业务真相？
- `shared` 是否避免承接单一上下文业务枚举、业务校验或状态机语义？
- 如果分层裁决或领域真相发生语义变化，是否同步更新相关项目文档？
