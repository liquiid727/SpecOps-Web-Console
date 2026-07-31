# Add Skill-Auto-Generate system

## Description
增设 Skill 自动生成系统。分析用户在 session 中的高频操作模式和重复性工作流，自动生成项目级别的 skill 文档（SKILL.md 格式），减少重复劳动并沉淀最佳实践。

## Design

### Analysis Pipeline
```
Session Transcripts → Pattern Recognition → Skill Candidates → User Review → SKILL.md Generation
```

### Pattern Recognition Rules

1. **重复 Prompt 检测**:
   - 计算 user_message 之间的文本相似度（Jaccard/编辑距离）
   - 相似度 > 80% 的 prompt 出现 3+ 次 → 标记为候选
   - 提取共同模板 + 变量部分

2. **工具链识别**:
   - 连续 tool_activity 事件的固定顺序序列
   - 同一 turnId 内或跨 turn 的重复工具调用模式
   - 例：read_file → edit_file → run_test 的固定三步流

3. **文件操作模式**:
   - 对同类文件（相同扩展名/目录）的相似修改
   - 新建文件的模板模式（如每次新建 .tsx 都有相同 boilerplate）

4. **上下文注入模式**:
   - 每次会话开始的固定 @ mention 或 / command 序列
   - 频繁引用的文件列表

### Candidate Data Model
```typescript
interface SkillCandidate {
  id: string;
  pattern: "repeated-prompt" | "tool-chain" | "file-pattern" | "context-template";
  confidence: number;         // 0-1
  occurrences: number;
  extractedTemplate: string;  // 提取的模板内容
  variables: string[];        // 识别的变量位置
  sourceSessionIds: string[];
  createdAt: string;
  status: "pending" | "approved" | "dismissed";
}
```

### Generation Output
```markdown
# <Skill Name>

## Usage Scenario
<从高频操作中提炼的使用场景描述>

## Steps
1. <步骤 1>
2. <步骤 2>
...

## Template
<可复用的 prompt 模板，变量用 {{variable}} 标记>

## Notes
- <从失败案例中提炼的注意事项>
- <边界条件和限制>
```

### Storage
- 候选存储：`~/.specos/skill-candidates.json`
- 确认后生成到：`<workspace>/.skills/<name>/SKILL.md` 或全局 `~/.specos/skills/`

### API Endpoints
```
GET    /api/skills/candidates           → 候选列表
POST   /api/skills/candidates/analyze   → 触发分析（异步）
POST   /api/skills/candidates/:id/approve → 确认生成
POST   /api/skills/candidates/:id/dismiss → 忽略
GET    /api/skills                       → 已生成的 skill 列表
```

### UI Design
- Knowledge 视图增加 "Skills" tab
- 候选列表：显示 pattern type、confidence、occurrences
- 点击候选 → 预览生成的 SKILL.md 内容
- Approve 按钮确认生成
- Dismiss 按钮忽略（不再提示）

## Acceptance Criteria
- [ ] 可手动触发 transcript 分析
- [ ] 识别重复 prompt 模式（相似度 > 80%，出现 3+ 次）
- [ ] 识别工具链调用模式
- [ ] 候选列表 UI 展示分析结果
- [ ] 支持预览和编辑生成的 skill 内容
- [ ] Approve 后生成 SKILL.md 到指定目录
- [ ] 分析过程异步执行，不阻塞 UI
- [ ] 中英文 i18n 支持

## Affected Files
- `cli-gui/server/` (新增 skills analysis + store)
- `cli-gui/client/components/KnowledgeView.tsx` (新增 Skills tab)
- `cli-gui/client/components/SkillCandidates.tsx` (新建)
- `cli-gui/client/api.ts` (新增 skills API)

## Dependencies
- issue-023 (Append-only transcript repository)

## Type
feature / full-stack

## Priority
low

## SPEC Reference
.features/product-enhancement-features/spec.md §4
