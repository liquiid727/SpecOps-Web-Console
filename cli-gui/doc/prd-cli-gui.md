# PRD：Product AI OS MVP01 — AI CLI Workspace Launcher

## 1. Introduction / Overview

Product AI OS MVP01 是一个面向个人开发者的本地 AI CLI 工作空间管理工具。它通过统一的可视化界面管理多个项目、CLI 配置和并发会话，减少用户手动打开多个终端、切换项目目录、识别窗口用途和恢复工作上下文的成本。

本 PRD 基于 `cli-gui/doc/cli-gui.md` 编写。MVP01 不重新实现 Codex 或 Claude 的 Agent 能力，而是作为本地 CLI 的启动、组织和会话管理层。

首个交付形态采用本地 Web 应用，后续将复用核心 Session Manager 封装为 Tauri 桌面应用。

## 2. Goals

- 在一个工作台内管理多个本地项目 Workspace。
- 通过 CLI Profile 快速启动 Codex CLI 和 Claude CLI。
- 为每个工作任务创建可命名、可切换的独立 Session。
- 为每个 Session 提供完整交互式终端能力。
- 支持至少 4 个并发 Session。
- 持久化 Workspace、Profile 和 Session 配置。
- 服务重启后允许用户手动恢复已停止的 Session。
- 启动前明确展示命令、参数和工作目录，并要求用户确认。

## 3. User Stories

### US-001：管理 Workspace

**Description:** As a developer, I want to register local project directories so that I can launch CLI sessions without repeatedly navigating directories in a terminal.

**Acceptance Criteria:**

- [ ] 用户可以创建 Workspace，填写名称和本地目录路径。
- [ ] 系统拒绝不存在或不是目录的路径，并显示明确错误。
- [ ] Workspace 列表展示名称和路径。
- [ ] Workspace 数据刷新或重启后仍然存在。
- [ ] Verify in browser using dev-browser skill。

### US-002：管理 CLI Profile

**Description:** As a developer, I want to save CLI launch profiles so that I can create Codex or Claude sessions consistently.

**Acceptance Criteria:**

- [ ] 系统默认提供 Codex CLI 和 Claude CLI Profile。
- [ ] Profile 包含名称、可执行文件和参数数组。
- [ ] 用户可以新增、编辑和删除 Profile。
- [ ] 创建 Session 前展示最终命令、参数和工作目录。
- [ ] CLI 不存在或不可执行时显示可理解的启动失败原因。
- [ ] Verify in browser using dev-browser skill。

### US-003：创建并启动 Session

**Description:** As a developer, I want to create a named session bound to a project and CLI so that I can run several AI coding tasks concurrently.

**Acceptance Criteria:**

- [ ] 用户可以填写 Session 名称并选择 Workspace 和 CLI Profile。
- [ ] 系统在启动前展示启动确认界面。
- [ ] 用户确认后系统创建独立 PTY 并启动 CLI。
- [ ] Session 列表显示名称、CLI、Workspace 和运行状态。
- [ ] 系统至少支持 4 个并发运行的 Session。
- [ ] Verify in browser using dev-browser skill。

### US-004：使用交互式 Terminal

**Description:** As a developer, I want to interact with each CLI inside the workspace so that I do not need separate terminal windows.

**Acceptance Criteria:**

- [ ] Terminal 支持键盘输入和实时输出。
- [ ] Terminal 正确显示 ANSI 颜色和基础终端控制序列。
- [ ] 用户可以发送 Ctrl+C。
- [ ] Terminal 在容器尺寸变化后自动调整 PTY 尺寸。
- [ ] 用户可以通过多个 Tab 切换 Session。
- [ ] Session 切换时不会混淆不同 Session 的输入和输出。
- [ ] CLI 退出后显示停止状态和退出码（如可获得）。
- [ ] Verify in browser using dev-browser skill。

### US-005：恢复已停止 Session

**Description:** As a developer, I want to resume a saved session configuration so that I can restart a task after restarting the local service.

**Acceptance Criteria:**

- [ ] Session 元数据在本地服务重启后仍然存在。
- [ ] 服务重启后，原有运行状态统一标记为 stopped，不能伪装成仍在运行。
- [ ] stopped Session 显示恢复操作。
- [ ] 恢复时复用原 Workspace、Profile 和 Session 名称。
- [ ] 恢复会创建新的 PTY，不复用已失效的进程句柄。
- [ ] Verify in browser using dev-browser skill。

### US-006：管理 Session 生命周期

**Description:** As a developer, I want to stop, rename, and delete sessions so that I can keep the workspace organized.

**Acceptance Criteria:**

- [ ] 用户可以停止运行中的 Session。
- [ ] 停止一个 Session 不影响其他 Session。
- [ ] 用户可以重命名 Session，列表和详情保持一致。
- [ ] 删除运行中的 Session 前显示确认提示。
- [ ] 删除后不能继续向该 Session 发送输入。
- [ ] Verify in browser using dev-browser skill。

## 4. Functional Requirements

- FR-1: 系统必须允许用户创建、查看、编辑和删除本地 Workspace。
- FR-2: 系统必须验证 Workspace 路径存在且为目录。
- FR-3: 系统必须提供 Codex CLI 和 Claude CLI 默认 Profile。
- FR-4: 系统必须允许用户配置 Profile 名称、可执行文件和参数数组。
- FR-5: 系统必须在启动前展示待执行的可执行文件、参数和工作目录。
- FR-6: 系统必须要求用户确认后才启动本地 CLI 进程。
- FR-7: 系统必须为每个运行中的 Session 创建独立 PTY。
- FR-8: 系统必须将 PTY 输出实时传递到对应的 Terminal UI。
- FR-9: 系统必须将 Terminal 输入发送到对应的 PTY。
- FR-10: 系统必须支持 Ctrl+C、终端 resize 和 ANSI 输出。
- FR-11: 系统必须支持多个 Session 并发运行。
- FR-12: 系统必须持久化 Workspace、Profile 和 Session 元数据。
- FR-13: 系统必须分别表达配置状态和进程运行状态。
- FR-14: 服务重启后，系统必须将无法确认存活的进程标记为 stopped。
- FR-15: 系统必须允许用户手动恢复 stopped Session。
- FR-16: 系统必须处理 CLI 不存在、目录无权限、PTY 创建失败和进程异常退出。
- FR-17: 只读或线上部署模式必须禁用本地进程启动和 Session 写操作。
- FR-18: 所有用户可见流程必须覆盖 empty、loading、success 和 failure 状态。

## 5. Non-Goals / Out of Scope

MVP01 不包括：

- Agent 调度、多 Agent 编排和 Workflow 执行。
- Memory、RAG、项目知识库和上下文自动注入。
- 代码编辑器、文件浏览器或 IDE 能力。
- API Key 管理、模型管理和 Provider 路由。
- 云端 Session 同步、多用户协作和远程服务器终端。
- CLI 进程的后台守护和自动恢复。
- 内置 Git 操作和 CI/CD 执行器。
- Gemini CLI 的实际接入；Profile 模型需保留后续扩展能力。

## 6. Design Considerations

### 6.1 Information Architecture

主界面包含：

- Workspace 列表。
- Workspace 下的 Session 列表。
- New Session 入口。
- 当前 Session 的 Terminal 区域。
- Session 状态和生命周期操作。

New Session 流程包含：

1. 输入 Session 名称。
2. 选择 Workspace。
3. 选择 CLI Profile。
4. 查看命令和目录预览。
5. 确认并启动。

### 6.2 Session 状态

MVP01 至少支持以下状态：

- `starting`
- `running`
- `stopped`
- `error`

配置记录和运行态必须分离。进程退出或服务重启后，不能把历史状态继续显示为 running。

### 6.3 安全交互

- 启动前必须显示最终命令和工作目录。
- Profile 参数使用数组保存，不通过 shell 拼接字符串执行。
- Workspace 路径必须经过目录存在性和可访问性校验。
- 删除运行中的 Session 必须二次确认。

## 7. Technical Considerations

- 首个运行形态为本地 Web 应用，运行在 localhost。
- 前端使用 React、TypeScript 和 xterm.js。
- 需要增加独立的本地 Session Manager，负责 PTY、进程生命周期和会话路由。
- Session Manager 可通过本地 WebSocket 或 IPC 与前端通信；具体通信协议在后续技术 SPEC 中确定。
- CLI 进程应使用参数化进程启动方式，例如可执行文件、参数数组和工作目录，不执行未经拆分的 shell 命令字符串。
- Workspace、Profile 和 Session 元数据存储在本地；MVP01 可使用 SQLite 或等价的本地持久化方案。
- Tauri 作为后续桌面壳复用 Session Manager，不作为 MVP01 Web 版本的前置阻塞项。
- 线上只读部署不能启动本地 CLI 进程。

## 8. Success Metrics

- 用户创建并启动一个 Session 的主要操作不超过 4 步。
- 用户可以在一个界面内同时管理至少 4 个 Session。
- 用户切换 Session 不需要打开新的终端窗口。
- 服务重启后 Workspace、Profile 和 Session 配置不丢失。
- Codex 和 Claude 均可完成基本交互、Ctrl+C、resize 和正常退出。
- 真实本地环境完成至少一次 Codex 和 Claude 启动验证。
- 核心单元测试、集成测试和构建验证通过。

## 9. Delivery Plan

建议按以下顺序拆分实现：

1. Local Session Manager 与 PTY 生命周期。
2. Workspace、Profile、Session 数据模型和持久化。
3. 前端与 Session Manager 的实时通信。
4. xterm.js Terminal UI。
5. Session 列表、创建、停止、恢复和删除。
6. 启动确认、错误处理和安全校验。
7. Codex、Claude 真实环境验证。
8. 后续 Tauri 桌面包装。

## 10. Assumptions

- MVP01 面向单用户、本机使用。
- 首要验证环境为 macOS。
- 用户已经在 PATH 中安装 Codex CLI 和 Claude CLI。
- Session 配置保存在本机，不上传云端。
- CLI 进程退出后由用户手动恢复，不自动重启。
- 至少以 4 个并发 Session 作为验收基线。
- 本 PRD 不覆盖 `cli-gui/doc/cli-gui.md` 原始草案。

## 11. Open Questions

- 本地 Session Manager 在 Web 版本中最终采用独立 Node 进程、Next.js 自定义服务器，还是其他本地宿主方式。
- MVP01 的首选持久化实现是 SQLite 还是本地 JSON 文件。
- 是否需要在首个版本加入 Terminal 输出搜索和 WebGL 加速。
- 是否需要将 Session 输出日志持久化，以便恢复后查看历史输出。
