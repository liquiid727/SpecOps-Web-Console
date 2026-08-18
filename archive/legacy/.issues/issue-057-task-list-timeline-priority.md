# Add task list with timeline and priority sorting

## Description
增设任务列表功能，为开发者提供轻量级任务管理。支持时间轴视图和重要性排序，方便开发人员增设开发计划内容并跟踪执行。

## Design

### Data Model
```typescript
interface Task {
  id: string;
  title: string;
  description?: string;
  priority: "critical" | "high" | "medium" | "low";
  status: "todo" | "in-progress" | "done" | "cancelled";
  dueDate?: string;           // ISO date string
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  tags: string[];
  linkedSessionId?: string;
  linkedWorkspaceId?: string;
}

interface TaskStore {
  version: 1;
  tasks: Task[];
}
```

### Storage
- 路径：`~/.specos/tasks.json`
- 全局可见（跨 workspace）
- 按 workspace 可选过滤

### Views
1. **列表视图**（默认）：按 priority + status 排序
2. **时间轴视图**：水平时间轴，task 按 dueDate 分布
   - 过期任务红色标记
   - 今日任务高亮
   - 无截止日期的任务显示在"未排期"区
3. **看板视图**（预留）：TODO / In Progress / Done

### API Endpoints
```
GET    /api/tasks              → 任务列表（支持 ?status=&priority=&workspace= 过滤）
POST   /api/tasks              → 创建任务
PATCH  /api/tasks/:id          → 更新任务
DELETE /api/tasks/:id          → 删除任务
POST   /api/tasks/:id/complete → 快速完成
```

### UI Design
- Sidebar 新增 "Tasks" 导航项
- Tasks 视图顶部：视图切换（List / Timeline） + 排序控件 + 新建按钮
- 任务卡片：标题 + priority badge + due date + tags
- 内联编辑：点击任务直接编辑
- 快速操作：checkbox 完成、拖拽排序

### Keyboard Shortcuts
| 快捷键 | 动作 |
|--------|------|
| Mod+T | 快速新建任务（聚焦标题输入） |
| Mod+Shift+T | 打开 Tasks 视图 |

## Acceptance Criteria
- [ ] 新增 Tasks 视图，可从 Sidebar 进入
- [ ] 支持任务 CRUD 操作
- [ ] 列表视图支持 priority 和 status 排序
- [ ] 时间轴视图按 dueDate 展示任务分布
- [ ] 过期任务红色高亮
- [ ] 支持按 workspace 过滤
- [ ] 任务持久化到 ~/.specos/tasks.json
- [ ] 支持 Mod+T 快速新建
- [ ] 中英文 i18n 支持

## Affected Files
- `cli-gui/server/` (新增 tasks API + store)
- `cli-gui/client/app/preferences.ts` (新增 AppView)
- `cli-gui/client/components/TasksView.tsx` (新建)
- `cli-gui/client/components/TaskTimeline.tsx` (新建)
- `cli-gui/client/components/Sidebar.tsx` (新增导航项)
- `cli-gui/client/components/MainArea.tsx` (新增视图路由)
- `cli-gui/client/app/shortcuts.ts` (新增快捷键)

## Dependencies
None

## Type
feature / full-stack

## Priority
medium

## SPEC Reference
.features/product-enhancement-features/spec.md §2
