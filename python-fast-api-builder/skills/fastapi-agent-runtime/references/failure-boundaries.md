# Failure Boundaries

必须明确：

- 请求级 timeout
- provider 调用 timeout
- 单 step 最大重试次数
- 整体任务取消语义
- 幂等 key 或重复提交策略

常见错误：

- HTTP 断开后后台任务继续泄漏运行
- provider 超时和业务失败混成同一错误码
- 重试没有幂等保护导致重复写入
