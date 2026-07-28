# SPEC: Agent Console MVP01 — 前端（frontend-spec）

> 派生自：`Agent_Console_MVP01_PRD.md` v0.3 §5、§4.2.3、§4.2.5
> 上游：[api-spec.md](./api-spec.md)、[event-protocol-spec.md](./event-protocol-spec.md)、[domain-spec.md](./domain-spec.md)
> 现状：三栏壳组件已存在（`TitleBar` / `Sidebar` / `MainArea` / `RightPanel` /
> `QuestHome` / `ChatView` / `PromptComposer` / `TranscriptPanel`），i18n（EN/ZH）、
> 主题、键盘可达基线已交付——本 SPEC 以 MODIFY 为主

## 1. Summary

前端增量 = ChatView 按事件协议全量 kind 结构化渲染（含轮次状态与
审批气泡）+ Composer 的 chat 轮次交互（取消/重试/模型即时切换）+
创建流的 interactionMode 选择与降级说明 + Terminal 备用视图接入
chat 会话。三栏壳、组织管理、拖拽排序、Quest Home 骨架均已存在，
按 B 段清单补齐细节。

---

## 2. 视图与路由（MainArea 双舞台）

| 视图 | 状态 | MVP01 动作 |
|---|---|---|
| Quest Home | 已存在骨架 | B 段：`Start in [项目 ▾] [环境(Profile) ▾] [分支 ▾]` + composer 一次提交创建流（提交 = 创建 chat 会话 + start-and-send 首轮） |
| Chat View | 已存在骨架 | A 段核心：结构化消息流（§3）+ 常驻 composer（§5） |
| Terminal tab | 已存在（terminal 会话） | B 段：chat 会话的 Terminal tab = 各轮 `pty_output` 只读回放；terminal 会话保持现有 xterm.js 全保真；Transcript/Terminal 切换不新建 PTY（现状保持） |

- 会话点选 → Chat View（chat 模式）或 Terminal（terminal 模式）；
  `interactionMode` 来自 Session 实体，前端不自行推断。
- A 段布局最简：左侧最简会话列表 + 中栏 Chat View + composer 即可；
  右栏 Runtime Monitor、折叠 drawer、⌘B/⌘J/⌘N 快捷键在 B 段验收
  （多数已实现，B 段做验收核对而非新建）。

## 3. Chat View 消息流（A 段核心，MODIFY `ChatView.tsx`）

### 3.1 kind → 渲染映射（消费规范 kind，见 event-protocol-spec §3）

| kind | 渲染 |
|---|---|
| `user_message` | 右对齐气泡，纯文本（不渲染 Markdown），时间戳 |
| `assistant_message` | 左对齐 Markdown 块（§4），流式逐段追加 |
| `tool_activity` | 可折叠条目（默认折叠）：`metadata.tool` 摘要 + 展开 raw；不混入正文 |
| `file_change` | 独立条目：`metadata.path` + 变更标记 |
| `pty_output` | 中性等宽条目（ANSI 转义剥除后展示，原文进 Terminal tab）；连续 pty_output 合并为单条可展开块 |
| `lifecycle` | 居中系统条目（started/stopped/turn-completed 等） |
| `error` | 错误条目：message + `metadata.code`；轮次失败附「重试」按钮（§5.2） |
| `approval_request` | 审批气泡（B 段 §5.4）；A 段渲染为中性系统条目 |
| `approval_response` | 决定条目（allow/deny/timeout） |
| `retention_marker` | 截断提示条（现状保持） |
| 未知 kind | 中性条目：kind 名 + raw 摘要（前向兼容，不报错） |

### 3.2 流式与滚动

- 事件经 WS `transcript-event` 逐条到达即渲染，**不等轮次结束**
  （PRD 验收：本地首段输出可见 ≤ 5s）。
- 同一 `turnId` 的连续 `assistant_message` 合并为同一气泡追加段落；
  `turn-status` 帧驱动进行中 spinner（api-spec §4.2，仅提示不承载内容）。
- 自动滚底：贴底时跟随；用户上滚后停止跟随并显示「回到最新」；
  进入视图默认滚底。
- 历史加载：进入会话先 `GET transcript`（游标向后翻页），再 WS
  `afterSequence` 接续；按事件 `id` 去重（现状保持）。

### 3.3 四态（每个可见流程必备）

| 态 | 表现 |
|---|---|
| loading | 历史回放骨架屏 |
| empty | 「暂无消息」+ composer 引导 |
| reconnecting | 顶部横幅「重连中…」，恢复后自动接续（afterSequence） |
| failure | 截断态（`recording-warning`）横幅、加载失败重试按钮 |

- 中断轮次呈现（runtime-orchestrator-spec §6）：会话历史末尾存在
  `turnId` 无终态事件 → 该轮标记「已中断」，提供重试。

## 4. Markdown 渲染与 sanitize 策略（A 段，安全基线）

- 渲染器：现有 react-markdown + remark-gfm 保持；支持 GFM 全集
  （标题/列表/任务列表/表格/引用/围栏代码块）。
- sanitize 策略（新增测试锁定）：
  - **禁用原始 HTML**（不注入 rehype-raw；`skipHtml` 或等效配置），
    HTML 以转义文本呈现。
  - 链接协议白名单：`http:`/`https:`/`mailto:`；其余（`javascript:`
    `data:` `file:` 等）渲染为纯文本。外链 `rel="noopener noreferrer"`。
  - 图片不加载远程资源（MVP01 渲染为链接文本，避免 tracking/SSRF）。
- 代码块：保留空白、语言标注、复制按钮；复制内容为 raw 源码。
- 「查看原文」入口：每个 assistant 气泡可查看事件 raw（排障对照）。

## 5. PromptComposer（MODIFY）

### 5.1 输入与提交（现状核对 + chat 接线）

- 多行输入、Enter 提交、Shift+Enter 换行（UI 内说明）、空白不可提交
  ——均已存在，保持。
- 提交 → `POST messages`（`clientMessageId` 由前端生成 UUID）；
  chat 会话轮次进行中时输入框可编辑但提交禁用，提示「等待当前轮完成」
  （对应 `TURN_IN_PROGRESS`，前端先行禁用 + 服务端兜底）。
- stopped 会话：composer 呈现 start-and-send 流——提交前弹启动确认
  （命令预览 + cwd，现有确认组件复用），确认后带
  `startIfStopped + confirmedStart` 提交。

### 5.2 取消与重试（A 段）

- 进行中轮次：提交按钮切换为「停止」→ `POST turns/cancel { turnId }`；
  取消后 composer 立即可用（会话保持 running）。
- 失败/中断轮次的错误条目带「重试」：以原 prompt + **新
  clientMessageId** 重新提交（api-spec §2.2）；不自动重试。

### 5.3 选择器（权限 / 模式 / 模型）

- 选项来自 capability（含 `CLI default`）；不支持的选择器禁用并解释
  ——已存在，保持。
- 需重启生效的变更标注「下次启动 / Fork 时生效」；UI 绝不谎报已应用
  ——已存在，保持。
- NEW（chat 会话）：模型选择器改为**即时生效通道**——变更 →
  `PATCH { activeModel }`（api-spec §2.6）→ 标注「下一轮生效」；
  权限/模式选择器在 chat 会话仍走 launchConfig（下次启动生效）。

### 5.4 审批交互（B 段）与兜底文案

- `approval_request` → 气泡内「允许 / 拒绝」按钮 →
  `POST approvals/:approvalId`；挂起时 composer 提示「等待审批」；
  `approval_response`（含 timeout）到达后按钮变为决定记录。
- 兜底（`supportsApproval: false` 的 Profile）：轮次因权限失败时，
  错误条目附指引文案——建议调整权限选择器（如 codex
  `--ask-for-approval never` / claude `acceptEdits`）后重试，或
  Fork 为 terminal 会话在 CLI 内交互处理（i18n key
  `chat.approvalFallbackHint`，EN/ZH 同批）。

## 6. 创建流与会话列表（MODIFY）

- `NewSessionDialog`：新增交互模式选择（默认 chat）；所选 Profile
  `supportsHeadlessTurns: false` 时模式控件锁定 terminal 并展示
  降级说明（响应 `interactionModeDowngraded` 同样触发该说明，
  以服务端结果为准）。
- 会话列表条目：新增模式徽标（chat/terminal）；运行状态四态徽标、
  分组/置顶/过滤/右键菜单/拖拽排序均已存在（B 段验收核对）。
- 并发上限拒绝（`SESSION_CONCURRENCY_LIMIT`）：toast 呈现
  `running/limit` 数值 + 指引停掉空闲会话；不静默失败。

## 7. 通用要求（现状基线，B 段验收核对）

- i18n：全部新增文案 EN/ZH 同批交付（复用 `client/i18n.tsx`）。
- 键盘可达：新增控件（取消、重试、审批按钮、模式选择）均可 Tab 聚焦、
  Enter/Space 激活；审批气泡进入时不抢焦点；模态焦点圈定与归还沿用
  现有 `ActionDialog` 模式；状态不只靠颜色（徽标含文字）；尊重
  reduced-motion（spinner 降级为静态指示）。
- readonly 模式：composer、取消、审批、创建全部禁用并说明（现有
  readonly 拦截模式复用）。

## 8. Edge Cases

| 场景 | 处理 |
|---|---|
| WS 断连期间轮次完成 | 重连补发事件推导终态（api-spec §4.2）；turn-status 丢失不影响正确性 |
| 事件乱序到达（理论不发生） | 按 sequence 排序插入渲染列表，防御性处理 |
| 超长 assistant 输出（truncated: true） | 气泡尾部「内容已截断」标记 + 查看原文 |
| 用户在降级 terminal 会话期望 chat | 会话头部说明入口：解释降级原因 + 建议换 Profile 新建 |
| Fork chat 会话 | Fork 确认框说明「新会话不继承 CLI 上下文，历史仅只读回放」（domain-spec §5） |

## 9. Testing（详见 test-spec §3.5）

- 组件测试：kind→渲染映射全表、四态、sanitize 策略（HTML 注入 /
  javascript: 链接 fixture）、composer 禁用态矩阵、重试生成新
  clientMessageId。
- Playwright（B 段）：创建→对话→重启恢复→继续 的 E2E 冒烟。

## 10. PRD 映射

| PRD | 本 SPEC |
|---|---|
| §4.2.3 Chat View 渲染 | §3、§4 |
| §4.2.5 Composer | §5 |
| §5 三栏布局 / Quest Home | §2、§6、§7 |
| §5 通用要求（i18n/可达性/四态/readonly） | §3.3、§7 |
| §4.2.4 降级解释 | §6 |
