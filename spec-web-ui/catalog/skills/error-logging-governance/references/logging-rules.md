# Logging Rules

## 统一入口

- 业务与运行时日志统一使用 `pkg/logger`
- 常用字段构造器使用 `logger.String`、`logger.Int`、`logger.Bool`、`logger.Any`、`logger.Err`
- KV 风格使用 `logger.Infow/Warnw/Errorw`

## 规则

1. 不要在业务代码中扩散 `fmt.Println`、`log.Println`、裸 `zap.Field`。
2. 关键路径日志至少带上 `module`、`request_id` / `trace_id` 和关键业务标识。
3. `Debug` 用于诊断，`Info` 用于正常生命周期，`Warn` 用于可恢复问题，`Error` 用于需要关注的失败。
4. token、密码、验证码、PII、第三方敏感回包默认不落日志。
5. 审计日志要写清动作、对象、操作者和结果，不要只打一句自由文本。
6. bootstrap 期 logger 尚未初始化时，允许在配置装载期使用受控标准库 `log`；业务运行期不适用这个例外。

## 常见缺口

- 只有错误文案，没有 trace 或业务标识
- 日志级别全都打成 Error
- 把第三方完整响应体直接写入日志
- handler / service 两层重复打印同一错误且没有新增上下文
