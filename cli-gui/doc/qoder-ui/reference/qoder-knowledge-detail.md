# Qoder Knowledge 知识库管理 — 设计细节文档

> 对应截图：左侧边栏选中 Knowledge 后的主界面，包含 Repo Wiki / Knowledge Card / Memory 三个 Tab、左侧 Wiki 目录树、右侧 mcip 项目 Wiki 详情面板。

---

## 1. 产品定位

Knowledge 是 Qoder IDE 的**项目记忆中枢**，让 Agent 在编码前“读懂”项目，也让人类开发者快速查阅项目结构。它管理三类内容：

| Tab | 用途 | 受众 |
|-----|------|------|
| **Repo Wiki** | 基于代码库自动生成的项目百科：目录、架构、模块、关键文件说明 | 人类开发者 |
| **Knowledge Card** | 给 Agent 看的结构化知识卡片，用于 RAG 检索与上下文注入 | Agent / LLM |
| **Memory** | Agent 运行过程中沉淀的项目记忆、规则、约定、常见问题 | Agent / 人类 |

对你自己的 CLI GUI 工具而言，Knowledge 承担：
- **项目 Wiki 自动生成**：把你的 CLI 项目结构、命令、配置解释成可读文档。
- **Skill 管理**：把常用命令、工作流封装为可复用的 Skill。
- **Memory 沉淀**：记录项目约定、踩坑记录、用户偏好。

---

## 2. 整体布局

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Sidebar (260px)  │  Knowledge Main Area (flex:1)                          │
│                   │  ┌────────────────────────────────────────────────────┐  │
│                   │  │  Tabs: Repo Wiki | Knowledge Card | Memory           │  │
│                   │  └────────────────────────────────────────────────────┘  │
│                   │  ┌─────────────┬─────────────────────────────────────┐  │
│                   │  │  Left Tree  │  Right Detail                       │  │
│                   │  │  (280px)    │  (flex:1)                           │  │
│                   │  │             │  · 顶部 info bar                    │  │
│                   │  │  Search     │  · 提示 banner                      │  │
│                   │  │  Workspace  │  · 图标 + 标题                      │  │
│                   │  │  Generate   │  · 属性列表                         │  │
│                   │  │  Tree       │  · Update 按钮                      │  │
│                   │  └─────────────┴─────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

说明：
- 进入 Knowledge 时，**右侧 Summary/Terminal/Files 面板隐藏**。
- 默认选中 **Repo Wiki** Tab。
- 左侧 Tree 与右侧 Detail 之间用 1px `--border` 竖线分隔。

---

## 3. 色彩与字号规范

沿用 Quest 主界面 token，新增/强调：

| Token | 值 | 用途 |
|-------|-----|------|
| `--bg` | `#f6f6f6` | 页面背景 |
| `--panel` | `#ffffff` | 卡片背景 |
| `--hover` | `#f2f2f2` | hover 背景 |
| `--active-bg` | `#ebebeb` | 选中背景 |
| `--border` | `#e6e6e6` | 边框 |
| `--text` | `#111111` | 主文字 |
| `--text-secondary` | `#6b6b6b` | 次要文字 |
| `--text-tertiary` | `#9ca3af` | 更淡文字 |
| `--blue` | `#2563eb` | 链接、选中态 |
| `--blue-bg` | `#eef2ff` | 提示 banner 背景 |
| `--green` | `#22c55e` | 生成成功 |
| `--radius-lg` | `10px` | 大卡片圆角 |
| `--radius-md` | `8px` | 按钮圆角 |

字号：
- Tab 文字：13px，font-weight 500
- 左侧标题（如 mcip）：14px，font-weight 600
- 树节点：13px
- 右侧主标题（mcip）：16px，font-weight 600
- 详情标签（Language 等）：12px，color `--text-secondary`
- 详情值：13px，color `--text`
- 提示 banner：12.5px

---

## 4. 顶部 Tab 栏

```
高度：44px
背景：#fff
border-bottom: 1px solid var(--border)
padding-left: 16px
display: flex; align-items: center; gap: 4px
```

Tab 项：

```
默认态：
  padding: 8px 12px
  border-radius: 6px
  color: var(--text-secondary)
  font-size: 13px
  cursor: pointer

Hover：
  background: var(--hover)
  color: var(--text)

选中态：
  background: var(--active-bg)
  color: var(--text)
  font-weight: 600
```

三个 Tab：
1. **Repo Wiki**（默认选中）
2. **Knowledge Card**
3. **Memory**

切换 Tab 时，下方内容区淡入淡出（opacity 150ms）。

---

## 5. 左侧目录树面板

宽度：280px，背景 `#fff`，border-right: 1px solid var(--border)。

### 5.1 顶部工具区

**搜索框**：
```
height: 34px
margin: 12px 12px 10px
padding: 0 10px 0 32px
border: 1px solid var(--border)
border-radius: var(--radius-md)
background: #fff
font-size: 13px
placeholder: "Search Repo Wiki"
左侧搜索图标 14px
右侧（可选）清除按钮
```

**Workspace 选择器**：
```
显示：nnaccel
font-size: 13px
color: var(--text-secondary)
padding: 0 12px 10px
display: flex; justify-content: space-between; align-items: center

右侧 "Go to generate" 链接：
  color: var(--blue)
  font-size: 12px
  cursor: pointer
```

### 5.2 树结构

截图示例树：

```
▾ mcip
  ▸ 项目概述
  ▸ 项目介绍
  ▸ 技术栈概览
  ▾ 架构总览
    ▸ 系统架构设计
    ▾ 微服务架构
      ▸ 服务通信机制
      ▸ 服务发现与负载均衡
      ▸ 分布式配置管理
      ▸ 可观测性与监控
    ▾ 数据架构
      ▸ 数据存储策略
      ▸ PostgreSQL主数据库
      ▸ Redis缓存策略
      ▸ Kafka消息队列
      ▸ 数据一致性保障
      ▸ 数据一致性
      ▸ 数据迁移管理
      ▸ 数据安全保护
    ▸ 安全架构
    ▸ 部署架构
  ▾ 核心模块
    ▸ 认证网关服务
    ▸ 支付网关服务
    ▸ 架构设计
    ▸ 订单管理
```

树节点样式：

```
节点容器：
  display: flex; align-items: center; gap: 6px
  padding: 5px 8px 5px calc(8px + level * 14px)
  border-radius: 6px
  cursor: pointer
  font-size: 13px
  color: var(--text)

Hover：
  background: var(--hover)

选中态：
  background: var(--active-bg)
  color: var(--text)
  font-weight: 500

展开/折叠图标（chevron）：
  width: 12px; height: 12px
  color: var(--text-tertiary)
  transition: transform .15s ease
  展开时旋转 90°
```

### 5.3 树的数据模型

```typescript
interface WikiNode {
  id: string;
  title: string;
  level: number;           // 0,1,2,3...
  expanded?: boolean;
  selected?: boolean;
  children?: WikiNode[];
  source?: {               // 对应代码库来源
    filePath?: string;
    commitId?: string;
    lineRange?: [number, number];
  };
}
```

---

## 6. 右侧详情面板

### 6.1 顶部信息条

```
显示：mcip  ↑  feat/admin-ui-refresh
      Updated at 2026-07-21 20:01 · Commit ID: bb45f180a3e4

布局：
  padding: 12px 16px
  border-bottom: 1px solid var(--border)
  display: flex; flex-direction: column; gap: 4px

分支标签：
  display: inline-flex; align-items: center; gap: 4px
  font-size: 12px
  color: var(--text-secondary)
  分支图标 12px

更新时间 / Commit ID：
  font-size: 12px
  color: var(--text-tertiary)
```

### 6.2 提示 Banner

```
背景：var(--blue-bg)
border-bottom: 1px solid var(--border)
padding: 10px 16px
font-size: 12.5px
color: var(--text-secondary)

前缀图标：info 圆圈，14px，color var(--blue)

文案：
"Repo Wiki (for you) and Knowledge Card (for agents) will be generated and updated together based on your codebase."
```

### 6.3 中央内容区

```
flex: 1
padding: 40px 24px
overflow: auto
```

中央内容包含：

1. **Wiki 图标**：48×48px，圆角 12px，背景 `#f2f2f2`，中间雪花/文档 SVG，color `--text-secondary`。
2. **标题**：mcip，16px，font-weight 600，居中，margin-top 16px。
3. **详情表格**：

```
容器：
  max-width: 420px
  margin: 28px auto 0
  border: 1px solid var(--border)
  border-radius: var(--radius-lg)
  background: #fff
  overflow: hidden

行：
  display: flex
  padding: 12px 16px
  border-bottom: 1px solid var(--border)
  最后一行无边框

标签列：
  width: 140px
  font-size: 12px
  color: var(--text-secondary)

值列：
  flex: 1
  font-size: 13px
  color: var(--text)
```

截图中的字段：

| 标签 | 值 |
|------|-----|
| Language | English / 简体中文（可切换） |
| Generation Status | ✓ Wiki has commit（绿色） |
| Wiki Files | 270/270 Done, 0 failed |
| Update Time | 2026-07-21 20:01 |
| Commit ID | bb45f180a3e4 |

Language 切换：
```
显示为文本链接，当前语言高亮
未选中：color var(--text-secondary)
选中：color var(--text)，font-weight 600
```

Generation Status：
```
对勾图标 12px + 文字
成功：color var(--green)
失败：color #dc2626
生成中：蓝色 spinner
```

Wiki Files：
```
进度文字
Done 数绿色，failed 数红色
```

### 6.4 底部说明与操作

说明文字：
```
font-size: 12px
color: var(--text-tertiary)
text-align: center
max-width: 420px
margin: 16px auto 0
line-height: 18px
```

示例文案：
> "The latest commit is 31aaaf7f10x102 files changed. You can update wiki manually or turn off Auto Update in preference settings."

Update 按钮：
```
width: 100%
max-width: 420px
height: 38px
margin: 16px auto 0
border-radius: var(--radius-md)
background: var(--accent)
color: #fff
font-size: 13px
font-weight: 600
cursor: pointer

Hover：background var(--accent-hover)
禁用/生成中：opacity .7，显示 spinner
```

右侧可配置更多操作的下拉按钮（截图中为 `...` 按钮紧挨 Update）。

---

## 7. Knowledge Card Tab

切换到该 Tab 时，左侧树变为 **Card 列表**，右侧显示单张 Card 详情：

### 7.1 Card 列表项

```
padding: 8px 12px
border-radius: 6px
cursor: pointer
font-size: 13px

Hover：background var(--hover)
选中：background var(--active-bg)
```

每张 Card：
- 标题：如 "Auth Flow"
- 摘要：1-2 行
- 标签：如 `agent-only`, `rag`

### 7.2 Card 详情

- 标题 + tags
- 内容：Markdown 渲染
- Source files（引用来源）
- 刷新 / 编辑 / 删除按钮

---

## 8. Memory Tab

Memory 用于沉淀 Agent 运行中的项目记忆：

### 8.1 Memory 类型

| 类型 | 说明 |
|------|------|
| **User Preference** | 用户对代码风格、框架、命名等偏好 |
| **Project Convention** | 项目内约定，如目录结构、API 规范 |
| **Gotcha** | 踩坑记录、常见错误 |
| **Decision** | 架构决策与原因 |

### 8.2 界面

左侧：Memory 条目列表（按时间倒序）
右侧：选中 Memory 详情

每条 Memory：
- 类型标签
- 标题
- 创建时间
- 来源 Quest（可选）

---

## 9. Skill 管理

Knowledge 与 Marketplace 的交叉点是 **Skill**。在 Knowledge 中，Skill 可以：

- 从 Marketplace 安装后出现在 **Knowledge Card > Skills** 下。
- 用户可创建本地 Skill，保存在 `.qoder/skills/`。
- Skill 与 Memory 关联：例如“总是使用单引号”既是一条 Memory，也可以是一个 Skill 规则。

### 9.1 Skill 数据结构

```typescript
interface Skill {
  id: string;
  name: string;
  description: string;
  type: "builtin" | "marketplace" | "local";
  triggers: string[];          // 触发词
  commands?: string[];         // 注册的 / 命令
  mcp?: string[];              // 关联的 MCP servers
  rules?: string[];            // 注入 system prompt 的规则
  memoryRefs?: string[];       // 关联 Memory ID
}
```

### 9.2 Skill 与 Wiki 的关系

- Repo Wiki 给人类读。
- Knowledge Card 给 Agent 读，可由 Wiki 自动提炼。
- Skill 是 Agent 可执行的能力，可引用 Knowledge Card。

---

## 10. 关键交互

### 10.1 生成 Wiki

1. 选择 Workspace（如 nnaccel）。
2. 点击 `Go to generate` 或 `Update`。
3. 系统扫描代码库：
   - 分析目录结构、依赖、关键文件
   - 生成目录树与节点内容
   - 写入本地 `.qoder/wiki/<workspace>/`
4. 进度显示在 Generation Status / Wiki Files。
5. 完成后树自动刷新，选中根节点，右侧显示详情。

### 10.2 点击树节点

- 点击节点标题 → 右侧加载该节点 Markdown 内容。
- 点击展开/折叠图标 → 展开/折叠子节点。
- 支持多选？默认单选；可扩展 `Ctrl/Cmd + 点击` 多选用于批量操作。

### 10.3 编辑 Wiki

- 人类可编辑任意节点。
- 编辑后标记为 `modified`，与下次自动生成做 merge。
- 可导出为 Markdown 文件。

### 10.4 切换 Workspace

- 顶部 Workspace 选择器下拉。
- 切换后重新加载对应 Wiki 树。
- 若未生成，显示空状态 + `Generate` 按钮。

---

## 11. 数据流

```
Codebase
   ↓
Indexer（扫描文件、AST、依赖）
   ↓
LLM Summarizer（生成节点摘要）
   ↓
Repo Wiki Tree（人类可读）
   ↓
Knowledge Card Generator（提炼为 Agent 卡片）
   ↓
Vector DB（LanceDB / Chroma）← Agent RAG 检索
   ↓
Memory Store（沉淀用户偏好与项目约定）
```

---

## 12. 验收标准

- [ ] Repo Wiki / Knowledge Card / Memory 三个 Tab 可切换。
- [ ] 左侧目录树与截图示例层级一致，展开/折叠正常。
- [ ] 右侧 Wiki 详情字段与截图一致（Language / Generation Status / Wiki Files / Update Time / Commit ID）。
- [ ] Update 按钮有 hover 与 loading 状态。
- [ ] 顶部蓝色提示 banner 文案与样式还原。
- [ ] 搜索框可过滤树节点。
- [ ] 切换到 Knowledge 时右侧面板隐藏，切回 Quest 时恢复。
- [ ] 给出 Wiki / Knowledge Card / Memory / Skill 的完整数据模型。
