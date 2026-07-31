# SPEC: MVP02 体验加固验收规范

> Parent: [prd-experience-hardening.md](./prd-experience-hardening.md)  
> 依赖 SPEC：[agent-runtime-spec](../mvp02/spec/agent-runtime-spec.md)、
> [client-runtime-spec](../mvp02/spec/client-runtime-spec.md)、
> [ui-interaction-spec](../mvp02/spec/ui-interaction-spec.md)、
> [test-spec](../mvp02/spec/test-spec.md)  
> 日期：2026-07-30

## 1. Purpose

定义 MVP02-A 交付物的体验验收标准、执行方法、证据要求和缺口处理协议。
本 SPEC 不引入新架构或功能实现；它规定的是"如何证明现有实现达标"。

## 2. Verification Layers

| Layer | 方法 | 通过条件 | 证据形式 |
|---|---|---|---|
| L1 自动化回归 | `npm run test --run` / `build` / `ui:check` | 零失败（skipped 可接受） | 命令输出截图或日志 |
| L2 场景自动化 | Playwright E2E 或等效脚本 | 主路径全部 PASS | test-results 报告 |
| L3 人工走查 | 按清单手动操作 + 截屏/录屏 | 每项有证据标注 | 截图、录屏或 DOM snapshot |
| L4 真实引擎 smoke | 真实 Codex/Claude CLI 端到端 | 全链路无阻断 | 脚本输出 + transcript 导出 |
| L5 平台验证 | Tauri packaged build / Chrome 窄屏 | 主流程可完成 | 截图/日志（缺环境标 BLOCKED） |

## 3. Scenario Domains

### 3.1 生命周期（LIF）

| ID | 场景 | 验证要点 | FR 映射 |
|---|---|---|---|
| LIF-01 | 启动到可操作工作台 | runtime health → 主工作台 ≤10s | FR-QA-1 |
| LIF-02 | 异常退出后重启 | 无重复 sidecar / 无 stale state | FR-QA-2 |
| LIF-03 | 关闭所有面板再重开 | Escape/焦点归还/偏好保存 | FR-QA-7 |
| LIF-04 | 退出应用 | sidecar 结束、Session 可恢复 | FR-QA-1,2 |

### 3.2 首次使用路径（FLOW）

| ID | 场景 | 验证要点 | FR 映射 |
|---|---|---|---|
| FLOW-01 | Open Folder (native/web) | picker → Workspace 加载 → Engine detect | FR-QA-3 |
| FLOW-02 | Quest Home → 快速创建 | ≤4 steps → Chat Session → 首条 streaming | FR-QA-3 |
| FLOW-03 | 无 Workspace / Engine 不可用 | 明确失败态 + remediation | FR-QA-6 |
| FLOW-04 | 历史 Session 切换 | 切换无丢失、回放完整 | FR-QA-3 |

### 3.3 Chat 与 Agent 控制（CHAT）

| ID | 场景 | 验证要点 | FR 映射 |
|---|---|---|---|
| CHAT-01 | 发送消息 + 流式回复 | delta 不逐 token 全局更新；assistant bubble 即时出现 | FR-QA-4 |
| CHAT-02 | 结构化事件渲染 | Tool/Command/File/Approval/Error 按类型卡片呈现 | FR-QA-4 |
| CHAT-03 | Stop 运行中轮次 | 幂等停止；无重复执行 | FR-QA-5 |
| CHAT-04 | Retry 失败轮次 | 不重复用户消息；明确重试语义 | FR-QA-5 |
| CHAT-05 | Approval Allow/Deny | 只生效一次；过期/已决策卡片冻结 | FR-QA-5 |
| CHAT-06 | 滚动与 Back to latest | 用户滚动不抢回；按钮跳到最新 | FR-QA-4 |
| CHAT-07 | Chat ↔ Terminal 切换 | 不重复 PTY/Session；Fallback 说明原因 | FR-QA-6 |
| CHAT-08 | Native resume | 成功续接 / 失败明确提示 | FR-QA-5 |

### 3.4 设置与偏好（SET）

| ID | 场景 | 验证要点 | FR 映射 |
|---|---|---|---|
| SET-01 | 语言/主题切换 | 刷新/重启后保持；不重置视图 | FR-QA-8 |
| SET-02 | 快捷键 | 清单与实际一致；新建/切换/视图可键盘 | FR-QA-7 |
| SET-03 | Profile/模型偏好 | 按 Profile 记忆；失效提示修复 | FR-QA-8 |
| SET-04 | 未实现能力 | 隐藏或 disabled reason；无假开关 | FR-QA-8 |

### 3.5 响应式与无障碍（UI）

| ID | 场景 | 验证要点 | FR 映射 |
|---|---|---|---|
| UI-01 | 桌面三栏布局 | Sidebar / Center / RightPanel 协调 | FR-QA-9 |
| UI-02 | 窄屏 390×844 | 单栏 drill-in；无横向滚动 | FR-QA-9 |
| UI-03 | 中文 IME | 组合输入不提前提交 | FR-QA-8 |
| UI-04 | 长文本 overflow | 标题/路径/模型名不遮挡邻控件 | FR-QA-9 |
| UI-05 | a11y role/keyboard | Dialog/Menu/Tabs 有 focus trap + aria | FR-QA-7 |
| UI-06 | reduced-motion | 动画遵守用户偏好 | FR-QA-7 |

### 3.6 性能与并发（PERF）

| ID | 场景 | 验证要点 | FR 映射 |
|---|---|---|---|
| PERF-01 | 50,000 events transcript | 可滚动、可定位 | FR-QA-4 |
| PERF-02 | 高速 streaming | Sidebar/Composer 仍可操作 | FR-QA-4 |
| PERF-03 | 4 Session 并行 | 无事件串台 | FR-QA-4 |
| PERF-04 | 大文件 Diff | 限制或渐进渲染，不卡死 | FR-QA-4 |

### 3.7 真实引擎 Smoke（ENGINE）

| ID | 场景 | 验证要点 | FR 映射 |
|---|---|---|---|
| ENGINE-01 | Codex 全链路 | readiness → chat → stream → resume | FR-QA-10 |
| ENGINE-02 | Claude 全链路 | readiness → chat → stream → resume | FR-QA-10 |
| ENGINE-03 | Codex approval/diff（如可触发） | approval card → allow/deny → diff | FR-QA-10 |
| ENGINE-04 | Claude approval/diff（如可触发） | approval card → allow/deny → diff | FR-QA-10 |
| ENGINE-05 | Stop + Retry（真实引擎） | 幂等中断 + 重试生效 | FR-QA-10 |
| ENGINE-06 | 应用重启 + native resume | 重启后 session 续接 | FR-QA-10 |

## 4. Evidence Requirements

每个场景的验证结果必须附带以下至少一种证据：

1. **自动化测试输出**（命令 + 结果摘要）
2. **脚本输出**（如 `issue062-real-engine-check.mjs` 日志）
3. **截图 / 录屏**（标注验证点）
4. **DOM snapshot / evaluate_script 输出**
5. **Transcript 导出**（json 或关键事件列表）

无证据的场景不得标记 PASS。

## 5. Gap Handling Protocol

| 发现类型 | 处理 |
|---|---|
| 已有 issue 覆盖的功能正常 | 直接复用 issue 证据，标 PASS |
| 已有 issue 覆盖但行为不符 | 在该 issue 追加 QA 补丁，重新验证 |
| 未被现有 issue 覆盖的缺口 | 新建 `.issues/issue-{next}-*.md`，分级 P0/P1/P2 |
| 环境限制无法执行 | 标 BLOCKED + 原因 + 责任边界 |
| 低优先级已知限制 | 标 SKIPPED + accepted-risk 签署 |

## 6. Execution Order

```text
Phase 1: 自动化回归（L1）
  └── npm run test / build / ui:check → 证据记录

Phase 2: 场景自动化（L2）
  └── E2E / acceptance scripts → test-results

Phase 3: 人工走查（L3）
  ├── Chrome 桌面视口
  ├── Chrome 窄屏 390×844
  └── 截图/录屏 → qa-gate.md

Phase 4: 真实引擎 smoke（L4）
  ├── Codex 全链路
  └── Claude 全链路

Phase 5: 平台验证（L5）
  └── Tauri packaged build（如可用）

Phase 6: 缺口处理
  ├── P0/P1 → 修复 → 重验证
  └── P2 → 挂起 + 签署

Phase 7: 门禁签署
  └── qa-gate.md 填写 → 结论
```

## 7. Issue Decomposition Guidance

当需要新建 QA issue 时，按以下分类拆分：

| Issue Scope | 内容 |
|---|---|
| QA-LIF | 启动、退出、重启、sidecar 生命周期缺口 |
| QA-FLOW | 首次使用路径、Session 管理缺口 |
| QA-CHAT | 流式渲染、控制、结构化卡片、resume 缺口 |
| QA-SET | 设置/偏好/模型/快捷键缺口 |
| QA-UI | 响应式、a11y、i18n 缺口 |
| QA-PERF | 性能、并发、大数据量缺口 |
| QA-ENGINE | 真实引擎链路缺口 |

每个 issue 必须包含：复现步骤、期望行为、实际行为、优先级、关联 checklist ID。

## 8. Traceability

| PRD Story | Spec Scenarios | Checklist IDs |
|---|---|---|
| QA-US-01 | LIF-01–04 | QA-LIF-01–07 |
| QA-US-02 | FLOW-01–04 | QA-FLOW-01–07 |
| QA-US-03 | CHAT-01–08 | QA-CHAT-01–08 |
| QA-US-04 | LIF-02,04 + CHAT-08 | QA-LIF-06,07 + QA-CHAT-08 |
| QA-US-05 | SET-01–04 | QA-SET-01–06 |
| QA-US-06 | PERF-03 | QA-PERF-04 |
| QA-US-07 | UI-01–06 | QA-UI-01–06 |

## 9. Completion Gate

本 SPEC 的验收标准即 PRD §6 Success Criteria 表中所有"必须"行全部达标。
达标后填写 `qa-gate.md` 签署，状态从 `PENDING` 变为 `PASS` 或 `CONDITIONAL`。
