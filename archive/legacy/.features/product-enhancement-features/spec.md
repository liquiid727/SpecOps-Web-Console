# Product Enhancement Features

## ID
SPECOS-FEAT-001

## Status
Draft

## Summary
为 CLI GUI 增设五项特色功能：日报/周报生成器、任务列表管理、RepoWiki 代码索引库、Skill 自动生成系统、以及特色主题 Bugrail。这些功能旨在将 CLI GUI 从单纯的 AI CLI Wrapper 升级为开发者日常工作的核心枢纽。

## Motivation
当前 CLI GUI 仅提供会话管理和 CLI 交互能力。开发者在日常工作中还需要：
- 自动化的工作汇报（日报/周报）
- 任务追踪和优先级管理
- 快速理解和检索代码库结构
- 将重复性操作沉淀为可复用 skill
- 个性化的视觉体验

## Design

### 1. 日报/周报生成器

#### 1.1 功能概述
开启配置后，系统自动追踪用户在各 workspace 的 git commit 记录和 session transcript，生成结构化的日报或周报。

#### 1.2 数据采集
- **Git Commits**: 扫描所有已注册 workspace 的 git log（最近 1 天/7 天）
- **Session Activity**: 统计 session 创建数、轮次数、使用时长
- **File Changes**: 汇总修改的文件列表和变更统计

#### 1.3 生成流程
```
触发生成（手动/定时）
→ 采集各 workspace git log + session stats
→ 组装 prompt（模板 + 数据摘要）
→ 调用当前 profile 的 LLM 生成报告
→ 渲染为结构化卡片 / 支持导出 Markdown
```

#### 1.4 UI 入口
- Sidebar 新增 "Reports" 导航项
- 报告列表页 + 单篇报告详情页
- 一键生成按钮 + 历史报告归档

#### 1.5 配置项
```typescript
interface ReportConfig {
  enabled: boolean;
  autoGenerate: boolean;        // 每日自动生成
  autoGenerateTime: string;     // 自动生成时间 "18:00"
  includeGitCommits: boolean;
  includeSessionStats: boolean;
  reportTemplate: "daily" | "weekly" | "custom";
  customTemplate?: string;      // 自定义 prompt 模板
}
```

### 2. 任务列表（Timeline + Priority）

#### 2.1 功能概述
为开发者提供轻量级任务管理，支持时间轴视图和重要性排序。

#### 2.2 数据模型
```typescript
interface Task {
  id: string;
  title: string;
  description?: string;
  priority: "critical" | "high" | "medium" | "low";
  status: "todo" | "in-progress" | "done" | "cancelled";
  dueDate?: string;
  createdAt: string;
  completedAt?: string;
  tags: string[];
  linkedSessionId?: string;     // 关联会话
  linkedWorkspaceId?: string;   // 关联 workspace
}
```

#### 2.3 视图模式
- **时间轴视图**: 按 dueDate 在水平时间轴上排列，逾期任务红色标记
- **列表视图**: 按 priority + status 排序的传统列表
- **看板视图**（预留）: TODO / In Progress / Done 三列

#### 2.4 持久化
- 存储路径：`~/.specos/tasks.json`
- 与 workspace 关联但全局可见
- 未来可考虑多设备同步

### 3. RepoWiki 代码索引库

#### 3.1 功能概述
自动扫描 workspace 目录结构，生成 meta 索引，提供快速跳转和关键字过滤，替代 AGENTS.md 里的手动目录维护。

#### 3.2 索引结构
```typescript
interface RepoIndex {
  workspaceId: string;
  generatedAt: string;
  tree: DirectoryNode[];
  symbols: SymbolEntry[];       // 导出的 class/function/interface
  dependencies: DependencyMap;  // package.json / requirements.txt 解析
  entryPoints: string[];        // 入口文件识别
}

interface DirectoryNode {
  name: string;
  path: string;
  type: "file" | "directory";
  language?: string;
  size?: number;
  children?: DirectoryNode[];
  summary?: string;             // LLM 生成的单行描述
}
```

#### 3.3 索引生成策略
- workspace 首次打开时全量扫描
- 文件变更时增量更新（监听 git status）
- 可选深度分析：调用 LLM 为关键目录/文件生成 summary

#### 3.4 UI 集成
- Knowledge 视图升级：增加 "Code Index" tab
- 提供树形浏览 + 搜索过滤
- 点击文件快速预览（复用 Inspector Preview）

### 4. Skill-Auto-Generate 系统

#### 4.1 功能概述
分析用户在 session 中的高频操作模式，自动生成项目级别的 skill 文档。

#### 4.2 分析管线
```
Session Transcripts → 模式识别 → Skill 候选提取 → 人工确认 → SKILL.md 生成
```

#### 4.3 模式识别规则
- **重复 prompt**: 相似度 > 80% 的 prompt 出现 3+ 次
- **工具链**: 固定顺序调用的 tool_activity 序列
- **文件操作模式**: 对同类文件的相似修改模式
- **上下文模板**: 每次开启会话时的固定上下文注入

#### 4.4 生成输出
```markdown
# <Skill Name>

## Usage Scenario
<从高频操作中提炼的使用场景>

## Steps
1. <步骤描述>
2. ...

## Notes
- <从失败案例中提炼的注意事项>
```

#### 4.5 存储
- 生成到 `<workspace>/.skills/` 或全局 `~/.specos/skills/`
- 支持 Review & Edit 后确认发布

### 5. 特色主题 Bugrail

#### 5.1 色彩体系
以崩坏：星穹铁道的视觉风格为灵感：
- **主色调**: 星轨紫 (#6B5CE7) + 金色点缀 (#F5A623)
- **背景**: 深空黑渐变 (#0D0D1A → #1A1A2E)
- **强调色**: 量子蓝 (#4FC3F7)、虚数红 (#FF5252)
- **文字**: 星辉白 (#E8E8F0)、次要银灰 (#9E9EB8)

#### 5.2 视觉特征
- 卡片边框：微光渐变效果
- 按钮：星轨流光动画（hover 态）
- Sidebar：星图纹理背景
- 状态指示：使用命途色系（存护绿/毁灭红/巡猎蓝/智识紫）

#### 5.3 实现方式
- 新增 CSS 变量覆盖层：`client/styles/themes/bugrail.css`
- 通过 `data-theme="bugrail"` 属性激活
- Settings 中增加 Theme 选择区域
- localStorage 持久化选择

## Dependencies
- B 层 spec（CLI Structured TUI Adaptation）为前置
- RepoWiki 依赖现有 workspace 文件系统 API（issue-043）
- 日报生成器依赖 git inspection API（issue-044）

## Acceptance Criteria
- [ ] 日报/周报可从 Reports 视图一键生成并导出 Markdown
- [ ] 任务列表支持 CRUD、时间轴视图、优先级排序
- [ ] RepoWiki 自动生成目录索引并提供搜索
- [ ] Skill 候选列表展示高频操作模式
- [ ] Bugrail 主题可在 Settings 中切换并持久化
- [ ] 所有新功能支持中英文 i18n
