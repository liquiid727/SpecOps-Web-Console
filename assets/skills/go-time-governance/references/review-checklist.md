# Go Time Governance Review Checklist

- 是否新增了散落在业务逻辑中的 `time.Now()`
- 是否需要 `Clock`、`NowFunc` 或 fake clock
- 时间字段是否正确区分 required / optional / nullable
- 零值时间是否被误当成业务缺省值
- DB 时间字段是否说明 UTC、精度、infinity/out-of-range 行为
- 过期、TTL、重试窗口、幂等窗口是否有 owner、起算点和结束条件
- 定时任务、ticker、timer 是否支持 context cancellation
- 测试是否依赖真实当前时间、真实 `time.Sleep` 或不可控后台循环
- API 输出是否仍遵循 UTC RFC3339 和 `SafeTime` 约定
- 本地时区展示是否被错误下沉到 backend canonical state
