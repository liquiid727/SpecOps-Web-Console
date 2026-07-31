# Product AI OS MVP02 体验加固与质量收口 PRD

版本：v0.1  
状态：Draft  
日期：2026-07-30

> 输入：MVP02-A 全量本地 SPEC 交付（issue #061–#075 accepted）、desktop-terminal-replacement-prd
> TR-001–TR-008、adapter-capability-matrix.md、MVP01 验收记录、真实引擎验证证据。
> 此 PRD 不修改 MVP02 现有 PRD 或 SPEC；它补充的是"实现完成后的产品化验收与缺口加固"。

## 1. Goal

确认 MVP02-A 的本地桌面能力达到**产品级可用**——用户原本在系统 Terminal 中使用
Codex / Claude 的日常工作流可以完整、连续、无意外地在 Product AI OS 内完成。

不达标的体验缺口必须在本轮修复或明确挂起，不允许带着隐性断裂进入下一阶段。

## 2. Product Positioning

- **对象：** 日常使用 Codex CLI / Claude Code 的工程师（本地已安装和认证）。
- **边界：** 本轮只验证和加固 MVP02-A 本地桌面能力，不涉及远程控制、MVP03 产品增强或
  新的功能添加。
- **原则：** "不打开系统 Terminal"只是一项场景检查，不是产品成功定义的唯一度量。

## 3. User Stories

### QA-US-01 快速启动与恢复

用户打开 Product AI OS 后，在 10 秒内进入可操作的工作台；历史 Session 可恢复；
退出再打开后不丢失 Session、transcript 或用户草稿。

### QA-US-02 零障碍任务入口

用户从 Quest Home 输入任务到创建 Chat Session 并获得首条流式响应，不超过 4 次
用户交互步骤；路径中的每一步都有明确的"下一步可做什么"指引。

### QA-US-03 可理解的执行过程

流式 Assistant 消息即时出现；Tool、Command、File Change、Approval、Error 按语义
渲染，无噪音干扰；用户可以停止、重试、审批、查看 Diff、滚动或跳到最新内容。

### QA-US-04 连续性与恢复

停止/重启应用后 Agent Session 能恢复（native resume 成功时续接上下文；失败时
明确提示）。异常退出不产生重复 Agent 进程或 stale 运行态。

### QA-US-05 设置与偏好持久

语言、主题、快捷键、Profile、模型偏好在切换/重启后保持一致。未实现的能力隐藏
或带明确 disabled reason，不保留假开关。

### QA-US-06 多引擎与多 Session 并行

4 个活跃 Session 不会出现事件串台；Codex 和 Claude 会话各自独立运行，不互相
干扰生命周期。

### QA-US-07 响应式与无障碍

桌面三栏、窄屏单栏、键盘焦点、屏幕阅读器 label、中文 IME 不误提交、
reduced-motion、文案无截断——所有已有 a11y/i18n 承诺在 QA 中如实验证。

## 4. Functional Requirements

- FR-QA-1：启动到可操作主工作台不超过 MVP01 基线 10 秒（含 runtime health handshake）。
- FR-QA-2：异常退出后重启，受管 sidecar 不残留重复进程。
- FR-QA-3：Quest Home → Open Folder / Recent → Engine Ready → Task → Chat Session
  整条路径可自动化验证。
- FR-QA-4：Chat 流式：delta 不逐 token 更新全局状态；50,000 events 仍可滚动。
- FR-QA-5：Stop 幂等；Retry 不重复用户消息；Approve/Deny 只生效一次。
- FR-QA-6：Terminal Fallback 可在应用内打开，明确说明打开原因，并可返回 Chat。
- FR-QA-7：所有 Dialog / Menu / Drawer 有 Escape、焦点圈定和焦点归还。
- FR-QA-8：英文/中文文案完整、无溢出、无硬编码键；切换语言不重置视图状态。
- FR-QA-9：长标题、长路径、长模型名在窄视口下不覆盖邻近控件。
- FR-QA-10：真实 Codex 和 Claude CLI smoke 可用时记录版本和完整链路证据。

## 5. Non-Goals

- 不重写或重复实现 ClientRuntime、AgentBackend、Transport 或 Orchestrator。
- 不引入新的产品功能（日报、任务列表、RepoWiki、Skill、主题增强）。
- 不纳入远程控制（issue #076–#089 已 descoped）。
- 不做自动化 CI 平台矩阵覆盖（macOS/Windows/Linux 留给打包阶段）。

## 6. Success Criteria

| Metric | Gate |
|---|---|
| experience-checklist 必需项全部 PASS 或有 accepted-risk 签署 | 必须 |
| 自动化回归（unit + build + ui:check）通过 | 必须 |
| 真实 Codex smoke 全链路 PASS | 必须 |
| 真实 Claude smoke 全链路 PASS | 必须 |
| P0/P1 缺口数 = 0 | 必须 |
| Tauri packaged-build smoke | 建议（缺打包环境可标 BLOCKED） |
| Chrome 窄屏 390×844 走查 | 必须 |
| P2 缺口挂起并有责任边界 | 允许 |

## 7. Acceptance

完成所有必须 gate 后填写 `qa-gate.md` 门禁记录；记录执行人、时间、commit、
操作系统、引擎版本和证据位置。签署后方可确认 MVP02-A 体验质量达标。
