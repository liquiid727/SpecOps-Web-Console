# Error Chain Rules

## 统一职责

- `pkg/errcode`
  - domain/application 业务语义
  - public message 与业务 code
- `pkg/errno`
  - API-facing code / message / HTTP status
- `pkg/errors`
  - wrap / convert / transport mapping
- `interfaces/api/response`
  - 最终 transport 输出与 `ConvertToErrNo` 入口

## 规则

1. 业务规则错误先在 domain/application 形成 `errcode`。
2. 跨边界 wrap 时保留原始错误语义，不要丢掉 `errcode`。
3. handler 不要自己发明 `switch/if` 错误码映射；优先走 `response.ConvertToErrNo`。
4. transport 层错误消息以 `errno` 为准，不要把内部实现细节直接透传给客户端。
5. 新增错误码时，同时评估是否需要新增 API-facing errno。
6. 不要在一个业务流程里混用多套互不兼容的错误码约定。

## 常见判断

- “这是业务规则拒绝” -> `pkg/errcode`
- “这是给客户端返回的标准错误码” -> `pkg/errno`
- “这是 wrap / convert / errors.As 路径” -> `pkg/errors`
- “这是 handler 最终输出” -> response 包 / `ConvertToErrNo`
