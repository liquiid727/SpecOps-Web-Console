# API Contract Review Checklist

- endpoint 是否有显式 request / response model
- handler 是否引入了 inline request struct
- 成功响应是否退化成 `gin.H` 或匿名 map
- Swagger `@Param` / `@Success` 是否仍引用显式模型
- request DTO 是否误承载业务合法性判断
- optional time、当前时间、过期/TTL 或 DB 时间精度是否应转交 `go-time-governance`
- response 时间字段是否需要 `SafeTime`
- `SafeTime` 是否通过 response-layer helper 组装
- 时间格式描述是否仍是 UTC RFC3339
- 横切 wrapper 与业务 DTO 是否放在了正确目录
