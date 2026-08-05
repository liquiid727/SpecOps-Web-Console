# ACP JSONL Fixture 实验

这是一个故意缩小的 fake Agent，用 Node 标准库模拟「父进程通过 stdin/stdout 与一个
Agent 交换 JSON-RPC/JSONL 消息」的几个工程问题：

- response 用 `id` 关联 request；
- notification 没有 response id；
- 一个 JSON line 可以被拆成多个 stdout chunk；
- streaming update 与 response 交错出现；
- 未知 update 应保留诊断但不能让 client 崩溃；
- cancel 会让 prompt 和 cancel request 都得到 terminal response；
- 重复 cancel 返回 ignored，不重复发送 terminal update。

运行：

```bash
node cli-gui/doc/research/codeg-learning/labs/acp-jsonl-fixture/client.mjs
```

注意：这不是 ACP 完整实现，也不是协议兼容性测试。它只提供一个容易读、容易改、
不需要真实账号和第三方依赖的进程边界练习。真正接入 ACP 时，应以 ACP 官方规范、
SDK 和所接 Agent 的能力协商为准。

建议练习：

1. 把第二个 text chunk 的延迟改为 0，观察 client 是否仍能按 message predicate 取到
   正确事件；
2. 把未知 update 改成缺少 `sessionUpdate`，为 client 增加结构化诊断；
3. 让 fixture 在 prompt 期间退出，设计连接层的 process-exit 错误；
4. 增加一个 request timeout，并说明 timeout 后如何清理 pending waiter；
5. 将简单的 `messages` 数组改造成带 sequence 的 event log，再练 snapshot/replay。
