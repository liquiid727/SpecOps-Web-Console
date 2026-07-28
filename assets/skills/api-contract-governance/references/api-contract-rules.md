# API Contract Rules

## 适用范围

- `interfaces/api/request`
- `interfaces/api/response`
- handler 成功响应
- Swagger `@Param` / `@Success`
- API 时间字段序列化

## 规则

1. 新增或修改 endpoint 时，先决定 request/response 模型落在哪个 context。
2. request DTO 只承载 transport 层约束，不承载业务合法性真相。
3. response DTO 必须是稳定显式 struct，不要用 `gin.H`、匿名 struct 或 map。
4. 横切响应包装留在共享 response wrapper；业务响应 DTO 留在各自 context。
5. domain/application/model 中 optional time、时间源、过期/TTL 语义遵循 `go-time-governance`。
6. response 中可能出现异常年份或 DB infinity 的时间字段统一使用 `SafeTime`。
7. response 组装统一通过 `response.NewSafeTime(...)` / `response.NewSafeTimePtr(...)` 之类的 response-layer helper。
8. API 时间格式统一为 UTC RFC3339 字符串，例如 `2024-01-01T12:00:00Z`。
9. 禁止新增 Unix 时间戳、毫秒时间戳或无时区时间字符串。
10. Swagger 注解必须和显式 request/response 模型一致，不要继续写 `map[...]` 成功响应。

## 常见落点判断

- “这个字段是接口输入字段” -> `interfaces/api/request`
- “这个字段是接口输出字段” -> `interfaces/api/response`
- “这个校验是业务规则” -> 不在 request DTO，交给 domain API
- “这个 helper 只做 response 时间包裹” -> 各 context 的 response 包
- “这个判断依赖当前时间、过期、TTL 或 DB 时间精度” -> `go-time-governance`
- “这个 wrapper 是全局通用响应壳” -> shared response wrapper
