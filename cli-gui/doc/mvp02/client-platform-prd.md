# Product AI OS Client Platform MVP02 PRD

版本：v0.1  
状态：Draft  
日期：2026-07-29

> 输入：MVP01 PRD、MVP02 Remote Control PRD，以及“同一套 TypeScript UI
> 运行于浏览器与 Tauri WebView”的客户端架构讨论。原始输入保持不变。

## 1. Product Positioning

Product AI OS 是一个桌面优先的 Agent Workspace：

- Tauri Desktop 是主执行端，拥有本地 Workspace、CLI、PTY、Git 和凭据。
- Web/移动 Web 是远程控制端，通过 Control Server 控制配对的桌面设备。
- Desktop Shell 与 Remote Shell 可以不同，但共享业务组件、状态模型、
  AgentEvent、Session 交互和设计系统。

目标共享率为 85%–95% 的 TypeScript 业务代码。平台差异必须集中在
ClientRuntime 与 PlatformPort，不得分叉复制完整应用。

## 2. Goals

- 一套 React/TypeScript/Vite 前端同时服务浏览器开发、Tauri Desktop 和远程 Web。
- 浏览器使用 Mock Runtime 即可开发和验证主要 UI 状态。
- 业务组件不感知 HTTP、WebSocket、Tauri IPC 或远程中继。
- Desktop 与 Remote 使用同一 Session、事件、错误和权限语义。
- 高频 token、Terminal 输出和大 Diff 不造成逐 token 全局重渲染。
- 所有新增流程支持英文和中文，以及 empty/loading/success/failure 状态。

## 3. User Stories

### CP-001 Shared Desktop And Web UI

用户在浏览器开发模式与 Tauri Desktop 中看到相同的核心 Workspace、
Session、Chat、Diff 和设置体验，无需维护两份业务页面。

### CP-002 Mock-First Development

开发者可以在没有 Rust、CLI、网络或本地 Runtime 的情况下，用 Mock Runtime
模拟流式回复、工具、文件变化、审批、失败、离线和恢复。

### CP-003 Platform-Native Capabilities

同一个“打开项目”交互在 Desktop 使用原生目录选择器，在远程 Web 中选择设备
暴露的 Workspace；组件只消费能力结果，不判断运行平台。

### CP-004 Responsive Remote Shell

远程 Desktop Web 使用完整工作区布局；移动 Web 使用单栏 Session/Chat/审批
流程和简化 Diff，不强行压缩桌面三栏。

### CP-005 Safe Desktop Packaging

Tauri 只加载本地打包的前端资源。高权限本地能力按窗口、命令和 Workspace
范围授权，远程网页不能获得本地 PTY 或任意文件权限。

## 4. Functional Requirements

- FR-CP-1：客户端通过依赖注入获得唯一 ClientRuntime。
- FR-CP-2：业务组件不得直接调用 `fetch`、`WebSocket`、`window.location`
  或 Tauri `invoke`。
- FR-CP-3：ClientRuntime 至少提供 Mock、Local HTTP 和 Remote 三种实现。
- FR-CP-4：Tauri 原生能力通过独立 PlatformPort 提供。
- FR-CP-5：本地与远程事件进入同一个 reducer/projection 入口。
- FR-CP-6：流式 delta 保持瞬态；规范事件落盘后替换瞬态内容。
- FR-CP-7：断线恢复以稳定 event ID 和 sequence/cursor 去重。
- FR-CP-8：业务状态、用户偏好和瞬态 UI 继续使用现有 Zustand 三层模型。
- FR-CP-9：平台不支持某能力时隐藏入口或显示可执行的恢复说明。
- FR-CP-10：Desktop/Remote Shell 均通过现有 i18n 和设计系统交付。

## 5. Non-Goals

- MVP02 不维护第二套 React 应用或第二套协议类型。
- 不在业务组件中实现平台检测分支。
- 不把本地 Session、Workspace、凭据或完整 transcript 迁移为云端事实源。
- 不在 MVP02 重写 React UI 为 Rust 原生 UI。

## 6. Success Criteria

- ≥85% 的非 Shell TypeScript 代码由 Desktop 与 Remote 共用。
- 核心业务组件中不存在直接 HTTP/WS/Tauri IPC 调用。
- Mock/Local/Remote 通过同一套 Runtime 合同测试。
- Chrome 与 Tauri WebView 的 Workspace→Session→Chat 主流程一致。
- 远程不可用不影响本地 Session；本地 Runtime 不可用时 UI 明确可恢复。
