# Agent Test Focus

优先测这些：

- 同一输入重复提交是否幂等
- 上游 provider 超时后是否正确降级
- 取消请求时后台任务是否释放资源
- 流式输出中断时是否正确收尾
- checkpoint 或会话恢复是否一致
