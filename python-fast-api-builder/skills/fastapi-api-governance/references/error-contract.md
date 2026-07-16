# Error Contract

统一错误响应：

```json
{
  "code": "AGENT_CONTEXT_NOT_FOUND",
  "message": "conversation context not found",
  "request_id": "req_123",
  "details": {}
}
```

规则：

- `code` 稳定且机器可读
- `message` 面向开发者
- `request_id` 便于排障
- `details` 放补充上下文，不能替代稳定字段

建议错误码前缀：

- `COMMON_`
- `AUTH_`
- `VALIDATION_`
- `AGENT_`
- `STORAGE_`
- `INTEGRATION_`
