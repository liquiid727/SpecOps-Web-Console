# Qoder Marketplace 插件市场 — 设计细节文档

> 对应截图：左侧边栏选中 Marketplace 后的主界面，包含分类导航、插件搜索、Featured/Coding 等分区与插件卡片网格。

---

## 1. 产品定位

Marketplace 是 Qoder IDE 的**扩展发行中心**，服务于两类用户：

- **使用者**：为当前项目或全局安装 Skills / Commands / MCPs，增强 Agent 能力。
- **发布者**：把自定义 Skill、Command、MCP 打包成插件，发布到市场，供团队或公开使用。

对你要打造的 CLI GUI 工具而言，Marketplace 同时承担：
- **内置能力商店**：用户一键安装常用工作流（如 Docker 部署、API 测试、文档生成）。
- **CLI 插件发行**：把你的 CLI 命令封装为 GUI 插件，形成生态。

---

## 2. 整体布局

```
┌─────────────────────────────────────────────────────────────────────┐
│  Sidebar (260px)  │  Marketplace Main Area (flex:1)                │
│                   │  ┌──────────────────────────────────────────┐  │
│                   │  │  Header                                  │  │
│                   │  │  Title + subtitle + search               │  │
│                   │  └──────────────────────────────────────────┘  │
│                   │  ┌──────────┬──────────────────────────────┐  │
│                   │  │ Category │ Content                      │  │
│                   │  │ Nav      │  · Featured                  │  │
│                   │  │ (200px)  │  · Section: Coding           │  │
│                   │  │          │  · Plugin Grid (2-col)       │  │
│                   │  │          │                              │  │
│                   │  └──────────┴──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

说明：
- 进入 Marketplace 时，**右侧 Summary/Terminal/Files 面板隐藏**，让主区域获得完整空间。
- 整体保持浅色主题、macOS 标题栏、左侧全局 Sidebar。

---

## 3. 色彩与字号规范

沿用 Quest 主界面 token：

| Token | 值 | 用途 |
|-------|-----|------|
| `--bg` | `#f6f6f6` | 页面背景 |
| `--panel` | `#ffffff` | 卡片、浮层背景 |
| `--hover` | `#f2f2f2` | hover 背景 |
| `--active-bg` | `#ebebeb` | 选中背景 |
| `--border` | `#e6e6e6` | 边框、分割线 |
| `--text` | `#111111` | 主文字 |
| `--text-secondary` | `#6b6b6b` | 次要文字 |
| `--text-tertiary` | `#9ca3af` | 更淡文字、图标默认 |
| `--accent` | `#1a1a1a` | 按钮、强调 |
| `--blue` | `#2563eb` | 链接、选中态 |
| `--green` | `#4ade80` | 已安装、成功态 |
| `--radius-lg` | `10px` | 卡片圆角 |
| `--radius-md` | `8px` | 按钮、输入框圆角 |
| `--shadow` | `0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.03)` | 卡片阴影 |

字号：
- 页面大标题：22px，font-weight 700
- 副标题：13px，color `--text-secondary`
- 分类标题（Featured / Coding）：14px，font-weight 700
- 插件名称：14px，font-weight 600
- 插件描述：12.5px，line-height 18px，color `--text-secondary`
- 作者/下载量：12px，color `--text-tertiary`

---

## 4. 左侧分类导航（Category Nav）

宽度：200px，背景透明，与主区背景 `#f6f6f6` 一致。

### 4.1 分类列表

顺序与标签：

1. **Featured**（默认选中）
2. **Coding**
3. **DataBase**
4. **Debug & Testing**
5. **Developer Tools**
6. **DevOps**
7. **Product Design**
8. **Workflow**
9. ───────────（分割线）
10. **Installed**（右下角带数字徽章，如 `5`）

### 4.2 分类项样式

```
默认态：
  padding: 8px 12px
  border-radius: 8px
  color: var(--text-secondary)
  font-size: 13px
  cursor: pointer

Hover：
  background: #ffffff
  color: var(--text)

选中态：
  background: #ffffff
  color: var(--text)
  font-weight: 600
  box-shadow: var(--shadow)
```

### 4.3 Installed 徽章

```
徽章样式：
  min-width: 18px
  height: 18px
  padding: 0 6px
  border-radius: 9px
  background: var(--text-tertiary)
  color: #fff
  font-size: 11px
  font-weight: 600
  display: inline-flex; align-items:center; justify-content:center
```

---

## 5. 右侧内容区

### 5.1 Header

```
标题：Supercharge Your AI Agent
  font-size: 22px
  font-weight: 700
  color: var(--text)
  margin-bottom: 6px

副标题：Install plugins with skills, commands, and MCPs to extend Qoder for specialized tasks.
  font-size: 13px
  color: var(--text-secondary)
```

搜索框：
```
位置：标题右侧，靠右对齐
宽度：220px
height: 34px
padding: 0 12px 0 34px
border: 1px solid var(--border)
border-radius: var(--radius-md)
background: #fff
font-size: 13px
placeholder: "Search plugin"
左侧搜索图标：14px，color var(--text-tertiary)

Hover：border-color #d1d5db
Focus：border-color #9ca3af，box-shadow 0 0 0 3px rgba(37,99,235,0.08)
```

### 5.2 内容分区

每个分类对应一个 **Section**：

```
Section 标题：
  font-size: 14px
  font-weight: 700
  color: var(--text)
  margin: 28px 0 14px
  第一个 section margin-top 0
```

### 5.3 插件卡片（Plugin Card）

布局：2 列网格，gap 14px。

卡片尺寸：宽度自适应，最小 280px。

```
卡片容器：
  background: #fff
  border: 1px solid var(--border)
  border-radius: var(--radius-lg)
  padding: 16px
  display: flex
  gap: 14px
  cursor: pointer
  transition: border-color .15s, box-shadow .15s, transform .1s

Hover：
  border-color: #d1d5db
  box-shadow: 0 2px 8px rgba(0,0,0,0.06)

Active/按下：
  transform: scale(0.995)
```

卡片内部：

```
┌─────────────────────────────────────────────────┐
│  ┌────┐  插件名                         [✓]    │
│  │icon│  一句话描述                        或   │
│  └────┘  @作者  ↓ 1.4k                     安装 │
└─────────────────────────────────────────────────┘
```

- **Icon**：48×48px，圆角 10px，背景为插件主色 10% 透明度，图标居中。
- **名称**：14px，font-weight 600。
- **描述**：12.5px，color `--text-secondary`，最多 2 行，overflow hidden。
- **作者 + 下载量**：12px，color `--text-tertiary`。
  - 作者头像：14px 圆形
  - 下载图标：向下箭头 SVG
  - 数字：如 `8.8k`、`1.4k`
- **右侧操作区**：
  - 已安装：显示蓝色对勾 `✓`（或 `Installed` 标签）
  - 未安装：hover 时显示 `Install` 按钮（黑色填充按钮，高 28px）

Install 按钮：
```
默认隐藏，父卡片 hover 时显示
height: 28px
padding: 0 12px
border-radius: var(--radius-md)
background: var(--accent)
color: #fff
font-size: 12px
font-weight: 600
border: none
cursor: pointer

Hover：background var(--accent-hover)
点击后：按钮文字变为 Installing... → Installed ✓，颜色变绿
```

---

## 6. 插件数据模型

```typescript
interface Plugin {
  id: string;                    // 唯一标识，如 "superpowers"
  name: string;                  // 显示名称
  description: string;           // 一句话描述
  icon: string;                  // SVG 或 emoji
  iconBg: string;                // 图标背景色
  author: { name: string; avatar?: string };
  downloads: number;             // 下载次数，展示为 k/M
  category: string;              // 所属分类
  tags: string[];                // 技能标签，如 ["TDD", "debugging"]
  isInstalled: boolean;
  version: string;               // 如 "1.2.0"
  capabilities: ("skill" | "command" | "mcp")[];
  manifestUrl?: string;          // 插件清单地址
  cliCommand?: string;           // 对应 CLI 命令（对你自己的 CLI 工具很重要）
}
```

---

## 7. 关键交互

### 7.1 分类切换

- 点击左侧分类 → 右侧内容区滚动到对应 Section（或过滤只显示该分类）。
- 选中态即时切换，过渡 150ms。
- 当前分类如果无插件，显示空状态：`No plugins in this category yet`。

### 7.2 搜索过滤

- 输入时实时过滤，延迟 150ms debounce。
- 同时匹配：名称、描述、作者、tags。
- 无结果时显示：`No plugins match "xxx"`。

### 7.3 安装插件

1. 点击卡片上 `Install` 按钮。
2. 按钮文案变为 `Installing...`，禁用点击。
3. 模拟/真实执行安装：
   - 下载 manifest
   - 注册 skills / commands / mcp
   - 写入本地插件目录 `.qoder/plugins/<id>/`
4. 完成后按钮变为绿色对勾 `✓`，卡片标记 `isInstalled=true`。
5. Toast 提示：`Superpowers 已安装`。
6. Installed 分类计数 +1。

### 7.4 卸载 / 更新

- 已安装卡片 hover 显示 `Manage` 下拉：
  - Update（有新版本时显示）
  - Uninstall
  - Disable / Enable
- 卸载后卡片恢复 `Install` 按钮，Installed 计数 -1。

### 7.5 插件详情（可选扩展）

点击卡片主体（非 Install 按钮）可打开详情页/浮层：
- 大图标 + 名称 + 版本 + 作者
- 详细描述 + README 预览
- 包含的 Skills / Commands / MCPs 列表
- 用户评价、下载趋势
- Install / Update / Uninstall 主按钮

---

## 8. 发布能力（对应“后续 IDE 的发布发行能力”）

对你自己的 CLI GUI 工具，Marketplace 应提供：

### 8.1 插件包结构

```
my-plugin/
  package.json          # name, version, author, keywords
  qoder-plugin.json     # Qoder 专用 manifest
  skills/
    skill-a.ts
  commands/
    cmd-a.ts
  mcp-servers/
    mcp-a.ts
  assets/
    icon.svg
```

### 8.2 qoder-plugin.json 字段

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "...",
  "icon": "assets/icon.svg",
  "capabilities": ["skill", "command"],
  "entry": "dist/index.js",
  "cli": {
    "command": "my-cli",
    "subcommands": ["deploy", "lint"]
  },
  "permissions": ["filesystem", "network", "shell"]
}
```

### 8.3 发布流程

1. 开发者本地运行 `qoder plugin publish ./my-plugin`。
2. CLI 打包、签名、上传到 Registry。
3. Marketplace 审核/自动上架。
4. 用户可在 Marketplace 搜索、安装、更新。

---

## 9. 响应式规则

- 主区域最小宽度 600px，小于则出现横向滚动。
- 分类导航在 1100px 以下可折叠为顶部横向 chip 栏。
- 卡片网格：≥ 1100px 时 2 列；< 1100px 时 1 列。

---

## 10. 验收标准

- [ ] 左侧 8 个分类 + Installed 全部可点，选中态正确。
- [ ] Featured / Coding 等分区标题与截图一致。
- [ ] 插件卡片布局、图标、作者、下载量与截图 1:1。
- [ ] Install 按钮 hover 显示，点击后有 Loading → Installed 状态变化。
- [ ] 搜索框可实时过滤插件。
- [ ] 切换到 Marketplace 时右侧面板自动隐藏，切回 Quest 时恢复。
- [ ] 从 Marketplace 返回 Quest Home 保留原有输入状态。
- [ ] 发布/安装流程的数据模型与 manifest 字段定义完整。
