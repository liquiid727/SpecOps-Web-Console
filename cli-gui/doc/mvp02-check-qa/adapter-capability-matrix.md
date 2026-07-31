# Adapter Capability Matrix

> 产品诚实原则（docx §18 最终边界）：每个 adapter 的能力声明与实际事件覆盖如实标注。

## 能力矩阵

| Capability | codex | claude-code | kimi | glm | generic |
|---|---|---|---|---|---|
| `compatibility` | supported¹ | supported¹ | supported¹ | supported¹ | unavailable/unknown |
| `supportsComposer` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `supportsStructuredRecognition` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `supportsHeadlessTurns` | ✅¹ | ✅¹ | ✅² | ✅² | ❌ |
| `supportsResume` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `supportsApproval` | ❌ | ❌ | ❌ | ❌ | ❌ |
| `supportsPromptEnhancement` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `guiMode` | full | full | full | full | unsupported |

¹ 需 CLI 版本在验证区间内（codex: >=0.145.0 <1.0.0，claude-code: >=2.0.0 <3.0.0）  
² kimi/glm 无默认版本区间，探测到版本即通过

## guiMode 派生规则

```
headless + compatibility=supported → "full"
compatibility=supported (but not headless) → "partial"
otherwise → "unsupported"
```

- **full**：完整 GUI 视图可用，所有事件正常归并
- **partial**：实验性 GUI 可切换，顶部显示降级提示 + "查看原始终端"入口
- **unsupported**：GUI 按钮禁用，仅终端交互

## 事件覆盖矩阵（agent-runtime-spec §7）

| Event Category | codex | claude-code / kimi / glm | generic |
|---|---|---|---|
| text delta (assistant_message) | ✅ item.completed(agent_message) | ✅ assistant.content[text] | N/A |
| streaming delta (hooks.onDelta) | ❌ | ✅ stream_event(text_delta) | N/A |
| tool (tool_activity) | ✅ command_execution, mcp_tool_call | ✅ tool_use | N/A |
| command/shell (tool_activity) | ✅ command_execution | ✅ tool_use(Bash/shell) | N/A |
| file change (file_change) | ✅ item.completed(file_change) | ✅ tool_use(Write/Edit/…) | N/A |
| approval request (approval_request) | ✅ approval.requested | ✅ approval_requested/permission_requested | N/A |
| approval result (approval_response) | ✅ approval.resolved | ✅ approval_resolved/permission_resolved | N/A |
| usage | ✅ turn.completed.usage | ✅ result.usage | N/A |
| completion (lifecycle) | ✅ turn.completed → lifecycle | ✅ result → lifecycle | N/A |
| cancellation (lifecycle) | ✅ turn.cancelled → lifecycle | — (进程退出处理) | N/A |
| structured error (error) | ✅ error event | ✅ error event + result.error | N/A |
| unknown/diagnostic | → pty_output(diagnostic:true) | → pty_output(diagnostic:true) | N/A |

## 降级策略

- **未识别厂商事件**：降为 `pty_output`（metadata 标记 `diagnostic: true`），不中断轮次流
- **JSON 解析失败**：原始行降为 `pty_output`，保留可见性
- **generic adapter**：调用 parseEvents 抛出 `HeadlessTurnUnsupportedError`，不进入事件流

## resume 机制

| Adapter | Resume Token 来源 | 恢复方式 |
|---|---|---|
| codex | `thread.started.thread_id` / `session.created.session_id` | `resume <token>` 子命令前置 |
| claude-code | `session_id` 帧（取最后出现） | `--resume <token>` 旗追加 |
| kimi / glm | 同 claude-code | 同 claude-code |
| generic | — | 不支持 |
