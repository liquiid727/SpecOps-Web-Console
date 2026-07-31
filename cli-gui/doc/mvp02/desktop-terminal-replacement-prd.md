# Product AI OS Desktop Terminal Replacement MVP02 PRD

版本：v0.1  
状态：Draft  
日期：2026-07-29

## 1. Goal

已安装 Codex CLI 或 Claude Code 的用户，不需要打开系统 Terminal，即可在
Product AI OS 中完成项目加载、Agent 检测、会话创建、任务发送、执行观察、
审批、取消、恢复、历史回放和只读 Diff 检查。

应用内 Terminal 保留为登录、兼容性和诊断兜底，但不是正常主路径。达到完整
Codex App/Claude App 替代属于 MVP03。

## 2. Primary Journey

```text
Open Product AI OS
  -> Open or select Workspace
  -> Select Codex or Claude
  -> Verify installation/auth/version
  -> Select model and permission policy
  -> Enter task
  -> Create Chat Session and stream first turn
  -> Review tools/files/diff
  -> Approve, deny, stop, retry, or continue
  -> Restart application and resume the native Agent session
```

## 3. User Stories

### TR-001 Engine Readiness

用户能看到 Codex/Claude 是否安装、是否登录、版本是否受支持、可用模型、
权限、结构化输出和恢复能力，并获得可执行的修复动作。

### TR-002 Open A Workspace

用户通过原生目录选择器载入项目；最近 Workspace 可一键重开；路径校验与
symlink 保护沿用 MVP01 安全契约。

### TR-003 Start A Chat-First Session

用户在 Quest Home 选择 Workspace 和 Agent 后直接输入任务。名称由任务摘要
生成，支持结构化 Chat 时默认创建 Chat Session。

### TR-004 Follow Agent Work

用户能区分 Assistant 正文、Tool、命令、文件变化、审批、生命周期和错误，
并在长输出中保持流式、可滚动和可恢复。

### TR-005 Control A Turn

用户可以停止进行中的轮次、重试失败轮次、处理审批，并在不丢失输入草稿的
情况下等待当前轮完成。

### TR-006 Review Results

用户从文件变化跳转到 Preview/Diff，查看当前 Workspace 的 Git 状态和只读
Diff，无需运行 `git status` 或 `git diff`。

### TR-007 Resume Work

应用重启后，用户可以回放完整历史并继续 Codex thread 或 Claude session。
原生会话失效时必须明确提示并允许建立新上下文，不能静默重置。

### TR-008 In-App Setup Fallback

CLI 已安装但需要登录或只支持交互式恢复时，用户在应用内受控 Terminal 完成
流程，不需要切换到系统 Terminal。

## 4. Functional Requirements

- FR-TR-1：Chat 可用性由 Engine readiness/capability 决定，不使用全局关闭常量。
- FR-TR-2：普通用户只选择 Engine/Profile、模型和权限；command/argv 属于高级设置。
- FR-TR-3：Default 与真实 Plan 模式可用；无运行语义的 Spec/Goal 不在主 Composer 显示。
- FR-TR-4：所有可见 Composer 控件必须工作或具有明确禁用原因。
- FR-TR-5：支持流式 delta、规范事件回放、取消、重试、审批和 resume。
- FR-TR-6：Tool/PTY 噪音默认折叠；Assistant 和用户消息保持清晰主层级。
- FR-TR-7：右栏展示 Engine、Transport、模型、状态、工具/文件统计和只读 Diff。
- FR-TR-8：完成、失败和等待审批可触发桌面通知。
- FR-TR-9：Session 搜索/过滤覆盖名称、Workspace、Engine 和状态。
- FR-TR-10：Terminal 作为 Advanced/Fallback 入口，不是默认中心视图。

## 5. Error And Recovery Requirements

稳定错误至少包括：

- `ENGINE_NOT_INSTALLED`
- `ENGINE_AUTH_REQUIRED`
- `ENGINE_VERSION_UNSUPPORTED`
- `ENGINE_CAPABILITY_UNAVAILABLE`
- `ENGINE_TRANSPORT_UNAVAILABLE`
- `ENGINE_NATIVE_SESSION_EXPIRED`

每个错误必须提供用户可执行的 remediation；原始 stderr 可在详情中查看，但
不能成为唯一用户信息。

## 6. Acceptance

Codex 与 Claude 各完成一条真实验收路径：Open Folder→创建 Chat→多轮执行→
审批或权限兜底→查看文件/Diff→取消/重试→重启→resume。全程不打开系统
Terminal，并保留真实 CLI 版本和测试证据。
