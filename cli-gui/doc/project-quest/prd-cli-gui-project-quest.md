# PRD: CLI GUI 项目入口与 New Quest 创建流（Project Entry & Quest Creation）

> Derived from: `cli-gui/doc/mvp01/prd-cli-gui.md`（MVP01）+ `cli-gui/doc/workbench/prd-cli-gui-workbench.md`（三栏工作台）+ Qoder / Codex app 交互参考截图
> Generated: 2026-07-26 | Status: Draft for review
> Companion SPEC: `cli-gui/doc/project-quest/spec-cli-gui-project-quest.md`
> Companion Issues: `cli-gui/doc/project-quest/issues-cli-gui-project-quest.md`

## 1. Introduction / Overview

当前 CLI GUI 已交付 Qoder 风格三栏壳、会话生命周期、transcript、capability 驱动 composer 等能力，但「项目（Project）」还只是一个扁平的本地路径列表（`Workspace { id, name, path }`）：

- 侧边栏只有一个单动作 Open Folder 按钮，没有区分「导入已有文件夹 / 创建受管 workspace / 连接 SSH 远程项目」三类入口。
- 左侧 Quests 虽然支持按 project 分组显示，但项目组头没有任何管理动作（在该项目下新建 Quest、重命名、移除、折叠、连接状态）。
- New Quest 点击后走 `NewSessionDialog` 表单弹窗；Quest Home 的 Start in 三个 chip（项目 / 环境 / 分支）是假下拉，点击只是跳转到弹窗或 Settings。
- Composer 的语音输入按钮只切换本地状态、润色/压缩按钮只弹 toast，均无真实能力。
- 会话运行形态只有交互式 CLI 终端：composer 发送消息 = 把文本写入 CLI 的 PTY stdin，assistant 输出是原始终端字节流（`pty_output`），没有「选择模型、直接对话」的内置对话形态。

本 PRD 定义三块新能力，使 CLI GUI 的项目管理与会话创建、对话体验对齐 Codex app / Qoder：

- **Feature A — 项目入口与会话分组**：三类项目入口下拉（Open Folder / Set Up Workspace / Connect SSH）、项目成为一级组织实体、左侧会话列表按项目分组管理。
- **Feature B — New Quest 创建流**：New Quest 路由到中间 Quest Home 创建视图，通过真实的项目 / 环境（Local·SSH）/ 分支下拉与增强 composer（模型、语音输入、润色）完成一次提交即创建并启动会话。
- **Feature C — 内置对话（Built-in Chat）**：会话默认以原生聊天形态运行——每条用户消息经所选 CLI 的 headless 非交互模式逐轮执行，assistant 回复渲染为结构化消息（Markdown、工具活动），会话内可切换模型；交互式终端保留为兜底。

实现深度决策（已确认）：

| 能力 | 深度 |
|------|------|
| SSH | 真连接：注册远程主机 + 连接测试 + 在远端目录运行 CLI 会话（`ssh -t` PTY） |
| 语音输入 | Web Speech API 真听写（本地浏览器能力，不上传音频到自建服务） |
| 润色 / 压缩 | 真实现：调用所选 CLI profile 的一次性非交互模式改写 prompt |
| 内置对话 | CLI headless 逐轮驱动（如 `codex exec --json`、`claude -p --output-format stream-json`），不做 provider API 直连 |
| 终端去留 | 内置对话为默认会话形态；交互式终端保留为兜底（terminal 型会话 + chat 会话的只读原始输出回放） |

## 2. Goals

- 用户可以从侧边栏一个下拉入口完成三类项目接入：导入本地文件夹、创建受管 workspace、连接 SSH 远程项目。
- 项目成为一级组织实体，具有类型（`local-folder` / `managed-workspace` / `ssh-remote`）、状态与管理动作。
- 左侧 Quests 按项目分组，项目组头支持「在此项目新建 Quest」「重命名」「移除」「折叠/展开」，SSH 项目显示连接状态。
- New Quest 进入中间 Quest Home 创建视图，一次提交完成「选项目 → 选环境 → 选分支 → 配置 CLI/模型 → 输入（可语音/润色）→ 创建并启动会话 → 发送首条 prompt → 进入 ChatView」。
- 会话默认以内置对话形态运行：用户在对话中选择模型并直接沟通，assistant 回复呈现为结构化消息（Markdown、工具活动）而非终端字节流；不需要用户面对 CLI 界面。
- SSH 项目的会话在远端目录中运行所选 CLI，交互体验（PTY、Ctrl+C、resize、transcript）与本地一致。
- 语音输入与润色成为可用的生产能力，而非占位按钮。
- 所有用户可见流程覆盖 empty / loading / success / failure 四态；EN/ZH 同批交付；readonly 部署禁用全部写操作。

## 3. User Stories

### US-A1: 项目入口三项下拉

**Description:** As a user, I want a single "add project" dropdown with Open Folder, Set Up Workspace, and Connect SSH so that I can bring any kind of project into the workspace from one place.

**Acceptance Criteria:**
- [ ] 侧边栏 Quests 区头部的添加入口是一个下拉菜单，包含 Open Folder、Set Up Workspace、Connect SSH 三项（参照 Qoder 截图顺序与图标语义）。
- [ ] 菜单键盘可达（Enter/Space 打开、方向键导航、Escape 关闭并归还焦点）。
- [ ] readonly 模式下三项均禁用并有可理解的解释。
- [ ] 三项分别打开对应流程（US-A2 / US-A3 / US-A4）。
- [ ] Verify in browser using dev-browser skill。

### US-A2: Open Folder 导入本地文件夹

**Description:** As a user, I want to import an existing local folder so that its sessions are grouped under that project.

**Acceptance Criteria:**
- [ ] 复用现有 loopback 目录选择器（`PickWorkspaceRequest` 流程）打开系统文件夹选择框。
- [ ] 取消选择不产生任何项目。
- [ ] 选择成功后项目以 `local-folder` 类型注册，出现在左侧项目分组中。
- [ ] 重复 canonical 路径不重复注册，聚焦已有项目并提示。
- [ ] 原生选择器不可用时保留手动绝对路径输入回退。
- [ ] Verify in browser using dev-browser skill。

### US-A3: Set Up Workspace 创建受管 workspace

**Description:** As a user, I want to set up a managed workspace so that I can start a project from an empty directory or a cloned repository without leaving the app.

**Acceptance Criteria:**
- [ ] 对话框包含：workspace 名称 + 来源三选一——「纳管已有目录」「在指定父目录下新建目录」「git clone 远程仓库 URL」。
- [ ] 新建目录：校验父目录存在可写、目标目录不存在；创建成功后注册为 `managed-workspace`。
- [ ] git clone：校验 URL 形态（https/ssh git URL），clone 过程显示进行中状态，失败展示 stderr 摘要且不残留半成品目录注册。
- [ ] 纳管已有目录：校验目录存在，注册为 `managed-workspace`。
- [ ] 名称为空或空白拒绝提交；重复 canonical 路径拒绝并提示。
- [ ] 全流程覆盖 loading / success / failure 状态；失败可重试。
- [ ] Verify in browser using dev-browser skill。

### US-A4: Connect SSH 注册远程项目

**Description:** As a user, I want to register an SSH remote project so that I can run CLI sessions inside a remote directory.

**Acceptance Criteria:**
- [ ] 对话框字段：显示名称、host、port（默认 22）、user、认证方式（identity file / ssh-agent 二选一）、identity file 路径（选 identity file 时必填）、远端项目目录绝对路径。
- [ ] 不提供密码输入框；不以任何形式存储 SSH 密码。
- [ ] 提交前提供「Test Connection」动作：验证可达性、认证、远端目录存在且为目录；三类失败分别给出 `SSH_UNREACHABLE` / `SSH_AUTH_FAILED` / `SSH_REMOTE_PATH_INVALID` 对应的可理解文案。
- [ ] 首次连接遇到未知 host key 时展示指纹并要求用户显式确认（`SSH_HOST_KEY_REJECTED` 语义），不静默接受。
- [ ] 连接测试通过后注册为 `ssh-remote` 项目并出现在项目分组中。
- [ ] Verify in browser using dev-browser skill（可用 mock/本机 sshd fixture）。

### US-A5: 按项目分组的会话管理

**Description:** As a user, I want the left session list grouped by project with per-project actions so that I can manage each project's quests in place.

**Acceptance Criteria:**
- [ ] Project 分组模式下，每个项目渲染组头：类型图标（local-folder / managed-workspace / ssh-remote 三态区分）、项目名、组级「+」（在此项目新建 Quest）与「…」菜单。
- [ ] 组级「…」菜单包含：New Quest here、Rename project、Remove project、Collapse/Expand。
- [ ] Remove project：仍有会话引用时需确认，说明将同时删除（或先要求处理）其下会话；不删除磁盘文件。
- [ ] 组头可折叠/展开，折叠状态持久化并在刷新后保留。
- [ ] SSH 项目组头显示连接状态点（unknown / reachable / unreachable），可手动重新测试。
- [ ] 无任何项目时展示引导空态，引导指向三项入口下拉。
- [ ] 本地项目目录失效（被移动/删除）时组头显示失效标记而非静默出错。
- [ ] Verify in browser using dev-browser skill。

### US-B1: New Quest 路由到创建视图

**Description:** As a user, I want New Quest to open the center Quest Home creation view instead of a form dialog so that creating a quest feels like starting a conversation.

**Acceptance Criteria:**
- [ ] 点击 New Quest（按钮或 ⌘N）切换中间视图到 Quest Home 创建态，不再弹出 `NewSessionDialog`。
- [ ] Quest Home 预选项目：优先当前活跃会话的项目，否则最近使用项目，否则空态提示先接入项目。
- [ ] 项目组头/组级「+」进入时预选对应项目。
- [ ] `NewSessionDialog` 保留为高级入口（完整表单），不再是主路径。
- [ ] Verify in browser using dev-browser skill。

### US-B2: Start in 三个真实下拉

**Description:** As a user, I want real project, environment, and branch selectors on Quest Home so that I control where the quest runs before submitting.

**Acceptance Criteria:**
- [ ] 项目下拉列出全部三类项目，含类型图标；选择后环境与分支联动刷新。
- [ ] 环境下拉：`local-folder` / `managed-workspace` 项目显示 Local；`ssh-remote` 项目显示其 SSH host（形如 `user@host`）。环境与项目类型不匹配的组合不可选。
- [ ] 分支下拉：git 项目列出本地分支并标记当前分支；SSH 项目通过远端 git 列分支；加载中显示 loading；非 git 项目显示中性「No git repository」态且不阻塞提交。
- [ ] 分支列举失败（`BRANCH_LIST_FAILED`）显示失败态与重试，不阻塞使用默认分支提交。
- [ ] 选择的项目 / 分支作为会话启动配置的一部分持久化。
- [ ] Verify in browser using dev-browser skill。

### US-B3: Composer 配置（CLI/权限/模式/模型）

**Description:** As a user, I want CLI profile and capability controls in the creation composer so that the new session launches with my chosen configuration.

**Acceptance Criteria:**
- [ ] 创建视图 composer 可选 CLI Profile；权限 / 模式 / 模型选项来自所选 profile 的 capability adapter（复用现有机制）。
- [ ] 不支持的选择器禁用并解释；每个选择器含 `CLI default` 选项。
- [ ] 所选配置随创建请求提交，成为会话 `launchConfig`。
- [ ] Verify in browser using dev-browser skill。

### US-B4: 语音输入（真听写）

**Description:** As a user, I want to dictate my prompt so that I can input long task descriptions without typing.

**Acceptance Criteria:**
- [ ] 麦克风按钮启动 Web Speech API（`SpeechRecognition` / `webkitSpeechRecognition`）听写；再次点击停止。
- [ ] 听写中按钮呈现录音态；interim 结果实时回填输入框，最终结果落定为文本。
- [ ] 识别语言跟随当前 i18n 语言（en → `en-US`，zh → `zh-CN`）。
- [ ] 浏览器不支持时按钮给出降级提示；麦克风权限被拒绝时给出可理解错误与恢复指引。
- [ ] 听写不上传音频到应用自建服务器。
- [ ] Verify in browser using dev-browser skill（不支持环境验证降级文案）。

### US-B5: 润色 / 压缩（真实现）

**Description:** As a user, I want one-click prompt polish and compress so that my rough input becomes a well-structured prompt before submission.

**Acceptance Criteria:**
- [ ] 润色 / 压缩按钮将当前输入发送到本地服务的 enhance 端点，由所选 CLI profile 以一次性非交互模式执行改写。
- [ ] 处理中输入框锁定并显示 loading；完成后替换输入内容并保留撤销（一步恢复原文）。
- [ ] 失败（超时、CLI 不可用、输出为空）保留原文并显示失败原因；可重试。
- [ ] 所选 profile 不支持一次性模式时按钮禁用并解释（`ENHANCE_UNAVAILABLE`）。
- [ ] 空输入时按钮禁用。
- [ ] Verify in browser using dev-browser skill。

### US-B6: 一次提交创建并启动会话

**Description:** As a user, I want submitting the creation composer to create, start, and enter the session so that starting work is a single action.

**Acceptance Criteria:**
- [ ] 提交后：由 prompt 首行派生会话名（可后续重命名）→ 创建会话（绑定项目、profile、launchConfig、branch、交互模式）→ 按模式启动（chat：首条 prompt 直接作为第一轮执行；terminal：启动 PTY 后写入首条 prompt）→ 中间视图切换到该会话 ChatView。
- [ ] 指定了分支且与当前分支不同时，启动前在项目目录执行 checkout；checkout 失败则会话不启动并展示失败原因。
- [ ] SSH 项目提交前先做连接预检，失败展示对应错误且不创建半启动会话。
- [ ] 启动失败（CLI 不存在等）会话保留为 error 态，prompt 内容不丢失（保留在 composer 或已入 transcript）。
- [ ] 提交过程中防重复提交；成功后左侧对应项目组内出现新会话。
- [ ] Verify in browser using dev-browser skill。

### US-B7: SSH 会话运行

**Description:** As a user, I want SSH project sessions to run the CLI in the remote directory so that remote work feels identical to local work.

**Acceptance Criteria:**
- [ ] SSH 会话通过 `ssh -t` 参数数组启动，在远端项目目录运行所选 CLI。
- [ ] 键盘输入、Ctrl+C、ANSI、resize、transcript 持久化与本地会话一致。
- [ ] 连接中断时会话转入 error/stopped 态并可手动恢复（重建 SSH PTY）。
- [ ] 密钥路径、host 指纹等敏感信息不写入 transcript 与日志明文。
- [ ] 真实 SSH 冒烟验证脚本存在；环境不具备时如实 SKIP，不伪报通过。

### US-C1: 内置对话为默认会话形态

**Description:** As a user, I want a new quest to open a native chat conversation instead of a CLI terminal so that I can talk to the model directly.

**Acceptance Criteria:**
- [ ] New Quest 提交默认创建 `chat` 交互模式会话；ChatView 默认展示对话消息流，不出现原始 CLI 终端界面。
- [ ] 每条用户消息触发一轮所选 CLI 的 headless 非交互执行；会话无常驻交互式进程。
- [ ] 多轮上下文连续：后续消息经 CLI 原生会话恢复机制（resume/continue 标志）携带上下文，不丢失历史。
- [ ] 轮次执行中展示 assistant 进行中状态，可取消当前轮；取消后会话保持可用。
- [ ] 所选 CLI profile 不支持 headless 多轮时，创建时明确降级为 terminal 模式并解释原因。
- [ ] SSH 项目的 chat 会话轮次在远端目录执行，体验与本地一致。
- [ ] Verify in browser using dev-browser skill。

### US-C2: 结构化消息渲染

**Description:** As a user, I want assistant replies rendered as structured chat messages so that I can read results without parsing terminal noise.

**Acceptance Criteria:**
- [ ] user / assistant 消息气泡视觉区分；assistant 内容渲染 Markdown（复用现有 `markdown` transcript 事件渲染）。
- [ ] 工具调用 / 命令执行呈现为可折叠的活动条目（`tool_activity`），不混入正文。
- [ ] assistant 回复流式增量渲染，逐段可见而非整轮结束后一次性出现。
- [ ] 轮次失败在消息流中呈现错误条目，支持重试该轮（重发同一消息）。
- [ ] 历史消息持久化于现有 transcript 管线，刷新/重启后可完整回放。
- [ ] Verify in browser using dev-browser skill。

### US-C3: 会话内模型与配置切换

**Description:** As a user, I want to switch the model inside an ongoing conversation so that the next turn uses my chosen model.

**Acceptance Criteria:**
- [ ] 对话 composer 提供模型选择（来自 profile capability 的 models 列表），切换后下一轮生效（映射 CLI `--model` 参数）。
- [ ] 当前生效模型在 composer 可见；切换不中断历史，仅影响后续轮次。
- [ ] 模型选择随会话持久化，重新进入会话后保持。
- [ ] Verify in browser using dev-browser skill。

### US-C4: 终端保留为兜底

**Description:** As a user, I want the interactive terminal to remain available so that CLI-interactive scenarios (login, TUI approvals) are still possible.

**Acceptance Criteria:**
- [ ] terminal 型会话仍可创建（Quest Home 模式开关或 `NewSessionDialog` 高级入口），行为与现状一致。
- [ ] chat 会话的 Terminal tab 展示各轮 headless 执行的原始 CLI 输出（只读回放，供调试）。
- [ ] 轮次因需要交互（登录、审批）而失败时，错误条目给出可理解指引（如：先在终端型会话/本机完成登录后重试）。
- [ ] Verify in browser using dev-browser skill。

## 4. Functional Requirements

### 项目入口与项目实体
- FR-1: 系统必须在侧边栏提供包含 Open Folder、Set Up Workspace、Connect SSH 的项目入口下拉菜单。
- FR-2: 系统必须支持 `local-folder`、`managed-workspace`、`ssh-remote` 三类项目类型。
- FR-3: Open Folder 必须复用现有 loopback 目录选择器与手动路径回退。
- FR-4: Set Up Workspace 必须支持纳管已有目录、新建目录、git clone 三种来源。
- FR-5: git clone 失败必须清理注册状态且不残留半成品项目记录。
- FR-6: Connect SSH 必须采集 host、port、user、认证方式、identity file 路径（可选）、远端目录。
- FR-7: 系统必须提供 SSH 连接测试并区分不可达、认证失败、远端目录无效三类失败。
- FR-8: 系统必须在首次遇到未知 host key 时要求用户显式确认指纹。
- FR-9: 系统必须不存储 SSH 密码；仅支持 identity file 与 ssh-agent。
- FR-10: 系统必须按 canonical 路径（本地）或 host+remotePath（SSH）防止重复注册。

### 项目分组与管理
- FR-11: Project 分组必须按项目渲染组头，含类型图标与项目名。
- FR-12: 项目组头必须提供组级 New Quest 与管理菜单（Rename / Remove / Collapse）。
- FR-13: Remove project 在有会话引用时必须确认并说明后果；不得删除磁盘文件。
- FR-14: 项目折叠状态必须持久化。
- FR-15: SSH 项目组头必须显示连接状态并支持手动重测。
- FR-16: 本地项目路径失效时必须显示失效标记。
- FR-17: 无项目时必须显示指向入口下拉的引导空态。

### New Quest 创建流
- FR-18: New Quest 必须路由到 Quest Home 创建视图而非表单弹窗。
- FR-19: Quest Home 必须提供项目、环境、分支三个真实下拉。
- FR-20: 环境选项必须由所选项目类型决定（Local 或对应 SSH host）。
- FR-21: 分支下拉必须通过 allowlisted git 参数数组命令列举本地或远端分支。
- FR-22: 分支列举失败不得阻塞提交，必须允许按默认分支继续。
- FR-23: 创建 composer 必须支持 CLI profile 选择与 capability 驱动的权限/模式/模型选择。
- FR-24: 提交必须一次完成创建、启动、首条 prompt 发送与 ChatView 切换。
- FR-25: 提交必须防重复；启动失败必须保留用户输入。
- FR-26: 会话必须持久化所选分支（`launchConfig.branch`）。

### 语音与润色
- FR-27: 语音输入必须使用浏览器 Web Speech API，interim 结果实时回填。
- FR-28: 识别语言必须跟随 i18n 当前语言。
- FR-29: 不支持或权限拒绝必须给出降级/恢复提示。
- FR-30: 润色/压缩必须经本地服务端点调用所选 CLI profile 的一次性非交互模式。
- FR-31: 润色处理中必须锁定输入并可撤销结果；失败必须保留原文。
- FR-32: profile 不支持一次性模式时润色入口必须禁用并解释。

### SSH 运行时与通用
- FR-33: SSH 会话必须以参数数组方式经 `ssh -t` 启动，不得拼接 shell 命令字符串。
- FR-34: SSH 会话必须支持与本地会话一致的 PTY 交互与 transcript 持久化。
- FR-35: SSH 敏感信息（密钥路径、指纹）不得写入 transcript 或日志明文。
- FR-36: readonly 模式必须禁用项目创建、SSH 连接、会话创建、润色等全部写操作。
- FR-37: 所有新增用户可见流程必须覆盖 empty、loading、success、failure 四态。
- FR-38: 所有新增文案必须经 i18n 提供 EN 与 ZH。
- FR-39: 持久化 schema 变更必须版本化并提供无损迁移。

### 内置对话
- FR-40: 会话必须支持 `chat` 与 `terminal` 两种交互模式；New Quest 默认创建 `chat` 会话。
- FR-41: chat 会话的每条用户消息必须经所选 CLI profile 的 headless 非交互模式执行一轮；禁止 provider API 直连。
- FR-42: chat 会话必须通过 CLI 原生恢复/继续机制保持多轮上下文。
- FR-43: assistant 回复必须以结构化 transcript 事件（`markdown` / `tool_activity`）持久化并流式渲染；无法识别的事件必须降级为可读文本而非丢弃。
- FR-44: chat composer 必须支持会话内模型切换，下一轮生效并随会话持久化。
- FR-45: 进行中的轮次必须可取消；同一 chat 会话同时只允许一个进行中轮次。
- FR-46: profile 不支持 headless 多轮时必须降级为 terminal 模式并向用户解释。
- FR-47: chat 会话的 Terminal tab 必须提供各轮原始 CLI 输出的只读回放。

## 5. Non-Goals / Out of Scope

- SSH 端口转发、隧道、SFTP 文件浏览/编辑、本地与远端文件同步。
- SSH 密码认证与密码存储（含 keychain 集成）。
- 远端文件树 / Preview / Diff / Git 右栏检查（右栏能力本期仍仅覆盖本地项目；SSH 项目右栏显示中性不可用态）。
- 多用户、协作、云端项目同步。
- 语音输入的自建 ASR 服务或第三方 ASR API 集成（仅浏览器内建能力）。
- 润色的独立模型路由 / provider API 直连（仅经已配置 CLI）。
- 内置对话的 provider API 直连（OpenAI/Anthropic API key 集成）——对话仍经已配置 CLI 的 headless 模式执行，登录态与凭据复用 CLI 自身配置。
- 自建 agent loop（工具调度、审批引擎、上下文管理）——沿用 CLI 自身的 agent 能力，本应用只做轮次编排与渲染。
- chat 会话内的结构化审批交互（CLI 请求权限时在气泡内批准）——本期以失败+指引兜底，后续迭代。
- Git 写操作扩展（分支 checkout 仅限会话启动前的受控切换，见 SPEC；不提供通用 Git 操作 UI）。
- `NewSessionDialog` 的移除（保留为高级入口）。

## 6. Design Considerations

### 6.1 信息架构

- 侧边栏 Quests 头部：`筛选/分组` 图标 + `项目入口下拉`（替换现有单一 folder IconButton）。
- 项目组头（参照截图二）：`[类型图标] 项目名 …… [+] [⋯]`，hover 显现动作，折叠箭头在最左。
- Quest Home（参照截图三）：标题 → `Start in [项目 ▾] [环境 ▾] [分支 ▾]` → composer（附件、Agent/模型选择、语音、润色、发送）→ 推荐任务。
- ChatView（chat 会话）：消息流（user 右对齐气泡 / assistant 左对齐 Markdown 块 + 可折叠工具活动）→ 底部 composer（模型切换、语音、润色）；顶部 tab 保留 Transcript / Terminal（只读回放）。

### 6.2 状态语义

- 项目连接状态（仅 SSH）：`unknown`（未测试）/ `reachable` / `unreachable`，独立于会话运行状态。
- 项目路径有效性（本地）：`valid` / `missing`，在 state 加载与会话启动前校验。
- 会话运行/组织状态沿用现有 `SessionRuntimeStatus` / `SessionOrganizationStatus`，不因项目类型改变。
- chat 会话轮次状态：`idle`（空闲可发送）/ `running`（轮次执行中，可取消）/ 轮次级 `failed`（错误条目 + 重试）；独立于会话组织状态。

### 6.3 安全交互

- SSH 表单不出现密码框；identity file 路径仅存路径不读内容入库。
- 首连指纹确认是显式对话框，列出算法与指纹串。
- 会话启动确认沿用现有启动预览（命令、参数、cwd；SSH 会话额外显示目标 host 与远端目录）。
- Remove project、删除会话等破坏性动作保持二次确认。

## 7. Technical Considerations

详见 SPEC。要点：

- `Workspace` 扩展 `kind` 与 `ssh` 字段，schema v2 → v3 迁移（既有记录默认 `local-folder`）；`Session` 新增 `interactionMode`（既有会话迁移为 `terminal`）与 chat 上下文快照（resume token、当前模型）。
- 服务端沿用 ports/adapters：新增 `SshRunner` 端口与 `POST /api/workspaces`、`POST /api/workspaces/:id/ssh-test`、`GET /api/workspaces/:id/branches`、`POST /api/prompt/enhance` 端点。
- SSH PTY 复用现有 `PtyRuntime.spawn`（command=`ssh`，args 数组）。
- 润色经 `ProfileAdapterRegistry` 扩展的一次性执行能力（如 `codex exec`、`claude -p`），带超时与输入/输出大小上限。
- 语音纯前端实现，不新增服务端点。
- 内置对话：服务端新增 chat 轮次执行器，经 `ProfileAdapterRegistry` 组装 headless argv（`codex exec --json` / `claude -p --output-format stream-json` + 原生 resume），解析 JSON 事件流写入现有 transcript 管线；SSH 项目的轮次经 `SshRunner` 流式执行。

## 8. Success Metrics

- 从空应用到接入任一类项目 ≤ 3 步（打开下拉 → 选择入口 → 完成表单）。
- 从 New Quest 到会话进入 ChatView ≤ 2 次显式确认（提交 + 可能的启动确认）。
- SSH fixture 环境下：连接测试、远端会话启动、Ctrl+C、resize、transcript 回放全部通过。
- 润色端点在配置了受支持 CLI 的环境中成功率 ≥ 95%（超时 30s 内）。
- schema v2 → v3 迁移 fixtures 零数据丢失。
- chat 会话中 assistant 回复 100% 以结构化消息呈现（正文不出现原始 ANSI 字节直渲）；本地轮次首段输出可见 ≤ 5s（不含模型思考时长的硬承诺，以事件到达即渲染为准）。
- 新增流程 EN/ZH 文案齐备；`npm test`、`npm run build`、`npm run test:e2e` 通过。

## 9. Assumptions

- 单用户、localhost 优先；macOS 为首要验证平台。
- 用户本机已有可用的 `ssh` 客户端与（SSH 场景）远端已安装所选 CLI。
- 远端 CLI 的登录态/凭据由用户在远端自行维护，本应用不代管。
- Web Speech API 的可用性依赖浏览器（Chrome 优先验证）；不可用时降级为提示。
- 润色质量依赖所配置 CLI 的模型能力，本应用只负责传输与超时控制。
- 分支 checkout 仅发生在会话启动前且目标为干净可切换状态；脏工作区导致的 checkout 失败如实报错。

## 10. Open Questions

- SSH host key 校验策略：是否提供「仅本次接受」与「永久信任」两级？（SPEC 暂定永久信任写入应用自管 known_hosts）
- 润色的默认 prompt 模板是否需要用户可编辑（Settings 项）？本期先内置固定模板。
- SSH 项目是否需要支持 per-project 默认 CLI profile？本期沿用全局 profile 选择。
- 远端分支列举的缓存策略（每次打开下拉都请求 vs TTL 缓存）？SPEC 暂定 30s TTL。
- CLI 请求权限/审批时 chat UI 如何呈现？本期轮次失败 + 指引兜底，后续考虑结构化审批气泡（依赖 CLI 协议能力）。
- 既有 terminal 会话是否提供「转为 chat 会话」迁移动作？本期不做，两种模式创建后不可互转。

## 11. Recommended Delivery Sequence

1. Schema v3（项目 kind + ssh 字段 + launchConfig.branch + 会话 interactionMode/chat 快照）与迁移。
2. 项目创建统一 API 与三类创建流（含 clone、SSH 测试）。
3. SSH 运行时（PTY over ssh、预检、错误分类）。
4. 侧边栏三项下拉与项目分组管理（组头动作、折叠持久化、连接状态）。
5. Quest Home 真下拉（项目/环境/分支）与预选逻辑。
6. 一次提交创建流（create → start → send → ChatView）。
7. 内置对话运行时（chat 模式逐轮执行、结构化流式渲染、模型切换、取消与重试，并将 New Quest 默认切为 chat）。
8. 语音输入与润色/压缩真实现。
9. E2E、SSH 冒烟、迁移 fixtures、i18n/无障碍收尾。
