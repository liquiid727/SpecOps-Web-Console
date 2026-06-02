# Anti-Patterns

## 1. handler 中写业务合法性 `switch/if`

症状：

- handler 根据业务字段直接判定某状态是否合法
- request DTO 的 `oneof` 被当成完整业务真相

风险：

- 业务规则与 transport 耦合
- 同一规则在多个入口重复实现

## 2. application service 里堆业务规则

症状：

- use case 方法内出现大量状态判断、业务分支、兼容别名映射
- application 里比 domain 更懂业务值语义

风险：

- `application` 变厚
- 无法清晰区分 orchestration 和 business truth

## 3. shared 承接单上下文业务真相

症状：

- 为了复用，把某个 context 的业务 status/type/provider 放到 `shared`
- `shared` 内出现明显面向单一模块的业务校验

风险：

- `shared` 膨胀成新的业务上下文
- truth owner 漂移

## 4. entity 只有字段，没有不变量

症状：

- entity 只是数据库记录的镜像
- 所有状态变化规则都散落在 use case 或 handler

风险：

- entity 失去领域意义
- 不变量无法被统一保护

## 5. status/type 用裸字符串跨层传递

症状：

- handler、application、repository 都直接写 `"pending"`、`"success"` 之类文本
- 同一概念出现不同拼写或兼容别名

风险：

- 魔法值扩散
- 业务真相漂移

## 6. request `oneof` 被误当业务真相

症状：

- 因为 request 层限制了几个值，就不再进入 domain parser / validator

风险：

- 协议层约束替代了业务层真相
- 新入口或异步入口会绕过真正的业务校验

## 7. repository 枚举反向定义领域语义

症状：

- 数据库字段值直接决定业务可选项
- 持久化层常量被各层当作 canonical enum

风险：

- 存储细节绑架领域模型
- 重构或兼容映射成本升高
