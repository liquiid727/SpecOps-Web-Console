# Add daily/weekly report generator

## Description
增设日报/周报生成器功能。开启配置后，系统自动载入各 workspace 的 git commit 修改痕迹和 session 活动数据，调用 LLM 生成结构化的日报或周报。

## Design

### Data Sources
1. **Git Commits**: 扫描所有已注册 workspace 的 `git log --since` 记录
2. **Session Activity**: 从 transcript store 统计 session 创建数、轮次数、使用时长
3. **File Changes**: 汇总修改文件列表和 additions/deletions 统计

### Report Generation Flow
```
用户点击"生成报告" (或定时触发)
→ 后端 API: POST /api/reports/generate { type: "daily"|"weekly", workspaceIds?: string[] }
→ 服务端采集各 workspace git log + session stats
→ 组装 prompt (模板 + 数据摘要)
→ 调用当前 profile 的 CLI 生成报告内容
→ 存储报告到 ~/.specos/reports/<date>.md
→ 返回 { id, content, generatedAt }
```

### API Endpoints
```
POST   /api/reports/generate    → 生成新报告
GET    /api/reports             → 报告列表
GET    /api/reports/:id         → 单篇报告详情
DELETE /api/reports/:id         → 删除报告
```

### UI Design
- Sidebar 新增 "Reports" 导航项（AppView 新增 "reports"）
- Reports 视图：报告列表 + 详情预览
- 一键生成按钮 + 类型选择（日报/周报）
- 报告渲染为 Markdown + 支持复制/导出
- Settings 中可配置自动生成时间和范围

### Configuration
```typescript
interface ReportConfig {
  enabled: boolean;
  autoGenerate: boolean;
  autoGenerateTime: string;      // "18:00"
  includeGitCommits: boolean;
  includeSessionStats: boolean;
  reportTemplate: "daily" | "weekly" | "custom";
  customTemplate?: string;
}
```

## Acceptance Criteria
- [ ] 新增 Reports 视图，可从 Sidebar 进入
- [ ] 支持一键生成日报和周报
- [ ] 报告内容包含 git commits 摘要和 session 活动统计
- [ ] 报告支持 Markdown 渲染和一键复制
- [ ] 支持导出为 .md 文件
- [ ] Settings 中可配置报告偏好
- [ ] 报告持久化存储，支持历史查看
- [ ] 中英文 i18n 支持

## Affected Files
- `cli-gui/server/` (新增 reports API)
- `cli-gui/client/app/preferences.ts` (新增 AppView)
- `cli-gui/client/components/ReportsView.tsx` (新建)
- `cli-gui/client/components/Sidebar.tsx` (新增导航项)
- `cli-gui/client/components/MainArea.tsx` (新增视图路由)
- `cli-gui/client/styles/qoder.css` (Reports 样式)

## Dependencies
- issue-044 (Git inspection API)

## Type
feature / full-stack

## Priority
medium

## SPEC Reference
.features/product-enhancement-features/spec.md §1
