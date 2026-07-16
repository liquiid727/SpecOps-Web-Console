# Clock And Business Time Rules

## 时间源

- 业务判断、状态流转、过期计算、重试窗口、幂等窗口不要直接调用 `time.Now()`。
- 优先通过 `Clock`、`NowFunc` 或项目已有等价封装注入当前时间。
- 只在 bootstrap、main、基础设施适配器或极薄的默认实现中直接接触真实系统时间。
- 后台循环、ticker、timer 必须可被 context cancellation 停止。

## 业务时间语义

1. 每个过期/有效期字段都要明确 owner：domain、application、infrastructure 或 external provider。
2. 每个时间窗口都要明确起算点：创建时间、首次执行时间、最后更新时间、外部事件时间或业务确认时间。
3. 每个时间判断都要明确边界：`<`、`<=`、`After`、`Before`、同一秒内重复执行如何处理。
4. 幂等窗口、重试窗口、TTL 不要只写 duration；同时说明对象标识、续期条件和清理责任。
5. 本地时区只属于展示或用户输入解释，不应成为 domain/application 的默认时间存储形态。

## 测试规则

- 单测使用固定时间或 fake clock。
- 不用真实 `time.Sleep` 等待业务状态；需要等待时使用可控 ticker、条件轮询或注入的时间推进。
- 并发和定时任务测试必须断言 goroutine 能退出，避免测试结束后仍有后台循环。
