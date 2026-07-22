# Qoder 左侧会话栏（Sidebar）设计细节文档

> 目标：1:1 复刻截图中 Qoder Quest 主界面的左侧会话栏，聚焦 icon 形态、深浅色阶、选中/悬停/按下三态反馈，作为 CLI GUI 工具导航层的可直接落地依据。
> 关联文件：`qoder-quest-replica.html`、`qoder-replica-prd.md`

---

## 1. 整体结构

左侧栏固定宽度 **260px**，高度占满视口（`height: 100vh - titlebar`），背景为纯白 `#FFFFFF`，右侧 1px 分隔线 `#E6E6E6`。

纵向分为四个区域：

```
Sidebar
├── Top Zone（New Quest 按钮）      高度自适应，内边距 14px
├── Scroll Zone（可滚动内容）
│   ├── Quests Section Header
│   ├── Quests List（文件夹 / 普通任务 / 收藏任务）
│   ├── Chats Section Header
│   └── Chats Empty State
├── Bottom Links（Better Loop / Knowledge / Marketplace）
└── User Card（头像 / 名称 / Pro / 设置）
```

---

## 2. 色彩色阶规范

所有颜色采用单一灰阶 + 一个主蓝强调色，保证截图中的“干净、低饱和、层次靠深浅区分”的观感。

| Token | 色值 | 使用场景 |
|---|---|---|
| `--sidebar-bg` | `#FFFFFF` | 侧边栏背景 |
| `--sidebar-hover` | `#F2F2F2` | 列表项 hover、图标 hover 背景 |
| `--sidebar-active` | `#EBEBEB` | 列表项选中背景（比 hover 再深 5%） |
| `--sidebar-active-text` | `#2563EB` | 选中项文字颜色 |
| `--border` | `#E6E6E6` | 分隔线、按钮边框 |
| `--text-primary` | `#111111` | 列表项主文字、选中态图标 |
| `--text-secondary` | `#6B6B6B` | Section 标题、未激活文字 |
| `--text-tertiary` | `#9CA3AF` | 普通图标默认色、时间戳、空状态 |
| `--text-quaternary` | `#BFBFBF` | 最弱层级，如 folder icon 默认态 |
| `--star-fill` | `#F59E0B` | 收藏 star 填充色 |
| `--dot-fill` | `#9CA3AF` | 普通任务圆点默认色，选中变蓝 |

**色阶原则**：背景从白 → hover `#F2F2F2` → active `#EBEBEB` 形成 3 级深浅；图标从 `#BFBFBF`（folder）/ `#9CA3AF`（dot/star）→ hover `#6B6B6B` → active `#111111` / `#2563EB` 形成 3 级深浅。

---

## 3. 图标系统与变形规则

### 3.1 图标尺寸

| 位置 | 尺寸 | 描边粗细 |
|---|---|---|
| New Quest `+` | 16×16 | 2px |
| Section 操作区图标 | 13×13 | 1.75px |
| Quest 项前置图标 | 14×14 | 1.5px |
| 底部链接图标 | 15×15 | 1.75px |
| 用户区设置图标 | 14×14 | 1.75px |
| More `…` | 14×14 | 2px |

### 3.2 图标变形规则

#### A. New Quest `+` 按钮
- **默认**：浅灰背景 `#F2F2F2`，`+` icon 颜色 `#6B6B6B`。
- **Hover**：背景 `#E9E9E9`，`+` icon 颜色 `#111111` 并做 **135° 旋转变为 ×**（寓意“新建/关闭”的动态暗示），过渡 200ms `cubic-bezier(0.4,0,0.2,1)`。
- **Active / Press**：整体 `transform: scale(0.985)`，背景 `#E0E0E0`。
- **快捷键**：右侧 `⌘N` 标签背景 `#FFFFFF`，边框 `#E6E6E6`，文字 `#9CA3AF`。

#### B. Quests Section 操作区（从左到右）

1. **列表视图切换（Kanban/List）**
   - 默认 icon：左侧三条横线 + 右侧一竖线（`kanban` 视图）。
   - 点击后切换为：四个小方块（`grid` 视图），icon 形态发生替换而非简单旋转。
   - 切换时执行 150ms 淡入淡出 + 轻微缩放 `scale(0.92) → scale(1)`。
   - Hover：背景 `#F2F2F2`，icon 颜色 `#111111`。
   - Active：背景 `#EBEBEB`，icon 颜色 `#111111`。

2. **筛选（Filter）**
   - 默认 icon：漏斗。
   - Hover：背景 `#F2F2F2`，icon 颜色 `#111111`；漏斗底部轻微下坠 `translateY(1px)`，暗示“过滤下落”。
   - 点击后弹出筛选浮层；Active 态背景 `#EBEBEB`，icon 颜色 `#111111`。

3. **新建 Quest（+）**
   - 默认 icon：加号。
   - Hover：背景 `#F2F2F2`，icon 颜色 `#111111`，加号 **90° 旋转**（像“展开”动作）。
   - Active：背景 `#EBEBEB`，`scale(0.92)`。

#### C. Quest 列表项前置图标

Quest 列表项分为三种类型，每种前置图标不同：

| 类型 | 前置图标 | 默认色 | Hover 色 | 选中色 | 说明 |
|---|---|---|---|---|---|
| **Folder** | 文件夹 outline | `#BFBFBF` | `#9CA3AF` | `#2563EB` | 表示项目/工作区，无时间戳 |
| **Task** | 实心小圆点 6px | `#9CA3AF` | `#6B6B6B` | `#2563EB` | 普通任务，右侧带时间戳 |
| **Pinned** | 四角星 outline / fill | `#9CA3AF` | `#F59E0B` | `#F59E0B` | 收藏/置顶任务，右侧带 `…` |

**图标交互细节**：
- Folder：hover 时 folder 开口微微张开（路径 stroke 从闭合到略微开口，或整体 `translateY(-0.5px)`），暗示“可展开”。
- Task Dot：hover 时圆点直径从 6px 缩放到 5px 再回到 6px（一次脉冲），选中时变为实心 `#2563EB`。
- Pinned Star：
  - 默认 outline 描边 `#9CA3AF`。
  - hover 时 outline 内部从中心向外填充 `#F59E0B`（fill-opacity 0 → 1，150ms）。
  - 选中时保持填充 `#F59E0B`，描边取消。
  - 再次点击可取消收藏，填充退去。

#### D. More `…` 按钮
- 仅出现在 Pinned 任务项右侧，默认透明度 `0`（或颜色 `#BFBFBF` 极低透明度），hover 整个任务项时渐显为 `#9CA3AF`。
- Hover `…` 本身：背景 `#F2F2F2`，颜色 `#111111`。
- 点击弹出上下文菜单：置顶/取消置顶、重命名、归档、删除。

#### E. 底部链接图标
- Better Loop（三角/旗帜 icon）、Knowledge（书本 icon）、Marketplace（地球/插件 icon）。
- 默认色 `#9CA3AF`。
- Hover：背景 `#F2F2F2`，图标颜色 `#111111`，图标轻微右移 `translateX(1px)` 或放大 `scale(1.05)`。
- 右侧 Tag（如 Help）颜色固定 `#2563EB`，不受 hover 影响。

#### F. 用户区设置齿轮
- 默认色 `#9CA3AF`。
- Hover：背景 `#F2F2F2`，齿轮缓慢旋转 30°（200ms），颜色 `#111111`，暗示“设置/调整”。

---

## 4. 分区交互细节

### 4.1 New Quest 按钮

```
┌────────────────────────────┐
│  +   New Quest         ⌘N  │
└────────────────────────────┘
```

- **容器**：`height: 38px`，`border-radius: 10px`，`padding: 0 10px`。
- **布局**：左侧 icon + 文字，右侧快捷键标签，两端对齐。
- **点击反馈**：点击瞬间容器 `scale(0.985)`，+ 图标旋转到 45°（形成 ×）。
- **键盘**：支持 `⌘N` / `Ctrl+N` 触发。

### 4.2 Quests Section Header

```
QUESTS                [list] [filter] [+]
```

- 标题 `QUESTS`：`font-size: 11px`，`font-weight: 700`，`letter-spacing: 0.4px`，颜色 `#6B6B6B`，大写。
- 操作区图标：每个 22×22px 点击热区，5px 圆角，2px 间距。
- 当前激活视图（list / grid）保持 active 背景 `#EBEBEB`。
- 筛选按钮点击后弹出 **Quests 筛选 / 排序 / 分组浮层**，详见 [第 10 章](#10-quests-筛选--排序--分组浮层)。

### 4.3 Quest 列表项

#### 普通 Folder 项

```
[folder] nnaccel
```

- `padding: 7px 8px`，`border-radius: 6px`，`margin-bottom: 1px`。
- 文字：`font-size: 13px`，`color: #111111`（保持清晰可读）。
- 图标 folder 默认色 `#BFBFBF`，比文字弱，形成“icon 退后、文字靠前”的层次。
- Hover：背景 `#F2F2F2`，folder 颜色 `#9CA3AF`。

#### 普通 Task 项

```
[●] admin ui 优化                    3h
```

- 左侧 6px 圆点，默认 `#9CA3AF`。
- 右侧时间戳 `3h`：`font-size: 11px`，颜色 `#9CA3AF`。
- Hover：背景 `#F2F2F2`，圆点脉冲一次，时间戳颜色 `#6B6B6B`。
- 选中：背景 `#EBEBEB`，圆点 `#2563EB`，文字 `color: #2563EB`，`font-weight: 500`。

#### Pinned 任务项

```
[☆] 3.8-简单任务                    […]
```

- 左侧四角星 outline，默认 `#9CA3AF`。
- 右侧 `…` 默认隐藏或极低透明度，hover 项时显示。
- Hover：背景 `#F2F2F2`，star 填充 `#F59E0B`（fill-opacity 动画）。
- 选中：背景 `#EBEBEB`，star 保持填充 `#F59E0B`，文字 `#111111`。

### 4.4 Chats Section

```
CHATS
  No Quest yet
```

- 标题样式同 Quests。
- 空状态：`padding: 6px 8px 14px 8px`，`font-size: 13px`，`color: #9CA3AF`。
- Hover 空状态无交互，但整栏 hover 时右侧可出现“新建 Chat”小图标（与 Quests 操作区对齐）。

### 4.5 底部链接

- 每个链接高度 `32px`，`border-radius: 6px`，`padding: 7px 8px`。
- 图标与文字间距 `8px`。
- Hover 时背景 `#F2F2F2`，图标颜色 `#111111`，文字 `#111111`。

### 4.6 用户区

- 头像：26×26px 圆形，渐变背景 `#6B7280 → #374151`，白色文字大写首字母。
- 名称：`font-size: 12px`，`font-weight: 600`。
- Plan：`font-size: 11px`，`color: #9CA3AF`。
- 设置齿轮 hover 旋转 30°。

---

## 5. 状态变化矩阵

| 元素 | Normal | Hover | Active/Selected | Disabled |
|---|---|---|---|---|
| New Quest 按钮 | bg `#F2F2F2`，icon `#6B6B6B` | bg `#E9E9E9`，icon `#111111` 旋转 45° | scale 0.985，bg `#E0E0E0` | opacity 0.5 |
| Section 操作图标 | color `#9CA3AF` | bg `#F2F2F2`，color `#111111` | bg `#EBEBEB`，color `#111111` | opacity 0.4 |
| Folder 图标 | color `#BFBFBF` | color `#9CA3AF`，微上浮 | color `#2563EB` | — |
| Task Dot | color `#9CA3AF` | 脉冲 + color `#6B6B6B` | color `#2563EB` | — |
| Pinned Star | outline `#9CA3AF` | fill `#F59E0B` | fill `#F59E0B` | — |
| More `…` | opacity 0 | opacity 1，bg `#F2F2F2` | bg `#EBEBEB` | — |
| Quest 项背景 | transparent | `#F2F2F2` | `#EBEBEB` | — |
| 底部链接 | color `#9CA3AF` | bg `#F2F2F2`，color `#111111` | bg `#EBEBEB` | — |
| 设置齿轮 | color `#9CA3AF` | 旋转 30°，color `#111111` | — | — |

---

## 6. 动画与过渡

| 动画 | 时长 | Easing | 说明 |
|---|---|---|---|
| 图标颜色过渡 | 150ms | ease | 所有 icon color 变化 |
| 背景色过渡 | 120ms | ease | hover/active 背景 |
| New Quest + 旋转 | 200ms | `cubic-bezier(0.4,0,0.2,1)` | 0° → 45° |
| View Toggle 图标替换 | 150ms | ease-out | opacity + scale |
| Star fill 填充 | 150ms | ease-out | fill-opacity 0 → 1 |
| Task Dot 脉冲 | 200ms | ease-in-out | scale 1 → 0.85 → 1 |
| 设置齿轮旋转 | 200ms | ease-out | 0° → 30° |
| More 按钮渐显 | 150ms | ease | opacity 0 → 1 |
| 按下缩放 | 80ms | ease-in | scale 1 → 0.985 |

---

## 7. 数据结构建议

用于驱动左侧栏的最小数据模型：

```typescript
interface SidebarQuest {
  id: string;
  type: 'folder' | 'task' | 'pinned';
  name: string;
  workspace?: string;        // folder 类型关联的工作区
  timestamp?: string;        // task 类型的时间戳，如 "3h"
  isSelected?: boolean;
  isPinned?: boolean;
}

interface SidebarSection {
  key: 'quests' | 'chats';
  title: string;
  viewMode: 'list' | 'grid';
  filterOpen: boolean;
  items: SidebarQuest[];
}
```

---

## 8. 实现要点

1. **图标全部内联 SVG**，通过 CSS `color` 控制描边，通过 `fill` / `fill-opacity` 控制填充变形。
2. **图标变形优先使用 CSS transform / opacity**，避免重绘；复杂形态切换（list/grid）可准备两套 SVG，通过 opacity 交叉淡入。
3. **More 按钮的显示/隐藏**使用 `opacity` + `pointer-events`，hover 父级时改变子级状态。
4. **选中态背景**比 hover 更深，避免 hover 覆盖选中后视觉消失。
5. **色阶保持一致**：背景 3 级（白 / hover / active），图标 3 级（tertiary / secondary / primary），通过对比度拉开层级。
6. **键盘可访问**：New Quest、Section 操作、Quest 项均需支持 `tabindex` 与 `Enter/Space` 触发。

---

## 9. 验收标准

- [ ] 左侧栏宽度 260px，背景白，分隔线 1px `#E6E6E6`。
- [ ] New Quest 按钮 hover 时 `+` 旋转 45°，按下缩放。
- [ ] Quests 标题区三个图标 hover 均有背景 + 颜色变深，视图切换图标形态会变化。
- [ ] Quest 列表至少展示 folder / task / pinned 三种类型，前置图标不同。
- [ ] 选中任务项背景 `#EBEBEB`，圆点/文字变蓝；pinned star hover 填充黄色。
- [ ] More `…` 默认隐藏，hover 父项时显示。
- [ ] 底部链接与用户区设置齿轮有 hover 反馈。
- [ ] 所有过渡动画时长 ≤ 200ms，无卡顿。

---

## 10. Quests 筛选 / 排序 / 分组浮层

> 对应截图中的筛选弹层与顶部 Workspace chips。

### 10.1 触发位置

点击 Quests Section Header 右侧的 **漏斗图标** 后，在按钮下方弹出浮层；同时漏斗图标进入 active 态（背景 `#EBEBEB`，颜色 `#111111`）。再次点击按钮或点击浮层外部关闭。

### 10.2 顶部 Workspace Chips

在筛选按钮被激活前/后，Section Header 与 Quest 列表之间可出现一行横向滚动的 Workspace chips：

```
Workspace  [All]  [nnaccel (1)]  [mcip]  [SpecOps-Web-Console]
```

- **左侧标签**：`Workspace` 文字，`font-size: 11px`，`color: #9CA3AF`。
- **Chip 样式**：
  - 高度 `24px`，`padding: 0 10px`，`border-radius: 12px`。
  - 默认背景 `#F2F2F2`，文字 `#6B6B6B`，`font-size: 12px`。
  - 选中背景 `#111111`，文字 `#FFFFFF`，`font-weight: 500`。
  - Hover：未选中 `#E9E9E9`，选中 `#333333`。
- **计数显示**：如 `nnaccel (1)`，括号内数字与 Workspace 内 Quest 数量对应。
- **行为**：点击切换当前筛选的工作区，与浮层内的 `Group by › Workspace` 联动；选中 Workspace 后列表仅显示该工作区下的 Quest。

### 10.3 浮层结构

浮层宽度约 **220px**，背景 `#FFFFFF`，圆角 `10px`，阴影 `0 4px 16px rgba(0,0,0,0.10)`，内边距 `6px`。

```
┌─────────────────────────┐
│  ≡  Group by     Workspace  >  │
│  ⇅  Sort by      Updated    >  │
│  ─────────────────────────  │
│  Filter by                  │
│  ○  Status            All   >  │
│  ◻  Read              All   >  │
│  ▭  Archive           All   >  │
│  ─────────────────────────  │
│  ↺  Reset                   │
└─────────────────────────┘
```

### 10.4 Group by（分组方式）

| 选项 | 图标 | 默认 | 说明 |
|---|---|---|---|
| **Workspace** | 三层叠放方块 | ✓ 默认 | 按工作区/项目分组，对应 folder 结构 |
| **Status** | 圆形状态点 | — | 按 Running / Completed / Failed 分组 |
| **Date** | 日历 | — | 按创建/更新时间分组（今天 / 昨天 / 更早） |
| **None** | 单条横线 | — | 不分组，平铺显示 |

- 当前选中项右侧显示选中值，例如 `Workspace`。
- 点击后向右展开二级菜单，选中后返回并应用分组。
- 切换分组时列表重新渲染，文件夹/任务按新的维度聚合并带轻微入场动画（opacity + translateY）。

### 10.5 Sort by（排序方式）

| 选项 | 图标 | 默认 | 说明 |
|---|---|---|---|
| **Updated** | 上下箭头 | ✓ 默认 | 按最后更新时间倒序 |
| **Created** | 加号/时钟 | — | 按创建时间倒序 |
| **Name** | A→Z | — | 按名称字母升序 |
| **Status** | 状态点 | — | 按状态优先级排序（Running > Completed > Archived） |

- 当前选中项右侧显示 `Updated`。
- 排序变更后 Quest 列表平滑重排（200ms transform/opacity 过渡）。
- 再次点击同一排序项可切换升序/降序，右侧箭头图标上下翻转。

### 10.6 Filter by（筛选器）

每个筛选项默认值为 `All`，点击向右展开二级菜单选择具体值。

#### A. Status
| 值 | 说明 |
|---|---|
| All | 全部状态 |
| Running | 进行中 |
| Completed | 已完成 |
| Failed | 失败 |
| Archived | 已归档 |

#### B. Read
| 值 | 说明 |
|---|---|
| All | 全部 |
| Read | 已读 |
| Unread | 未读 |

#### C. Archive
| 值 | 说明 |
|---|---|
| All | 包含/不包含归档都显示 |
| Active | 仅未归档 |
| Archived | 仅归档 |

- 选中任意非 All 值后，对应行右侧由 `All` 变为选中值（如 `Running`），并在左侧显示一个彩色指示点。
- 多个筛选器条件取交集；若无匹配项，列表显示空状态 `No matching Quests`。

### 10.7 Reset 重置

- 位于浮层底部，左侧刷新箭头图标，文字 `Reset`。
- 点击后：
  - Group by 恢复为 `Workspace`
  - Sort by 恢复为 `Updated`
  - Filter by 全部恢复为 `All`
  - 顶部 Workspace chips 恢复为 `All`
  - 列表恢复为默认全部展示
- 重置按钮 hover 背景 `#F2F2F2`，点击时 `scale(0.985)`。

### 10.8 二级菜单交互

- Group by / Sort by / Status / Read / Archive 点击后，当前浮层向右滑出（或覆盖为二级浮层），显示可选值列表。
- 二级菜单顶部显示返回按钮与当前分类标题（如 `Group by`）。
- 选中值后自动返回主浮层并更新显示。

### 10.9 图标规范

| 图标 | 尺寸 | 说明 |
|---|---|---|
| Group by 叠层方块 | 16×16 | 1.75px 描边，示意分层分组 |
| Sort by 上下箭头 | 16×16 | 1.75px 描边，表示排序方向 |
| Status 空心圆 | 16×16 | 1.75px 描边，选中值带实心点 |
| Read 方框 | 16×16 | 1.75px 描边，示意已读标记 |
| Archive 归档盒 | 16×16 | 1.75px 描边 |
| Reset 刷新箭头 | 16×16 | 1.75px 描边 |
| 右侧 > 箭头 | 10×10 | 1.5px 描边，颜色 `#9CA3AF` |

### 10.10 数据结构更新

```typescript
interface SidebarFilters {
  groupBy: 'workspace' | 'status' | 'date' | 'none';
  sortBy: 'updated' | 'created' | 'name' | 'status';
  sortOrder: 'asc' | 'desc';
  filters: {
    status: 'all' | 'running' | 'completed' | 'failed' | 'archived';
    read: 'all' | 'read' | 'unread';
    archive: 'all' | 'active' | 'archived';
  };
  workspace: string;  // 'all' 或具体 workspace id
}

interface SidebarQuest {
  id: string;
  type: 'folder' | 'task' | 'pinned';
  name: string;
  workspace?: string;
  timestamp?: string;
  status?: 'running' | 'completed' | 'failed' | 'archived';
  read?: boolean;
  isSelected?: boolean;
  isPinned?: boolean;
  updatedAt?: Date;
  createdAt?: Date;
}
```

### 10.11 验收标准（补充）

- [ ] 点击筛选漏斗弹出筛选 / 排序 / 分组浮层。
- [ ] 顶部 Workspace chips 可横向滚动，点击切换工作区筛选。
- [ ] Group by 支持 Workspace / Status / Date / None，切换后列表按新维度分组。
- [ ] Sort by 支持 Updated / Created / Name / Status，切换后列表平滑重排。
- [ ] Filter by 的 Status / Read / Archive 默认 All，选中非 All 后右侧显示选中值。
- [ ] Reset 一键恢复所有筛选/排序/分组到默认状态。
- [ ] 二级菜单可返回主浮层，选中后立即应用。
