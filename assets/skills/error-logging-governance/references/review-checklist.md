# Error Logging Review Checklist

- 业务错误是否仍留在 `pkg/errcode`
- API-facing 错误是否正确映射到 `pkg/errno`
- wrap / convert 路径是否保留了原始业务语义
- handler 是否错误地手工分支错误码，而没有复用统一 helper
- 是否新增了 ad-hoc error code
- 是否遗漏 `request_id` / `trace_id` / `module`
- 审计日志是否缺少对象、动作、操作者、结果
- 是否泄露了 token、密码、PII 或第三方敏感响应
- 是否错误扩大了 bootstrap `log` 例外的使用范围
