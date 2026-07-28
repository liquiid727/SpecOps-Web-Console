# Qoder 右侧内容区设计细节

> 对应截图：右侧 Summary / Terminal / Files / Spec / Review 标签页，以及 Terminal 左右分栏界面。
> 作用：展示 Quest/Agent 执行过程中的进度、产物、引用、终端输出、规格说明和代码审查。

---

## 1. 组件位置与结构

```
RightPanel
├── RTabs（标签栏）
│   ├── Summary
│   ├── Terminal
│   ├── Files
│   ├── Spec
│   ├── Review
│   └── Close（折叠按钮）
└── RContent
    ├── Panel-Summary
    ├── Panel-Terminal（左右分栏）
    ├── Panel-Files
    ├── Panel-Spec
    └── Panel-Review
```

---

## 2. 标签栏

### 2.1 标签列表
按顺序排列：
1. **Summary** — 任务进度、产物、引用。
2. **Terminal** — 终端输出，支持多终端切换。
3. **Files** — 当前任务涉及/修改的文件。
4. **Spec** — 任务规格与需求说明。
5. **Review** — 代码审查与建议。

### 2.2 视觉
- 高度：44px。
- 标签间距：20px。
- 未选中：`--text-secondary`，常规字重。
- 选中：`--text-primary`，font-weight 600，底部 2px accent 下划线。
- 右侧关闭按钮：22px 圆角，hover 背景 `--hover`。

### 2.3 交互
- 点击切换内容面板。
- 关闭按钮点击后隐藏整个 RightPanel（Quest 视图下仍可恢复）。
- Marketplace / Knowledge 视图下右侧面板自动隐藏。

---

## 3. Summary 面板

### 3.1 模块
纵向排列三个模块：
1. **Progress**
   - 空状态：`Progress will appear here when tasks/todos generated`
   - 执行中：展示 Step 列表，每项含状态标记 + 标题 + 副标题。
2. **Artifacts**
   - 空状态：`No Artifacts yet`
   - 执行后：报告、diff patch、日志文件等。
3. **References**
   - 空状态：`No references yet`
   - 执行后：引用文件、Wiki 节点、规则等。

### 3.2 Step 状态
- 进行中：蓝色旋转 loading。
- 已完成：绿色 ✓。
- 待执行：灰色圆点。

---

## 4. Terminal 面板（左右分栏）

### 4.1 布局
```
TerminalPanel
├── TermSidebar（160px）
│   ├── TermHead（1 Terminal + 新建按钮）
│   └── TermList（终端列表）
└── TermArea
    ├── TermToolbar（标题 + 清空/更多）
    └── TermScroll（终端输出）
```

### 4.2 左侧 Terminal 列表
- 宽度：160px。
- 背景：`#fafafa`，右侧 1px 边框。
- 头部：显示 `N Terminal(s)`，右侧 `+` 按钮新建终端。
- 列表项：终端图标 + 名称，hover 背景 `--hover`。
- 选中态：背景 `--active-bg`，字重 500。
- 点击切换右侧输出内容。

### 4.3 新建终端
- 点击 `+` 按钮新增一个 Terminal。
- 默认名称：`Terminal 2`、`Terminal 3`…
- 新终端自动聚焦，头部计数实时更新。

### 4.4 右侧终端区域
- 顶部工具栏：显示当前终端名称；右侧清空、更多按钮。
- 输出区：等宽字体，12px，行高 19px，可滚动。
- 颜色语义：
  - `.dim`：灰色提示
  - `.acc`：蓝色命令/强调
  - `.ok`：绿色成功
  - `.pr`：绿色进程名

### 4.5 数据结构
```ts
interface TerminalSession {
  id: number;
  name: string;
  logs: string[]; // HTML 片段
}

interface TerminalState {
  sessions: TerminalSession[];
  activeId: number;
}
```

---

## 5. Files 面板

- 展示当前任务修改的文件列表。
- 每项显示：状态 badge（A/M/D）+ 文件路径。
- A（add）绿色，M（mod）橙色，D（del）红色。
- 空状态：`No files modified yet`。

---

## 6. Spec 面板

- 展示任务规格说明（Agent 生成的需求文档）。
- 支持 Markdown 渲染与编辑。
- 空状态：`Spec 面板 · 任务规格与需求说明将在此展示`。

---

## 7. Review 面板

- 展示代码审查结果与建议。
- 支持按文件分组、评论展开/折叠。
- 空状态：`Review 面板 · 代码审查与建议将在此展示`。

---

## 8. 交互规范

| 操作 | 反馈 |
|---|---|
| 切换标签 | 下划线移动 + 内容淡入 |
| 点击 Terminal 列表项 | 该项高亮，右侧输出切换 |
| 新建 Terminal | 列表追加，计数 +1，自动聚焦新终端 |
| 清空 Terminal | 当前终端保留 `$ 终端已清空` 提示 |
| 关闭右侧面板 | 面板整体隐藏，可通过全局快捷键/菜单恢复 |

---

## 9. 验收标准

- [ ] 标签包含 Summary / Terminal / Files / Spec / Review。
- [ ] Terminal 面板为左右分栏，左侧可切换、新建终端。
- [ ] 多终端输出互不覆盖，切换时正确恢复。
- [ ] Files 面板正确展示 A/M/D 状态。
- [ ] Spec / Review 面板有占位内容，后续可接入真实数据。
- [ ] 标签切换与 Marketplace/Knowledge 视图下的显隐逻辑正确。
