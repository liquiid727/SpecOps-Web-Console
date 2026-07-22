# Qoder Chat 视图与侧栏折叠设计细节

> 本文档聚焦：1) 左侧 Quest / Chat 列表点击后中间如何渲染对应聊天内容；2) 左右侧栏折叠交互规范。用于指导 Qoder CLI GUI 的落地实现。

---

## 1. 视图模型：Quest Home ↔ Chat View

中间主内容区 `#view-quest` 拆分为两个舞台 + 一个共享 composer：

```
#view-quest (flex column, height 100%)
├── #home-view      (默认 active)  首页：标题、Start in、推荐任务、安全 Banner
├── #chat-view      (点击对话后 active)  聊天：header + 消息列表
└── #composer       (始终可见)  输入框：chips、Spec/Goal、模型、工具、发送
```

- `New Quest` / `⌘N` 始终切回 `#home-view`。
- 左侧任意 `q-item` 或 `chat-item` 点击时，若存在对应聊天记录则切到 `#chat-view`。
- Marketplace / Knowledge 视图仍通过 `switchView()` 切换，不受 Home/Chat 状态影响。

---

## 2. 聊天数据结构

```ts
interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;      // 支持换行（white-space: pre-wrap）
  time: string;      // 相对时间或时钟，如 "10:23" / "3h" / "Yesterday"
}

interface ChatSession {
  title: string;     // 对话标题（通常与 Quest 名一致）
  ws: string;        // 所属 Workspace
  branch: string;    // 当前 Git 分支
  env: 'Local' | 'Remote' | 'Docker';
  messages: ChatMessage[];
}

type ChatMap = Record<string, ChatSession>;
```

前端使用一个运行时字典 `CHATS` 保存会话；真实产品可持久化到 SQLite / IndexedDB，并通过 `activeChatId` 维护当前会话。

---

## 3. 左侧列表渲染规则

### 3.1 Quest 列表（`#qList`）
- 与之前一致，保留 folder / task / pinned 三种 item。
- 点击后：
  1. 清除所有 `q-item` / `chat-item` 的 active 态；
  2. 当前 item 高亮；
  3. 若 `CHATS[name]` 存在 → `switchToChat(name)`；
  4. 否则 → `switchToHome()`，并在输入框预填充 `继续处理：{name}`。

### 3.2 Chat 列表（`#chatList`）
- 空态 `No Quest yet` 替换为最近/常用会话条目。
- 每个条目展示：
  - 左侧头像（首字母，渐变背景）
  - 上方：Quest 名称 + 最近时间
  - 下方：最后一条消息摘要（单行截断）
- 选中态：背景 `--active-bg`，标题变 `--blue`。
- 点击直接 `switchToChat(id)`。

---

## 4. Chat View 渲染细节

### 4.1 Header
```
[folder-icon]  title                    // 如 "nnaccel"
[branch-icon] branch · [check-icon] env // 如 "main · Local"
```
- 标题字号 15px，font-weight 600。
- 分支 / 环境信息 12px，颜色 `--text-secondary`，用 `·` 分隔。

### 4.2 消息气泡
- 用户消息：右侧对齐，头像 `L`（当前用户），气泡背景 `--accent`，白色文字，右下圆角 4px。
- 助手消息：左侧对齐，头像 `Q`（Qoder Agent），气泡背景 `--panel`，1px border，左下圆角 4px。
- 文本支持换行与基本 HTML 转义（`escapeHtml`）。
- 时间戳 11px，`--text-tertiary`。
- 进入 Chat View 后自动 `scrollTop = scrollHeight`。

### 4.3 空态
当会话无消息时展示：大聊天气泡图标 + "暂无消息"。

---

## 5. 侧栏折叠交互

### 5.1 触发入口
标题栏右侧新增两个 `icon-btn`：
- `#toggleSidebar`：矩形框 + 左侧竖线（`layout-sidebar-left` 语义）。
- `#toggleRightPanel`：矩形框 + 右侧竖线（`layout-sidebar-right` 语义）。

### 5.2 折叠行为
| 面板 | 折叠类 | 宽度 | border | 说明 |
|------|--------|------|--------|------|
| 左侧栏 | `.sidebar.collapsed` | 0 | 隐藏 | 内容随 overflow:hidden 一起收起 |
| 右侧面板 | `.right.collapsed` | 0 | 隐藏 | 不影响 Marketplace/Knowledge 视图中 `.right.hidden` 的状态 |

- 点击按钮切换 `.collapsed` 类，Toast 反馈当前状态。
- 中间 `.main` 使用 `flex:1`，宽度自动占满剩余空间。
- 当从 Marketplace/Knowledge 切回 Quest 时，右侧面板 `.hidden` 被移除；若之前处于 `.collapsed`，则继续保持折叠。

### 5.3 快捷键（可选扩展）
- `⌘B` / `Ctrl+B`：折叠/展开左侧栏。
- `⌘J` / `Ctrl+J`：折叠/展开右侧面板。

---

## 6. 关键状态机

```
用户点击左侧 q-item/chat-item
    │
    ├─ 有对应 CHATS 记录 ──→ switchToChat(id)
    │                         ├─ activeChatId = id
    │                         ├─ 隐藏 home-view，显示 chat-view
    │                         ├─ 更新 chat header
    │                         └─ renderChatMessages + scrollToBottom
    │
    └─ 无对应记录 ──→ switchToHome()
                      ├─ activeChatId = null
                      ├─ 显示 home-view，隐藏 chat-view
                      ├─ 清除所有列表 active 态
                      └─ 预填充输入框
```

---

## 7. 与 PRD 的对应关系

- PRD §6.1.4 MainArea：补充 Home/Chat 双舞台与 composer 说明。
- PRD §6.1.2 Sidebar：补充 Chat 列表条目结构与折叠规范。
- PRD §6.1.5 RightPanel：补充折叠按钮与 `.collapsed` 状态。
