# Rust Session State 实验

这是一个不依赖 Tokio、Tauri 或 Codeg 的纯 Rust 小实验，用来练习 Agent Runtime 中
最重要的几个概念：

- `enum` 表达有限状态；
- `Result` 表达非法状态转移；
- `BTreeSet` 保存正在运行的 tool invariant；
- sequence 只在命令成功后递增；
- cancel 在 terminal state 上幂等；
- `apply_all` 把命令队列串行化，便于以后替换成 channel/actor。

运行：

```bash
cargo test --manifest-path \
  cli-gui/doc/research/codeg-learning/labs/rust-session-state/Cargo.toml

cargo run --manifest-path \
  cli-gui/doc/research/codeg-learning/labs/rust-session-state/Cargo.toml
```

建议的阅读顺序：

1. 先看 `SessionStatus`、`Command`、`TransitionError`；
2. 再看 `SessionState::apply` 的状态守卫；
3. 观察失败 command 不消耗 sequence；
4. 修改测试，加入重复 tool、错误 permission id、失败后 cancel 等场景；
5. 再把 `apply_all` 改造成标准库 channel 的 command loop，比较「直接调用」和「消息
   驱动」两种所有权模型。

它故意没有模拟完整 ACP。目标是先把状态、错误、终态和可重放序列写清楚，再回到
Codeg 的 `session_state.rs`、`manager.rs` 和 `event_stream.rs` 对照真实复杂度。
