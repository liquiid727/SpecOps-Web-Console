# Qoder 1:1 复刻 PRD —— 可落地的 Agentic Coding IDE / CLI GUI 工具

> 版本：v1.0  
> 日期：2026-07-21  
> 目标：基于截图中的 Qoder Quest 主界面与 Qoder 公开功能，输出一份可直接进入开发排期的完整 PRD。  
> 输出物范围：UI 1:1 复刻方案、功能清单、组件/状态/数据模型、集成接口、技术栈建议、分阶段里程碑。

---

## 1. 背景与目标

### 1.1 为什么要复刻 Qoder
Qoder（Alibaba Lingma）是近期典型的 **Agentic Coding IDE**，核心差异化是把传统 IDE 从"代码编辑器"升级为"任务委托式开发环境"：
- **Ask / Agent / Quest 三种工作模式**覆盖从问答到结对编程再到异步交付的完整研发闭环；
- **Repo Wiki** 把代码库自动沉淀为可查询的知识图谱；
- **Memory & Rules** 让 Agent 越用越懂用户与项目；
- **MCP / Skills / Plugins** 让 Agent 能调用外部工具。

对于想打造自有 CLI GUI 工具的团队，Qoder 的产品形态是一个极佳参照：界面极简、交互围绕自然语言输入展开、右侧信息面板实时反馈任务进度。

### 1.2 本项目目标
1. **UI 1:1 复刻**截图中的 Qoder Quest 主界面（Light Theme），作为后续品牌化的设计基准；
2. **功能可落地**：PRD 中每个模块都给出可执行的需求描述、验收标准、数据/状态定义；
3. **架构可扩展**：保留接入不同 LLM、MCP Server、插件系统的扩展点；
4. **工程可实施**：给出推荐技术栈、目录结构、核心模块拆分、里程碑排期。

---

## 2. 产品定位与边界

### 2.1 一句话定位
一个面向软件研发的 **桌面端 Agentic Coding 工作台**：用户通过自然语言描述任务，Agent 在本地/远程工作区中自主或半自主地完成代码变更、测试、文档、提交等动作，并以 Quest / Agent / Ask 三种模式协同。

### 2.2 IN / OUT

| IN（本期做） | OUT（本期不做，保留扩展点） |
|---|---|
| Quest 主界面 1:1 复刻与交互 | 自研底层代码编辑器（复用 Monaco / CodeMirror） |
| Quest / Agent / Ask 三种模式切换 | 自研大模型（复用 OpenAI / Claude / Qwen 等 API） |
| 文件系统读写、Git 操作、终端命令执行 | 云端多机协作 / 实时多人编辑 |
| Repo Wiki 基础索引与查询 | 完整的在线 marketplace 交易体系 |
| Memory & Rules 本地存储 | 企业级 SSO / 审计日志（保留账号体系接口） |
| MCP / Skills 插件协议接入 | 自研容器化执行环境（复用本地 shell / docker） |
| Credits 计费展示与本地配额提醒 | 真实支付/订阅系统（保留接口） |

---

## 3. 目标用户与典型场景

### 3.1 用户画像
- **独立开发者**：用 Quest 从 0 到 1 生成 MVP；用 Agent 修 Bug；用 Ask 查文档。
- **中小企业全栈工程师**：一个人cover前后端，把重复性重构/测试交给 Quest。
- **CLI 工具作者**：把已有 CLI 能力包装成 GUI，降低用户上手门槛。

### 3.2 典型场景
1. **Quest 模式**：输入"开发一个在线问卷系统"，Agent 自动产出 Spec → 拆任务 → 读写文件 → 跑测试 → 返回报告。
2. **Agent 模式**：选中一段报错代码，Agent 规划修复步骤，每步在检查点暂停等待确认。
3. **Ask 模式**：询问"这个仓库的认证中间件在哪挂载的？"，Agent 基于 Repo Wiki 秒级回答，不动文件。

---

## 4. 信息架构与导航

```
App
├── TitleBar（窗口控制、全局搜索、通知、账户/Credits）
├── Sidebar（一级导航）
│   ├── New Quest 按钮
│   ├── Quests（任务列表）
│   ├── Chats（会话列表）
│   ├── Knowledge（Repo Wiki / Memory / Rules）
│   ├── Marketplace（Skills / MCP / Plugins）
│   └── User Profile（账户/设置）
├── Main Area（根据模式切换）
│   ├── Quest Home（截图页面）
│   ├── Quest Detail（任务执行详情）
│   ├── Agent Chat（结对编程）
│   ├── Ask Chat（问答）
│   ├── Editor + FileTree（传统 IDE 视图）
│   └── Settings
└── Right Panel（全局右侧信息区）
    ├── Summary
    ├── Terminal
    └── Files
```

---

## 5. 全局设计系统（截图 Light Theme 1:1）

### 5.1 色彩（基于截图提取）

| Token | 值 | 用途 |
|---|---|---|
| `--bg-page` | `#F8F8F8` 或 `#FAFAFA` | 页面最底层背景 |
| `--bg-panel` | `#FFFFFF` | 卡片、右侧面板、输入框 |
| `--bg-sidebar` | `#FFFFFF` | 左侧导航背景 |
| `--bg-hover` | `#F2F2F2` | 列表 hover |
| `--border` | `#E6E6E6` / `#EBEBEB` | 分割线、卡片边框 |
| `--text-primary` | `#111111` | 主标题、选中文字 |
| `--text-secondary` | `#6B6B6B` | 次级说明、占位符 |
| `--text-tertiary` | `#9E9E9E` | 时间、空状态 |
| `--accent` | `#1A1A1A` | 主按钮、选中态、强调文字 |
| `--accent-light` | `#4A4A4A` | hover 态 |
| `--green` | `#3DCC91` / `#4ADE80` | Security banner 左侧强调、成功状态 |
| `--green-bg` | `#EAFBF3` | Security banner 背景 |
| `--blue` | `#2563EB` | 链接、超管 |
| `--red` | `#EF4444` | 错误、删除 |
| `--shadow-card` | `0 1px 3px rgba(0,0,0,0.04)` | 卡片微阴影 |

### 5.2 字体
- **主字体**：系统无衬线栈 `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif`
- **代码字体**：`"SF Mono", ui-monospace, Menlo, Consolas, monospace`
- **字号层级**：
  - 页面大标题：`24-28px`，font-weight 600
  - 分区标题 / 卡片标题：`14-16px`，font-weight 600
  - 正文 / 列表项：`13px`，font-weight 400
  - 辅助说明 / 时间：`12px`，font-weight 400
  - 标签 / 徽章：`11px`，font-weight 500

### 5.3 间距与圆角
- 主面板间距：24px
- 卡片内边距：16-20px
- 列表项高度：40-44px
- 按钮圆角：8px（小按钮） / 10px（大输入框） / 12px（卡片）
- 输入框高度：52-56px
- 侧边栏宽度：240-260px
- 右侧面板宽度：360-400px

### 5.4 图标
- 使用统一线性图标集（建议 Phosphor / Heroicons / Lucide），尺寸 16px（列表）、18px（导航）、20px（操作按钮）。

---

## 6. 页面级详细需求

### 6.1 Quest Home（截图主界面）

#### 6.1.1 布局结构
```
[TitleBar]
[Sidebar] [MainArea] [RightPanel]
```

#### 6.1.2 TitleBar（顶部栏）
- 高度：44px（macOS 标准标题栏高度，含交通灯）。
- 左侧：macOS 交通灯（红/黄/绿），全局搜索图标。
- 中部：可留空或显示当前工作区名称。
- 右侧：通知铃铛、用户头像下拉。
- 视觉：半透明/毛玻璃效果，底部 1px 边框 `--border`。

#### 6.1.3 Sidebar（左侧导航）

**A. New Quest 按钮**
- 位置：Sidebar 顶部，16px 内边距。
- 样式：左侧 lightning/star 图标 + "New Quest" 文字 + 右侧 `⌘N` 快捷键提示。
- 尺寸：接近通宽，高度 36-40px，圆角 10px，背景 `--bg-hover`，hover 加深。
- 交互：点击后创建新 Quest，清空主输入区，右侧 Summary 重置为空状态。

**B. Quests 分区**
- 标题："Quests"，字号 11-12px，大写/加粗/灰色。
- 标题右侧两个图标：筛选/排序、视图切换（列表/网格）。
- 列表项：
  - 单行 40-44px，左侧小圆点/图标，标题主文字，右侧时间 badge（如 "8h"）。
  - Hover：背景 `--bg-hover`。
  - 选中态：背景 `--bg-hover` + 左侧 accent 竖线或文字加粗。
  - 标题过长时截断显示 "…"，tooltip 显示完整标题。
- 示例数据（来自截图）：
  - mncel · 8h
  - 查看未提交改动 · 8h
  - MCP · 8h
  - admin ui 优化 · 3h
  - 3-8-简单任务 · 8h
  - SpecOps-Web-Console
  - 看一下这个项目看一看Speci… · 7h

**C. Chats 分区**
- 标题："Chats"，同 Quests 样式。
- 空状态：当无最近会话时显示 "No Quest yet"（截图原文字），灰色辅助文字。
- 有会话时渲染会话条目：
  - 左侧圆形头像（首字母，渐变灰背景）。
  - 上方：Quest/会话名称（13px，加粗）+ 最近时间（11px，灰色）。
  - 下方：最后一条消息摘要（12px，灰色，单行截断）。
  - Hover：背景 `--hover`；选中态：背景 `--active-bg`，名称变 `--blue`。
- 点击后中间切换为对应 Chat 视图并渲染聊天记录。
- 参考详情：`qoder-chat-detail.md` §3。

**D. 底部功能区**
- 三项：Better Loop（带 Help 标签/link）、Knowledge、Marketplace。
- 每项 36px，左侧图标 + 文字，hover 背景变化。
- 最底部：用户头像（圆形）、用户名 `liquid727`、Pro badge、设置/主题切换图标。

#### 6.1.4 MainArea（中间主内容区）

**A. 页面标题**
- 文字：`Quest on, hands off`
- 字号 26-28px，font-weight 600，颜色 `--text-primary`。
- 位置：主内容区顶部偏上，距标题栏约 80-100px（垂直居中偏上）。

**B. Start in 选择器行**
- 标题左侧："Start in"，灰色辅助文字 14px。
- 三个下拉按钮横向排列，间距 8px：
  1. **工作区 / 项目**：显示 `mcip`，左侧带小图标（可能是仓库/项目图标）。
  2. **运行环境**：显示 `Local`，左侧带勾选图标 ✓。
  3. **Git 分支**：显示 `feat/admin-ui-refresh`，左侧带 Git branch 图标。
- 按钮样式：浅灰背景圆角 pill/button，hover 加深，右侧小 chevron。
- 交互：点击弹出下拉菜单，可选择/切换；无可用项时显示空状态或提示。

**C. 主输入框**
- 尺寸：宽度约等于主内容区 80% 最大宽度，最小高度 52-56px，圆角 12-14px。
- 背景：`--bg-panel` 白色，带轻微阴影 `--shadow-card` 和 1px border `--border`。
- Placeholder：`Plan, @ for context, / for commands`
- 聚焦态：边框变为 `--accent` 或蓝色光环。
- 交互：
  - `@` 触发上下文选择浮层（文件/文件夹/图片/git commit/Repo Wiki）。
  - `/` 触发命令浮层（如 `/learn`、`/chart`、`/test`）。
  - 支持拖拽图片到输入框作为多模态上下文。

**D. Spec / Goal 开关行**
- 位置：ChipRow 与 Textarea 之间，左对齐。
- 两个开关项：`Spec`（列表图标） / `Goal`（靶心图标）。
- 默认状态：**Spec 开启**，**Goal 关闭**。
- Toggle 尺寸：34×18px，开启时 `--accent` 背景，关闭时 `--border`。
- 业务语义：Spec 开启则 Agent 先输出技术规格再执行；Goal 开启则把输入解析为可量化目标。
- 参考详情：`qoder-input-detail.md` §3。

**E. 输入框下方工具行**
- 左侧：
  - `+ Agent` 下拉：切换 Ask / Agent / Quest 三种模式，默认 `Agent`。
  - `Model` 下拉：默认显示 `Qwen3.8-Max-Preview`，可选 Claude / GPT / Gemini 等。
- 右侧：
  - 上下文压缩（可 toggle）。
  - 润色 / sparkles（可 toggle）。
  - 语音输入按钮。
  - 发送按钮（圆形，深色背景）。
- 按钮默认灰色，hover 变深；可 toggle 按钮有 active 背景态。
- 参考详情：`qoder-input-detail.md` §4。

**F. 推荐任务卡片**
- 输入框下方 8-12px，横向排列 2-3 个卡片（截图是 3 个）。
- 卡片样式：白色背景、圆角 10px、1px border、轻微阴影；内边距 12-14px。
- 内容：任务描述文字，字号 13px，颜色 `--text-secondary`。
- 示例：
  - Develop an online survey system
  - Raise test coverage of the current project to 80%
  - Research mainstream vector databases and produce a selection report
- 交互：点击自动填入输入框并触发 Quest；hover 边框加深。

**G. Security Banner**
- 位置：推荐任务下方，距输入区约 24px。
- 样式：白色卡片，左侧绿色竖条/绿色图标装饰，内部左文右按钮。
- 标题：`Security, from the first line of code`（加粗）。
- 正文：`Qoder embeds security into your dev workflow — three-tier progressive scanning and one-click fixes, keeping every line secure before commit.`
- 按钮：`Learn More`（浅色/描边）、`Go to Settings`（深色填充）。
- 交互：Learn More 打开文档/弹窗；Go to Settings 跳转 Security 设置页。

**H. Chat 视图（左侧 Quest / Chat 点击后）**
- 默认展示 Quest Home；点击左侧存在聊天记录的 Quest/Chat 后，中间切换为 Chat 视图。
- 舞台结构：
  - `#home-view`：标题、Start in、推荐任务、Security Banner。
  - `#chat-view`：顶部 header（标题 + 分支/环境） + 消息列表。
  - `#composer`：输入框与工具行，Home/Chat 共享。
- 消息气泡：
  - 用户消息居右，深色背景（`--accent`），白色文字，头像为当前用户首字母。
  - 助手消息居左，白色背景 + 1px border，头像为 `Q`。
  - 支持换行，底部显示相对时间。
- 左侧 Chat 列表展示头像、名称、最后消息摘要、时间；选中后标题变蓝。
- 参考详情：`qoder-chat-detail.md`。

#### 6.1.5 RightPanel（右侧信息面板）

**A. 标签栏**
- 五个 Tab：Summary / Terminal / Files / Spec / Review。
- 选中态：文字加粗 + 底部 2px accent 下划线。
- 右侧有关闭/折叠按钮。
- Marketplace / Knowledge 视图下右侧面板自动隐藏，回到 Quest 视图后恢复。
- 标题栏右侧新增两个布局按钮：折叠/展开左侧栏、折叠/展开右侧面板，使用 `layout-sidebar-left` / `layout-sidebar-right` 图标。
- 折叠态：对应面板宽度变为 0 并隐藏 border，中间主内容区自动占满；再次点击按钮恢复。
- 参考详情：`qoder-chat-detail.md` §5。

**B. Summary Tab**
- 三个空状态模块纵向排列：
  1. **Progress** — 标题加粗，副文案 `Progress will appear here when tasks/todos generated`。
  2. **Artifacts** — 标题加粗，副文案 `No Artifacts yet`。
  3. **References** — 标题加粗，副文案 `No references yet`。
- 每个模块间距 24px，标题 14px，副文案 13px 灰色。
- 任务执行后填充 Step 时间线、产物列表、引用列表。

**C. Terminal Tab**
- 左右分栏布局：
  - 左侧 160px 终端列表，显示 `N Terminal(s)`，支持新建、切换终端。
  - 右侧为当前终端输出区，顶部工具栏含终端名称、清空、更多按钮。
- 字体等宽，12px，行高 19px，支持清空/复制/滚动。
- 多终端输出互不覆盖，切换时正确恢复。
- 参考详情：`qoder-right-panel-detail.md` §4。

**D. Files Tab**
- 显示当前任务涉及/修改的文件列表。
- 每项：状态 badge（A/M/D）+ 文件路径。
- A（add）绿色，M（mod）橙色，D（del）红色。

**E. Spec Tab**
- 展示任务规格说明（Agent 生成的需求文档）。
- 支持 Markdown 渲染与编辑。

**F. Review Tab**
- 展示代码审查结果与建议。
- 支持按文件分组、评论展开/折叠。

---

### 6.2 Quest Detail（任务执行详情页）

#### 6.2.1 触发
用户输入任务并提交后，主内容区从 Quest Home 切换为 Quest Detail。

#### 6.2.2 布局
左侧导航不变，右侧 Summary/Terminal/Files 开始填充内容；中间主区显示：
- 顶部：任务标题、状态标签（Running / Paused / Completed / Failed）、停止/重试按钮。
- 中部：Spec 卡片（Agent 自动生成的技术方案，可编辑）。
- 下方：任务步骤时间线（Step 1/2/3…），每个步骤可展开看日志、文件变更、命令输出。
- 底部：继续 / 暂停 / 回滚检查点按钮。

#### 6.2.3 状态流转
```
Draft → Planning → Running → CheckpointReview → Running → Completed
                ↓               ↓
              Paused          Failed/Rollback
```

---

### 6.3 Agent Chat（结对编程模式）

#### 6.3.1 布局
- 右侧为聊天面板（或中间为主聊天区），左侧/底部为代码编辑器。
- 消息气泡区分用户（右侧/浅色）与 Agent（左侧/白色）。
- Agent 消息中可嵌入：
  - 代码块（可复制/应用）
  - 检查点 diff 卡片（确认/回滚）
  - 文件变更列表
  - 命令执行结果

#### 6.3.2 模式切换
通过输入框上方的 `Ask / Agent / Quest` Tab 切换；Agent 模式下 Agent 会主动读写文件，Ask 模式只回答不动文件。

---

### 6.4 Ask Mode（问答模式）

#### 6.4.1 布局
类似 Agent Chat，但消息流只读/建议性质。

#### 6.4.2 功能
- 基于 Repo Wiki 回答项目架构问题。
- 引用来源：显示来自哪些文件/Wiki 节点。
- 一键"转为 Agent 任务"：把回答中的建议变成可执行计划。

---

### 6.5 Repo Wiki（代码库知识图谱）

#### 6.5.1 功能
- 自动扫描代码库，生成模块、关键类型、入口点、构建配置索引。
- 支持手动触发 Re-index。
- 可视化图谱（文件依赖图、调用图）。
- 支持自然语言查询："认证中间件在哪里挂载的？"

#### 6.5.2 存储
本地 SQLite / JSON 索引 + 向量嵌入缓存。

---

### 6.6 Memory & Rules

#### 6.6.1 Memory
- 用户显式让 Agent "记住"的偏好（如"我们总是用 Prettier 格式化"）。
- Agent 从交互中隐式学习到的风格偏好。
- 按项目/全局两级存储。

#### 6.6.2 Rules
- 项目级规则文件：`.qoder/rules`（或 `.workbuddy/rules`）。
- 规则格式：Markdown/YAML，支持模式匹配（如 `**/*.ts`）。
- 规则优先级高于 Memory。

---

### 6.7 Editor + FileTree（传统 IDE 视图）

#### 6.7.1 文件树
- 左侧展开/折叠目录。
- 文件图标按扩展名显示。
- 右键菜单：Open / Copy Path / Delete / Add to Context / Ask about this file。

#### 6.7.2 编辑器
- 复用 Monaco Editor 或 CodeMirror。
- Tab 栏：文件名 + 关闭按钮 + 修改指示点。
- 支持 diff 视图（对比 Agent 修改前后）。

---

### 6.8 Settings（设置）

#### 6.8.1 账户与计费
- 用户名/头像、Pro badge。
- Credits 余额显示、用量统计。
- 订阅计划（Free / Pro / Pro+ / Ultra / Teams）。

#### 6.8.2 模型设置
- 模型提供商配置（API Key、Base URL、自定义模型）。
- 默认模型选择 / Auto 路由开关。
- 每个模式（Ask/Agent/Quest）可独立设置默认模型。

#### 6.8.3 MCP / Skills / Plugins
- 已安装 Skills 列表。
- MCP Server 配置（URL、env、授权）。
- Marketplace 入口（可浏览/安装/更新/卸载）。

#### 6.8.4 安全与隐私
- 安全扫描开关。
- 代码上传/遥测开关。
- 敏感文件忽略规则。

---

## 7. 交互设计

### 7.1 全局快捷键
| 快捷键 | 功能 |
|---|---|
| `⌘ + N` | 新建 Quest |
| `⌘ + K` | 打开全局命令面板 / 文件搜索 |
| `⌘ + L` | 唤起/聚焦 AI 输入框 |
| `⌘ + I` | 行内快速修改（编辑器中） |
| `⌘ + E` | 开启 Quest Mode |
| `⌘ + Shift + P` | 命令面板 |
| `Esc` | 取消当前 Agent / 关闭浮层 |

### 7.2 输入框上下文（@ 触发）
用户输入 `@` 后弹出浮层，选项包括：
- `@file` — 选择一个或多个文件；
- `@folder` — 选择目录；
- `@image` — 上传/粘贴图片；
- `@gitCommit` — 选择某次提交；
- `@wiki` — 引用 Repo Wiki 节点；
- `@rule` — 引用某条规则。

### 7.3 命令面板（/ 触发）
用户输入 `/` 后弹出命令列表，例如：
- `/learn` — 让 Agent 学习当前项目；
- `/chart` — 绘制流程图；
- `/test` — 运行测试；
- `/commit` — 生成提交信息；
- `/doc` — 生成文档。

### 7.4 检查点与回滚
- Agent/Quest 每完成一个可逆步骤自动创建 checkpoint；
- 用户在 UI 上可查看 diff、批准、拒绝或回滚到上一个 checkpoint；
- 回滚后文件状态恢复，任务状态变为 Paused / Retry。

---

## 8. 数据模型与状态

### 8.1 核心实体

#### User
```ts
interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  plan: "free" | "pro" | "pro_plus" | "ultra" | "teams";
  credits: number;
}
```

#### Workspace / Project
```ts
interface Workspace {
  id: string;
  name: string;
  path: string; // 本地绝对路径
  gitBranch?: string;
  remoteUrl?: string;
  env: "local" | "remote" | "docker";
  createdAt: string;
}
```

#### Quest
```ts
interface Quest {
  id: string;
  title: string;
  status: "draft" | "planning" | "running" | "paused" | "review" | "completed" | "failed";
  mode: "quest" | "agent" | "ask";
  workspaceId: string;
  branch?: string;
  prompt: string;
  spec?: Spec;
  steps: Step[];
  checkpoints: Checkpoint[];
  messages: Message[];
  artifacts: Artifact[];
  references: Reference[];
  createdAt: string;
  updatedAt: string;
  costCredits?: number;
}
```

#### Spec
```ts
interface Spec {
  id: string;
  summary: string;
  requirements: string[];
  plan: string[];
  techStack?: string[];
  estimatedSteps: number;
}
```

#### Step
```ts
interface Step {
  id: string;
  questId: string;
  index: number;
  title: string;
  status: "pending" | "running" | "done" | "failed";
  toolCalls: ToolCall[];
  output?: string;
  startedAt?: string;
  completedAt?: string;
}
```

#### Checkpoint
```ts
interface Checkpoint {
  id: string;
  questId: string;
  stepId: string;
  parentId?: string;
  diff: FileDiff[];
  approved?: boolean;
  createdAt: string;
}
```

#### Message
```ts
interface Message {
  id: string;
  questId: string;
  role: "user" | "assistant" | "system";
  content: string;
  attachments?: Attachment[];
  toolCalls?: ToolCall[];
  createdAt: string;
}
```

#### ToolCall
```ts
interface ToolCall {
  id: string;
  tool: "read_file" | "write_file" | "apply_diff" | "run_command" | "search_code" | "fetch_web" | "mcp" | "git";
  input: Record<string, any>;
  output?: any;
  status: "pending" | "success" | "error";
}
```

#### Memory
```ts
interface Memory {
  id: string;
  scope: "global" | "workspace";
  workspaceId?: string;
  content: string;
  source: "explicit" | "learned";
  createdAt: string;
}
```

#### Rule
```ts
interface Rule {
  id: string;
  workspaceId: string;
  pattern: string; // glob
  content: string;
  priority: number;
}
```

### 8.2 状态管理建议
- 使用 **Zustand / Pinia / Redux Toolkit** 管理全局 UI 状态。
- Quest/Agent 运行状态使用 **状态机**（xstate / 自研），便于处理异步、暂停、回滚。
- 文件系统/终端等长连接数据通过 **IPC / WebSocket / EventSource** 与渲染进程同步。

---

## 9. 技术架构

### 9.1 推荐技术栈

| 层 | 推荐方案 | 说明 |
|---|---|---|
| 桌面壳 | Tauri / Electron / Wails | Tauri 体积小、Rust 后端安全；Electron 生态成熟 |
| 前端框架 | React 18 + TypeScript | 组件化、生态丰富 |
| 状态管理 | Zustand + TanStack Query | 轻量、异步数据友好 |
| UI 组件 | Radix UI / Shadcn UI + Tailwind CSS | 可定制、易还原设计 |
| 代码编辑器 | Monaco Editor | VS Code 同款 |
| 代码 Diff | diff2html / react-diff-viewer | 检查点 diff 展示 |
| 后端/Agent | Node.js / Python / Rust | 执行 LLM 调用、工具编排 |
| LLM 调用 | OpenAI SDK + Vercel AI SDK | 多模型统一抽象 |
| 向量索引 | LanceDB / Chroma / SQLite-vec | 本地向量检索 |
| 文件索引 | Tree-sitter / ripgrep / LSIF | 代码结构解析 |
| 终端 | xterm.js + node-pty | 前端终端 + 伪终端 |
| 数据持久化 | SQLite / IndexedDB | 本地元数据、消息、索引 |
| 打包/更新 | Tauri Updater / electron-builder | 自动更新 |

### 9.2 目录结构（Tauri + React 示例）
```
workbuddy-ide/
├── src/
│   ├── app/                 # 路由/页面壳
│   ├── components/          # 通用 UI 组件
│   ├── features/
│   │   ├── quest/           # Quest 模块
│   │   ├── agent/           # Agent 模块
│   │   ├── ask/             # Ask 模块
│   │   ├── repo-wiki/       # Repo Wiki
│   │   ├── memory-rules/    # Memory & Rules
│   │   ├── editor/          # 编辑器封装
│   │   ├── terminal/        # 终端
│   │   ├── marketplace/     # Skills / MCP
│   │   └── settings/        # 设置
│   ├── hooks/
│   ├── stores/              # Zustand stores
│   ├── lib/
│   │   ├── llm/             # LLM 客户端封装
│   │   ├── tools/           # 工具实现（文件/命令/git）
│   │   ├── mcp/             # MCP 协议实现
│   │   ├── indexer/         # 代码库索引
│   │   └── security/        # 安全扫描
│   └── types/
├── src-tauri/               # Tauri Rust 后端
├── resources/
└── docs/
```

### 9.3 模块依赖关系
```
UI Layer (React)
    ↕ IPC / API
Agent Runtime (Node/Rust)
    ↕
Tool Layer (fs, git, shell, mcp)
    ↕
LLM Providers (OpenAI, Anthropic, Alibaba, Local)
```

---

## 10. API 与集成

### 10.1 LLM Provider 抽象
```ts
interface LLMProvider {
  id: string;
  name: string;
  chat(messages: Message[], options: ChatOptions): AsyncIterable<ChatChunk>;
  countTokens(text: string): number;
}
```

### 10.2 Tool Registry
所有 Agent 可调用的工具统一注册：
- `read_file`
- `write_file`
- `apply_diff`
- `run_command`
- `search_code`
- `list_directory`
- `git_status` / `git_diff` / `git_commit`
- `fetch_web`
- `mcp_invoke`

### 10.3 MCP 协议接入
- 支持 `stdio` 和 `sse` 两种传输；
- 服务端发现后动态注册为 Tool；
- 配置持久化到 `~/.workbuddy/mcp.json`。

### 10.4 Repo Wiki 索引接口
- `POST /wiki/index` — 全量索引工作区；
- `GET /wiki/search?q=` — 语义/关键词搜索；
- `GET /wiki/graph` — 获取模块依赖图；
- `POST /wiki/query` — 自然语言查询。

---

## 11. 安全与隐私

### 11.1 本地优先
- 代码、索引、聊天记录默认本地存储；
- LLM 调用可选本地模型或用户自配 API Key；
- 不上传代码到云端（除非用户显式开启云同步）。

### 11.2 安全扫描
- 静态扫描：Secrets、依赖漏洞、危险函数；
- 运行时扫描：Agent 执行命令前风险提示；
- 敏感文件保护：`.env`、私钥等默认只读/需确认。

### 11.3 沙箱
- Agent 执行的 shell 命令默认在白名单内；
- 高危命令（`rm -rf /`、格式化等）必须用户二次确认；
- 可选 Docker 沙箱执行。

---

## 12. 实现里程碑

### Phase 1 — 壳体与布局（2-3 周）
- 搭建桌面壳（Tauri/Electron）与 React 工程；
- 实现 TitleBar、Sidebar、MainArea、RightPanel 四栏布局；
- 实现设计系统（颜色、字体、圆角、阴影、按钮、输入框、卡片）；
- **验收**：打开应用能看到 1:1 的 Quest Home 空界面。

### Phase 2 — Quest Home 1:1 复刻（2 周）
- 实现 New Quest、Quests 列表、Chats 空状态、底部功能区、用户信息；
- 实现 Start in 选择器、主输入框、@ 与 / 浮层、推荐任务卡片、Security Banner；
- 实现右侧 Summary / Terminal / Files Tab 与空状态；
- **验收**：截图中的每个元素都可在 UI 上找到且交互正确。

### Phase 3 — Agent Runtime 与工具链（3-4 周）
- 实现 LLM Provider 抽象与多模型路由；
- 实现文件读写、命令执行、Git、搜索等工具；
- 实现 Ask 模式（只读问答）；
- **验收**：用户可在 Ask 模式提问，Agent 基于当前项目上下文回答。

### Phase 4 — Agent Mode 与检查点（3 周）
- 实现 Agent 计划、执行、检查点、diff 展示、确认/回滚；
- 集成编辑器与 diff 视图；
- **验收**：Agent 能修改文件，用户在检查点确认后变更生效，回滚后文件恢复。

### Phase 5 — Quest Mode 与异步交付（3-4 周）
- 实现 Spec 生成、任务拆解、异步执行、进度跟踪、Artifacts、References；
- 实现 Quest 列表状态同步；
- **验收**：输入"开发一个在线问卷系统"，Quest 能产出可运行的代码并展示进度/产物/引用。

### Phase 6 — Repo Wiki、Memory & Rules（2-3 周）
- 实现代码库索引、向量检索、自然语言查询；
- 实现 Memory 学习与 Rules 文件解析；
- **验收**：用户问"认证中间件在哪"能得到准确答案，Rules 能影响 Agent 输出。

### Phase 7 — MCP / Marketplace / 设置 / 计费（2-3 周）
- 实现 MCP 协议接入与 Skills 管理；
- 实现设置页、账户/Credits、模型配置；
- **验收**：可安装 MCP Server，余额/用量正确显示。

### Phase 8 — 优化与发布（2 周）
- 性能优化、错误处理、快捷键、自动更新、打包签名；
- **验收**：稳定可用，可对外发布安装包。

**总计约 19-24 周**（视团队规模与经验）。

---

## 13. 验收标准

1. **UI 1:1 验收**：Quest Home 页面与截图在布局、配色、圆角、间距、文案上保持一致；
2. **功能验收**：Ask/Agent/Quest 三种模式可切换，Agent 模式能读写文件并带检查点；
3. **性能验收**：千级文件仓库索引 < 5 分钟；Quest 首 token 延迟 < 8 秒；
4. **稳定性验收**：连续 8 小时运行不崩溃，检查点回滚 100% 恢复文件状态；
5. **扩展性验收**：新增一个 MCP Server 可在 5 分钟内配置并生效。

---

## 14. 风险与应对

| 风险 | 影响 | 应对 |
|---|---|---|
| LLM 上下文窗口不足 | 大仓库理解受限 | 使用 Repo Wiki 摘要 + 分层检索，必要时切分任务 |
| Agent 误改文件 | 数据安全 | 检查点机制 + 敏感文件保护 + 高危命令确认 |
| 多模型输出不稳定 | 体验不一致 | Auto 路由 + 模型 fallback + 用户可固定模型 |
| 代码编辑器自研成本高 | 延期 | 复用 Monaco Editor，聚焦 Agent 差异化功能 |
| 跨平台兼容性 | 体验差异 | 优先 macOS/Windows，Linux 后续支持 |

---

## 15. 附录

### 15.1 命名约定
- 项目代号：WorkBuddy IDE（可替换）
- 规则目录：`.workbuddy/rules`
- 记忆目录：`.workbuddy/memory`
- MCP 配置：`~/.workbuddy/mcp.json`
- 索引缓存：`.workbuddy/.index/`

### 15.2 参考链接
- Qoder 官网：https://qoder.com
- Qoder CN 文档：https://www.alibabacloud.com/help/zh/lingma/qoder-cn
- MCP 协议：https://modelcontextprotocol.io

---

*本 PRD 完成后，建议先进入 Phase 1 与 Phase 2，先把 Quest Home 1:1 复刻出来作为 MVP 演示，再逐步叠加 Agent Runtime。*
