# Add RepoWiki code index library

## Description
增设 RepoWiki 代码索引库，自动扫描 workspace 目录结构生成 meta 索引，提供快速跳转和关键字过滤。通过结构化索引减少代码 search 的时间，直接提供目录索引给 agent，替代 AGENTS.md 里的手动目录设置。

## Design

### Index Structure
```typescript
interface RepoIndex {
  workspaceId: string;
  workspacePath: string;
  generatedAt: string;
  version: 1;
  tree: DirectoryNode[];
  entryPoints: string[];        // 识别的入口文件
  totalFiles: number;
  totalDirectories: number;
}

interface DirectoryNode {
  name: string;
  path: string;                  // 相对 workspace root
  type: "file" | "directory";
  language?: string;             // 检测的编程语言
  size?: number;                 // 文件字节数
  children?: DirectoryNode[];
  summary?: string;              // 可选 LLM 生成的描述
  exports?: string[];            // 主要导出的 symbol 名称
}
```

### Index Generation Strategy
1. **首次扫描**: workspace 打开时全量递归扫描（忽略 .gitignore 列出的路径）
2. **增量更新**: 通过 git status 变更检测，仅更新变动文件
3. **深度分析**（可选）: 调用 LLM 为关键目录/文件生成 summary

### API Endpoints
```
GET    /api/workspaces/:id/index          → 获取 workspace 的索引
POST   /api/workspaces/:id/index/rebuild  → 重建索引
GET    /api/workspaces/:id/index/search?q= → 搜索索引
```

### Scan Rules
- 忽略 `.gitignore` 中列出的路径
- 忽略 `node_modules/`、`.git/`、`dist/`、`build/`、`__pycache__/` 等公认构建产物
- 文件大小 > 1MB 的标记为 "large" 不读取内容
- 最大递归深度 10 层

### UI Integration
- Knowledge 视图升级：增加 "Code Index" tab
- 树形浏览 + 搜索过滤输入框
- 点击文件节点 → 预览文件内容（复用 Inspector Preview）
- 支持按语言过滤、按最近修改排序
- 索引状态指示（最后更新时间 + rebuild 按钮）

### Agent Integration
- 索引结果可导出为 AGENTS.md 格式的目录树
- 提供 API 给 session 使用，自动注入项目结构上下文

## Acceptance Criteria
- [ ] Workspace 打开时自动生成目录索引
- [ ] 索引遵循 .gitignore 规则排除文件
- [ ] Knowledge 视图新增 "Code Index" tab
- [ ] 支持树形浏览和关键字搜索
- [ ] 点击文件可预览内容
- [ ] 支持手动 rebuild 索引
- [ ] 索引持久化存储（避免每次重启重新扫描）
- [ ] 大型 workspace（>10000 文件）不阻塞 UI
- [ ] 中英文 i18n 支持

## Affected Files
- `cli-gui/server/` (新增 index API + scanner)
- `cli-gui/client/components/KnowledgeView.tsx` (新增 Code Index tab)
- `cli-gui/client/components/CodeIndexTree.tsx` (新建)
- `cli-gui/client/styles/qoder.css` (树形样式)

## Dependencies
- issue-043 (Git-driven file index API)

## Type
feature / full-stack

## Priority
medium

## SPEC Reference
.features/product-enhancement-features/spec.md §3
