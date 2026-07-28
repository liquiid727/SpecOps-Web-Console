# Issues: CLI-GUI 项目入口与 New Quest 创建流

> 从 SPEC `cli-gui/doc/project-quest/spec-cli-gui-project-quest.md` 拆解
> PRD: `cli-gui/doc/project-quest/prd-cli-gui-project-quest.md`
> Generated: 2026-07-26

---

## Issue #1: Schema v3 与迁移（项目 kind / ssh / branch）

**Labels**: `infrastructure`, `persistence`, `high-priority`

### Description

将持久化 schema 升级到 v3：`Workspace` 增加 `kind`/`ssh`/`origin`，`SessionLaunchConfig` 增加 `branch`，并提供 v2→v3 无损迁移。

### Acceptance Criteria

- [ ] `shared/state.ts`：`CURRENT_SCHEMA_VERSION = 3`、`WorkspaceKind`、`WorkspaceSshConfig`、`Workspace.kind/ssh/origin`、`SessionLaunchConfig.branch`
- [ ] `shared/state.ts`：`SessionInteractionMode`、`SessionChatState`、`Session.interactionMode/chat`（内置对话，见 SPEC §3.1）
- [ ] `server/store.ts`：迁移链追加 `migrateV2ToV3`（workspace 默认 `local-folder`、branch 默认 `null`、存量会话 `interactionMode` 默认 `"terminal"`）
- [ ] 不变式校验：`ssh-remote` ⟺ `ssh` 完整且 `path === ssh.remotePath`；`chat` 字段仅 `interactionMode="chat"` 时存在
- [ ] 迁移 fixtures：v2 满数据 / v2 空数据 / 非法 kind 拒绝，零数据丢失
- [ ] 客户端 `StateResponse` 消费方类型同步更新，`npm run test` 与 `npm run build` 通过

### Technical Notes

- SPEC §3.1–§3.2；迁移失败沿用可恢复错误路径，不覆盖源文件

---

## Issue #2: 统一项目创建 API（三类）

**Labels**: `backend`, `api`, `high-priority`

### Description

新增 `POST /api/workspaces` 支持 `local-folder` / `managed-workspace`（纳管/新建目录/git clone）/ `ssh-remote` 三类创建，以及 `PATCH /api/workspaces/:id` 重命名。

### Acceptance Criteria

- [ ] `shared/api.ts`：`CreateWorkspaceRequest/Response` 与错误码 `WORKSPACE_CLONE_FAILED` / `WORKSPACE_CREATE_FAILED`
- [ ] new-directory：parent 可写 + target 不存在校验，mkdir 后注册
- [ ] git-clone：URL scheme 校验、参数数组 spawn、120s 超时、失败清理半成品目录且不落库
- [ ] 三类重复判定（local canonical / ssh `user@host:port+remotePath`）
- [ ] readonly 模式 403；现有 `POST /api/workspaces/pick` 落库补 `kind: "local-folder"`
- [ ] application 层单测覆盖成功、校验失败、clone 失败、重复、readonly

### Technical Notes

- SPEC §4.1–§4.2、§5.2；依赖 Issue #1

---

## Issue #3: SshRunner 与 SSH 连接测试

**Labels**: `backend`, `ssh`, `high-priority`

### Description

实现 `SshRunner` 端口与生产适配器（系统 `ssh` + 参数数组）、应用自管 known_hosts、指纹确认流、`ssh-test` 端点。

### Acceptance Criteria

- [ ] `server/ports.ts`：`SshRunner { available, exec, buildPtyCommand }`
- [ ] `server/ssh-runner.ts`：BatchMode/ConnectTimeout/StrictHostKeyChecking=yes/UserKnownHostsFile 基础参数；远端 argv single-quote 转义；`sh -lc` 包装
- [ ] `POST /api/workspaces/ssh-test` 与 `/:id/ssh-test`：`test -d` 探测，stderr 映射 `SSH_UNREACHABLE` / `SSH_AUTH_FAILED` / `SSH_REMOTE_PATH_INVALID`
- [ ] 指纹流：`SSH_HOST_KEY_REJECTED` 返回指纹 → `acceptFingerprint` 二次提交 → 校验一致后写 `data/ssh_known_hosts`；指纹变化不提供一键覆盖
- [ ] 日志脱敏：identityFilePath、指纹哈希化；不存储密码
- [ ] ssh-runner 单测（假 ssh 脚本）覆盖参数拼装与错误映射

### Technical Notes

- SPEC §5.1、§5.3、§7；依赖 Issue #1；与 Issue #5 可并行

---

## Issue #4: SSH 会话运行时

**Labels**: `backend`, `ssh`, `pty`, `high-priority`

### Description

SSH 项目的会话经 `ssh -t` 在远端目录运行所选 CLI，复用现有 PTY/WebSocket/transcript 管线；含启动预检与真实冒烟脚本。

### Acceptance Criteria

- [ ] `server/domain.ts`：`buildSessionSpawn` 本地/SSH 双路径（SSH 走 `SshRunner.buildPtyCommand`，env 透传 `TERM=xterm-256color`/`LANG`）
- [ ] SSH 会话启动前预检（15s 超时），失败返回对应 `SSH_*` 错误且不创建 PTY
- [ ] 键盘输入、Ctrl+C、ANSI、resize、transcript 持久化与本地一致（复用现有管线零改动验证）
- [ ] ssh 进程退出 → 会话 stopped/error；resume 重建 SSH PTY
- [ ] 启动确认预览展示目标 host 与远端目录
- [ ] `scripts/smoke-ssh.ts`：环境变量缺失如实 SKIP；具备时跑 test → branches → 远端会话 → transcript 断言

### Technical Notes

- SPEC §5.5、§9.3、§11.2；依赖 Issue #3

---

## Issue #5: 侧边栏三项下拉与项目分组管理

**Labels**: `ui`, `component`, `high-priority`

### Description

侧边栏入口改为三项下拉，新增 `SetUpWorkspaceDialog` / `ConnectSshDialog`，项目组头升级为可管理的 `ProjectGroupHeader`。

### Acceptance Criteria

- [ ] `Sidebar.tsx` 头部 folder IconButton → `AddProjectMenu`（Open Folder / Set Up Workspace / Connect SSH，复用 `ui/Menu`，键盘可达，readonly 禁用）
- [ ] `SetUpWorkspaceDialog.tsx`：名称 + 三来源表单、即时校验、loading/失败态、clone 进行中态
- [ ] `ConnectSshDialog.tsx`：表单（无密码框）、Test Connection、指纹确认对话框、三类失败文案
- [ ] `ProjectGroupHeader.tsx`：类型图标三态、组级 +（New Quest here）、⋯ 菜单（Rename / Remove / Collapse）、SSH 状态点、本地路径失效标记
- [ ] Remove project：有会话时确认并说明级联；不删磁盘文件
- [ ] 折叠状态持久化到 `preferences.collapsedProjectIds`；空项目渲染「No Quest yet」组
- [ ] 无项目引导空态指向入口下拉；全部文案 EN+ZH；组件单测齐备

### Technical Notes

- SPEC §2.2、§5.10；对照截图一/二；依赖 Issue #2（API），与 #3/#4 并行

---

## Issue #6: Quest Home 真下拉与一次提交创建流

**Labels**: `ui`, `feature`, `high-priority`

### Description

New Quest 路由到 Quest Home 创建视图；项目/环境/分支真实下拉（含 branches API）；提交完成 create → start → send → ChatView。

### Acceptance Criteria

- [ ] `GET /api/workspaces/:id/branches`：本地/SSH 双路径、30s TTL 缓存、非 git 中性态、`BRANCH_LIST_FAILED`
- [ ] 分支名校验与启动前受控 checkout（唯一 Git 写豁免），失败 `BRANCH_CHECKOUT_FAILED` 且会话不启动
- [ ] `StartInSelectors.tsx`：项目（三类图标）/ 环境（kind 派生，Local 或 `user@host`）/ 分支（loading/失败/重试/中性态）联动
- [ ] New Quest（⌘N / 组级 +）→ quest-home 视图 + 预选规则（组级传入 > 活跃会话 > lastOpenedAt > 空态）；不再默认弹 `NewSessionDialog`
- [ ] `App.tsx` `submitQuest` 编排：派生会话名、防重复、失败保留 prompt、SSH 预检、成功切 ChatView 且左侧入组；提交按 `interactionMode` 分流（chat 为默认，不预启 PTY，首条 prompt 作为第一轮；运行时见 Issue #7）
- [ ] `launchConfig.branch` 随会话持久化；启动确认预览含 checkout 信息
- [ ] 组件与编排单测；`NewSessionDialog` 保留为高级入口

### Technical Notes

- SPEC §5.4、§5.9；对照截图三；依赖 Issue #2、#4（SSH 路径）、#5（入口）

---

## Issue #7: 内置对话运行时（chat 会话）

**Labels**: `backend`, `ui`, `chat`, `high-priority`

### Description

chat 会话不再直接把输入写入 PTY，而是每条消息跑一轮 headless CLI（`codex exec --json` / `claude -p --output-format stream-json` + 原生 resume），结构化渲染为对话气泡；支持会话内模型切换与取消本轮。终端会话行为不变。

### Acceptance Criteria

- [ ] `server/ports.ts`：`ChatTurnRunner` 端口；`server/chat-turns.ts`：轮次编排（单轮串行 409、stall 10min / hard 30min 超时、取消）
- [ ] `profile-adapters.ts`：`buildChatTurnArgv`（codex/claude 一次性模式 + resume + `--model`，参数数组）；generic 不支持 → 降级终端模式；`shared/capabilities.ts` 新增 `supportsChatMode`
- [ ] NDJSON → transcript 事件映射：助手文本流式 `markdown`、工具调用 `tool_activity`、非 JSON 行 `pty_output`、未知事件可读文本兜底；resumeToken 提取入 `Session.chat`
- [ ] `POST /api/sessions/:id/messages` 按 `interactionMode` 分流；新增 `POST /api/sessions/:id/turn/cancel`；错误码 `CHAT_UNSUPPORTED` / `CHAT_TURN_IN_PROGRESS` / `CHAT_TURN_FAILED` / `CHAT_TURN_TIMEOUT`
- [ ] SSH chat 轮次经 `SshRunner` 流式 exec（同样 argv 转义）
- [ ] `ChatMessageList.tsx`：用户/助手气泡、Markdown 渲染、流式增量、tool_activity 折叠、失败轮重试；chat 会话 ChatView 默认展示消息流，Terminal tab 为只读原始输出回放，顶部动作显示「取消本轮」而非 Resume/Stop
- [ ] 模型切换：composer 选择 → 下一轮生效并持久化 `chat.lastModel`；优先级 request > lastModel > launchConfig.model > CLI 默认
- [ ] runtimeStatus 映射：轮次运行 = `running`，空闲 = `stopped`；readonly 禁用；全部文案 EN+ZH
- [ ] 单测：chat-turns（假 NDJSON CLI 脚本：正常/错误/超时/取消/resumeToken）、ChatMessageList（事件 fixture）

### Technical Notes

- SPEC §3.1、§4.1、§4.3、§5.6、§6；依赖 Issue #1（schema）、#6（提交入口）；与 #8 可并行

---

## Issue #8: 语音输入与润色/压缩真实现

**Labels**: `ui`, `backend`, `composer`, `medium-priority`

### Description

composer 麦克风接 Web Speech API 真听写；润色/压缩经 `POST /api/prompt/enhance` 调用所选 CLI 一次性模式。

### Acceptance Criteria

- [ ] `useSpeechInput.ts`：supported 探测、start/stop、interim 灰显回填、final 落定、lang 跟随 i18n（en-US/zh-CN）、权限拒绝恢复指引
- [ ] `PromptComposer.tsx`：录音态样式、听写中手动编辑丢弃 interim；不支持时保留降级 toast
- [ ] `shared/capabilities.ts`：`supportsPromptEnhancement`（codex/claude true、generic false）
- [ ] `POST /api/prompt/enhance`：32KiB 入 / 64KiB 出上限、30s 超时、locale 分模板、错误码 `ENHANCE_UNAVAILABLE/FAILED/TIMEOUT`
- [ ] `profile-adapters.ts`：`codex exec` / `claude -p` argv 组装（参数数组）
- [ ] composer：处理中锁定输入、成功可一步撤销、失败保留原文可重试、空输入禁用、profile 不支持禁用并解释
- [ ] 单测：hook（SpeechRecognition stub）、adapter（假 CLI 脚本）、端点（超时/空输出/readonly）

### Technical Notes

- SPEC §5.7–§5.8；依赖 Issue #6（composer 所在创建流）；与 #7 可并行

---

## Issue #9: E2E、冒烟与收尾验证

**Labels**: `testing`, `i18n`, `a11y`, `medium-priority`

### Description

Playwright E2E 覆盖全流程，i18n/无障碍/readonly 审查，文档同步。

### Acceptance Criteria

- [ ] `e2e/project-quest.spec.ts`：SPEC §9.2 七场景（三类项目创建、指纹确认、New Quest 全流程、润色撤销、readonly 禁用、内置对话流式/切模/取消/重试）
- [ ] fixture：临时目录、双分支 git repo、mock SshRunner、假 NDJSON chat adapter；不 mutate 源仓库
- [ ] Git 写命令审计测试：allowlist 外零写命令（checkout 豁免仅单形态）
- [ ] 新增文案 EN/ZH 齐备；菜单/对话框/下拉键盘可达与焦点恢复
- [ ] `npm run ui:check`、`npm run test`、`npm run build`、`npm run test:e2e` 全通过
- [ ] `doc/design/cli-gui-design.md` 与 `DESIGN.md`（如有视觉契约变化）同步；本 issues 文档状态回填

### Technical Notes

- SPEC §9；依赖 Issue #1–#8

---

## Issue 映射关系

```
#1 (Schema v3)
└── #2 (项目创建 API)
    ├── #3 (SshRunner + ssh-test) ── #4 (SSH 运行时)
    ├── #5 (侧边栏下拉 + 分组管理)      │
    └──────────┬──────────────────────┘
               #6 (Quest Home + 提交流)
               ├── #7 (内置对话运行时)
               └── #8 (语音 + 润色)
                   └── #9 (E2E + 收尾，依赖 #7/#8)
```

## 优先级汇总

| Issue | 标题 | Priority | Estimate |
|-------|------|----------|----------|
| #1 | Schema v3 与迁移 | High | 1-2 days |
| #2 | 统一项目创建 API | High | 2-3 days |
| #3 | SshRunner 与连接测试 | High | 2-3 days |
| #4 | SSH 会话运行时 | High | 2-3 days |
| #5 | 侧边栏下拉与分组管理 | High | 3-4 days |
| #6 | Quest Home 与提交流 | High | 3-4 days |
| #7 | 内置对话运行时 | High | 3-4 days |
| #8 | 语音与润色 | Medium | 2-3 days |
| #9 | E2E 与收尾 | Medium | 2-3 days |
