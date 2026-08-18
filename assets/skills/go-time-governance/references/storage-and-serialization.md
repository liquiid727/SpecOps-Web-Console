# Storage And Serialization Rules

## 存储

- 数据库存储默认使用 UTC。
- schema、migration 或 model 需要说明时间精度：秒、毫秒、微秒或数据库默认精度。
- nullable 时间在 Go 中优先用 `*time.Time` 或项目约定的 nullable 类型，不用零值时间表达“没有”。
- 如果数据库可能出现 infinity、out-of-range year 或历史脏数据，response 层必须有安全转换策略。
- `created_at`、`updated_at`、`deleted_at`、`expires_at`、`last_seen_at` 等字段要有明确写入方和更新时机。

## API 序列化边界

- API 时间格式由 `api-contract-governance` 负责，默认 UTC RFC3339 字符串。
- response 中可能出现 DB infinity / out-of-range year 的字段使用 response-layer `SafeTime` 或等价 helper。
- 禁止新增 Unix 时间戳、毫秒时间戳或无时区 datetime 字符串作为新 API 契约。
- 用户本地时区展示在 frontend 或 presentation 层处理，不改变 backend 的 canonical time。

## 常见落点判断

- “业务是否过期” -> domain/application，使用注入时间源
- “接口怎么输出时间” -> `api-contract-governance`
- “数据库怎么存时间” -> migration/model/infrastructure
- “后台任务什么时候跑” -> scheduler/application，必须可取消、可测试
- “用户看到哪个时区” -> frontend/presentation，不是 canonical backend state
