# Layering Rules

## 四层职责

- `domain`
  - 拥有 entity、VO、domain service、业务不变量、业务合法性、兼容归一化
- `application`
  - 拥有 use case 编排、事务边界、跨仓储调度、幂等、重试、事件协调、外部集成流控
- `interfaces`
  - 拥有协议解析、request binding、response rendering、transport error mapping
- `infrastructure`
  - 拥有数据库、缓存、外部客户端、repository 实现和运行时技术适配

## application 薄封装标准

`application` 应该像 orchestration shell，而不是业务规则主舞台。

允许放在 `application` 的内容：

- 调用多个 repository / domain service 组织一个 use case
- 开启事务、控制提交与回滚
- 做幂等键检查、重试策略、事件发布、外部接口协调
- 将 domain error 包装成更适合 use case 上下文的错误

不应放在 `application` 的内容：

- 业务 enum 合法性 `switch/if`
- 与具体业务状态转换强绑定的硬编码判断
- 把 request 层 `oneof` 当成最终业务真相
- 用裸字符串、裸整数在多个步骤里传递业务状态

判断口径：

- 如果规则回答的是“业务上什么值合法、什么状态允许、什么组合成立”，优先归 `domain`
- 如果规则回答的是“这一趟请求怎么调度步骤、怎么包事务、怎么做幂等与重试”，归 `application`

## 各层禁止事项

### handler / interfaces

- 禁止写业务合法性 `switch/if`
- 禁止把 DTO 字段直接当领域真相
- 禁止在成功响应里回传未经领域归一化的业务状态文本

### use case / application service

- 禁止复制 VO / entity 已有合法性判断
- 禁止把多处散落的业务守卫条件堆成流程脚本
- 禁止因为“方便”而跳过 domain constructor / parser

### repository / infrastructure

- 禁止承载业务真相判断
- 禁止让存储层枚举值反向定义领域语义
- 禁止把某个上下文独有业务规则下沉到 shared 技术组件

## context owner / runtime owner 的最小关系

- package owner 与 runtime owner 必须一致
- 某个 control loop 如果 runtime 归 `context-a`，它的业务控制逻辑就不该落到 `context-b/application`
- `shared-contract` 只承接稳定共享契约和技术抽象，不承接单一上下文业务真相

## 使用建议

- 新增业务校验时，先问“这个校验是否能被抽成 VO/domain API”
- 新增业务状态字段时，先问“是否需要 typed enum / VO，而不是 string 常量散落”
- 评审 application service 时，优先看它是否仍然只是 orchestration shell
