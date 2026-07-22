# Qoder 底部输入栏设计细节

> 对应截图：底部对话框特写（Spec/Goal 开关、Agent/模型切换、上下文压缩/润色/语音/发送）。
> 作用：作为 Quest / Agent / Ask 三种模式统一的自然语言输入入口。

---

## 1. 组件位置与结构

```
InputWrap
├── ChipRow（@ 上下文标签，可删除）
├── ModeRow（Spec / Goal 开关行）
├── Textarea（多行自适应）
└── InputActions（底部工具行）
    ├── LeftTools
    │   ├── + Agent（模式切换）
    │   └── ModelPill（模型选择）
    └── RightTools
        ├── 上下文压缩
        ├── 润色
        ├── 语音输入
        └── 发送按钮
```

---

## 2. Placeholder

- 文案：`Plan, @ for context, / for commands`
- 颜色：`--text-tertiary`（`#9ca3af`）
- 字号：15px，行高 22px
- 触发：聚焦或输入为空时显示

---

## 3. Spec / Goal 开关行

### 3.1 视觉
- 位于 ChipRow 与 Textarea 之间，左对齐，间距 14px。
- 每个 ModeItem 包含：图标（16px）+ 文字 + Toggle 开关。
- 默认状态：**Spec 开启**（Toggle 在右，深色背景），**Goal 关闭**（Toggle 在左，灰色背景）。

### 3.2 图标
- Spec：列表/文档图标（`<path d="M8 6h13" />` 三横线 + 三个圆点）
- Goal：靶心/目标图标（三个同心圆）

### 3.3 Toggle 样式
- 尺寸：宽 34px，高 18px，圆角 9px。
- 关闭：`background: var(--border)`
- 开启：`background: var(--accent)`（`#1a1a1a`）
- 滑块：14px 白色圆点，带 1px 阴影，位移 16px。

### 3.4 状态机
```ts
interface InputMode {
  spec: boolean; // 是否生成 Spec
  goal: boolean; // 是否设定目标
}
```
- 两开关互不影响，可同时开启或关闭。
- 点击整行触发切换，给出 Toast：`已开启 Spec` / `已关闭 Spec`。
- 提交时若 `spec=true`，Agent 先输出技术规格再进入执行；若 `goal=true`，Agent 把输入解析为可量化目标。

---

## 4. 底部工具行

### 4.1 + Agent（模式切换）
- 样式：圆角 pill，左侧 "+"，右侧模式名（Ask / Agent / Quest）。
- 默认：`Agent`。
- 下拉菜单：
  - Ask：问答模式，不动文件。
  - Agent：结对编程，每步确认。
  - Quest：自主交付，异步执行。
- 选中项带 ✓，hover 背景变化。

### 4.2 ModelPill（模型选择）
- 样式：圆角 pill，显示当前模型名，右侧 chevron。
- 默认值：`Qwen3.8-Max-Preview`（按截图）。
- 下拉模型列表：
  - Qwen3.8-Max-Preview（默认）
  - Claude 3.7 Sonnet
  - GPT-5
  - Gemini 2.5 Pro
- 支持搜索过滤。
- 切换后立即更新 pill 文案并 Toast。

### 4.3 上下文压缩
- 图标：压缩/收缩箭头（四角向中心）。
- 状态：可 toggle，active 时背景 `--active-bg`。
- 作用：在请求前对历史上下文做摘要压缩，减少 token。

### 4.4 润色
- 图标：四角星 / sparkles。
- 状态：可 toggle，active 时背景 `--active-bg`。
- 作用：对用户输入进行即时润色，再发送给 Agent。

### 4.5 语音输入
- 图标：麦克风。
- 点击 Toast 演示，真实实现调用系统麦克风 API。

### 4.6 发送按钮
- 圆形，30px，深色背景（`--accent`），白色纸飞机图标。
- 无内容时禁用（opacity 0.45）。
- 快捷键：`⌘ + Enter` / `Ctrl + Enter`。

---

## 5. 交互规范

| 操作 | 反馈 |
|---|---|
| 点击 Spec/Goal | Toggle 滑动 + Toast |
| 切换 Agent 模式 | Pill 文案变更 + Toast |
| 切换模型 | Pill 文案变更 + Toast |
| 开启上下文压缩 | 图标背景高亮 + Toast |
| 开启润色 | 图标背景高亮 + Toast |
| 点击语音 | Toast“语音输入（演示）” |
| 点击发送 | 右侧 Summary 开始填充，Terminal 输出执行日志 |

---

## 6. 数据结构

```ts
interface InputState {
  text: string;
  contexts: ContextChip[];
  spec: boolean;
  goal: boolean;
  agentMode: 'Ask' | 'Agent' | 'Quest';
  model: string;
  compress: boolean;
  polish: boolean;
}
```

---

## 7. 验收标准

- [ ] Spec/Goal 开关视觉与截图一致，动画流畅。
- [ ] Agent 下拉可切换 Ask/Agent/Quest，模型下拉默认 Qwen3.8-Max-Preview。
- [ ] 上下文压缩、润色可 toggle，有明确 active 态。
- [ ] 发送后右侧 Summary/Terminal 开始联动展示。
- [ ] 所有操作均有点击反馈（hover / active / Toast）。
