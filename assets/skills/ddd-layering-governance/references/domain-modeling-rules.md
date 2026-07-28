# Domain Modeling Rules

## VO、Entity、Domain Service 的职责

### VO

VO 用于承载：

- 业务输入合法性
- 业务值归一化
- 业务枚举与兼容别名
- 跨多处复用且不依赖身份的规则

优先模式：

- `ParseXxx(raw string) (Xxx, error)`
- `NormalizeXxx(raw string) string`
- `NewXxx(...) (Xxx, error)`
- `IsValidXxx(...) bool`

典型适用对象：

- `status`
- `type`
- `mode`
- `provider`
- `source`
- `channel`

### Entity

Entity 不只是字段容器。它应承载：

- 带身份的业务对象
- 对自身状态变化负责的不变量
- 领域动作入口，例如 `Activate`、`Cancel`、`BindDevice`

如果一个对象只有字段映射，没有任何不变量或动作约束，说明领域建模可能还没完成，或者它只是 persistence model。

### Domain Service

Domain service 适用于：

- 规则横跨多个 entity / VO
- 规则明显属于某个 bounded context 的业务真相
- 规则不是单纯的 orchestration，不应落到 `application`

它不适用于：

- HTTP/gRPC transport 细节
- repository 编排和事务控制
- 第三方调用重试、补偿、回调协调

## 为什么业务校验必须进 domain API

业务校验如果散落在 handler、use case、repository，会出现：

- 同一合法性在多处实现，逐渐漂移
- request 层约束被误当业务真相
- review 很难判断哪一处才是 canonical rule

把合法性统一收敛到 domain API 后：

- handler 只做协议层校验
- application 只做 orchestration
- reviewer 可以快速定位 canonical business rule

## 枚举化与去魔法值

优先级从高到低：

1. domain VO / typed enum
2. 领域包内 typed constant + constructor / parser
3. 最后才是局部临时常量

避免：

- 直接把 `"paid"`、`"pending"`、`"running"`、`"wechat"` 这类值散落在 handler/use case/repository 中
- 用整数状态位但不暴露语义名字
- response 直接透传底层存储值，而没有经过领域收口

推荐迁移路径：

1. 找出高频 magic value
2. 在 domain 中定义 typed enum / VO
3. 增加 parser / constructor / normalizer
4. 让 application 和 interfaces 只依赖领域类型或领域 API
5. 在边界层做必要的 request/response 转换

## 判断规则落点的简表

- “这个值是否合法” -> VO / domain API
- “这个实体当前状态能否执行动作” -> entity method 或 domain service
- “两个实体组合后是否满足业务条件” -> domain service
- “这次请求要按什么顺序调 repo 和外部系统” -> application
- “这个字段怎么从 JSON 绑定 / 渲染” -> interfaces
