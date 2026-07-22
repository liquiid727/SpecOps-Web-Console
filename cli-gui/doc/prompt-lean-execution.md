# CLI-GUI Qoder UI 改造 — 精简执行提示词

> 面向具备代码读取能力的执行代理（如 Claude Code、Codex）
> 执行前请自行读取仓库中的 CLAUDE.md、AGENTS.md、PRD、SPEC 和 Issues

---

## 背景

将 `cli-gui` 项目从 neobrutalism 风格改造为 Qoder Light Theme 风格，实现初版 UI Demo 和基础功能。

## 执行前必读文件

```
CLAUDE.md                              → 仓库全局约定
cli-gui/AGENTS.md                      → 项目代理约定
cli-gui/doc/todo/qoder-replica-prd.md  → 产品需求
cli-gui/doc/spec-cli-gui-qoder-ui.md   → 技术规格
cli-gui/doc/issues-cli-gui-qoder-ui.md → 10个可执行Issue
cli-gui/doc/prompt-full-implementation.md → 详细实现参考（代码示例）
```

## 设计参考（交互原型）

```
cli-gui/doc/todo/qoder-quest-replica.html   → Qoder Light 交互原型
cli-gui/doc/todo/workbuddy-ide.html         → 深色 IDE 参考
```

## 关键决策（已确认）

| 决策项 | 选择 |
|--------|------|
| 范围 | 完整范围（UI + 基础功能 + Tauri） |
| Tauri 优先级 | 先 Web 后 Tauri |
| 深色主题 | 先 Light 后 Dark |
| 状态管理 | 保持现有 React Context + useState，不引入 Zustand/Redux |
| UI 组件库 | 继续使用自建组件 + Lucide Icons，不引入 Radix/shadcn |
| 多端策略 | Web 优先 → Tauri 桌面 → App 未来 |

## 10 个 Issue（执行顺序）

```
#1  Design Token + Infrastructure      [High]   1-2天
#2  TitleBar + Sidebar                   [High]   2-3天
#3  MainArea (QuestHome + ChatView)      [High]   2-3天
#4  RightPanel                           [High]   2-3天
#5  Theme System Upgrade                 [Medium] 2天
#6  PromptComposer Enhancement           [Medium] 2-3天
#7  View Router                          [Medium] 1-2天
#8  Knowledge/Marketplace/Settings       [Low]    3-4天
#9  Tauri Desktop                        [Low]    3-5天
#10 Multi-platform Validation            [Low]    2-3天
```

依赖链：
```
#1 → #2/#3/#4 → #5 → #6/#7 → #8 → #9 → #10
```

## 执行模式

### 方式一：/to-issues + /loop-it（推荐）

1. 使用 `/to-issues` 将 Issues 导入项目管理工具
2. 使用 `/loop-it` 自动循环执行每个 Issue
3. 每个 Issue 完成后自动运行测试并更新状态

### 方式二：分批次执行

**批次 A（Issues #1-#5）**：Web UI 主骨架
```
实现 Design Token、Qoder Light Theme、TitleBar、Sidebar、
QuestHome、ChatView、RightPanel、Theme System Upgrade。
保持现有 Session/Transcript/Terminal/Files/Git 功能。
```

**批次 B（Issues #6-#8）**：交互与功能页面
```
增强 PromptComposer（Spec/Goal、@ 菜单、/ 命令），
实现视图路由，完成 Knowledge/Marketplace/Settings 页面。
```

**批次 C（Issues #9-#10）**：Tauri 与验证
```
初始化 Tauri v2 工程，实现 PlatformAdapter，
完成多端适配、响应式优化、测试验证。
```

## 架构约束

1. **保持现有技术栈**：React 19 + Vite 6 + TypeScript 5.6 + Tailwind CSS 3.4
2. **复用现有组件**：SessionNavigator、SessionWorkspace、SessionInspector、TranscriptPanel、PromptComposer、Overlay、Select、Feedback
3. **不引入新依赖**：不使用 Zustand、Redux、React Router、Radix、shadcn
4. **向后兼容**：保留 neo 和 classic 主题
5. **Tauri 最小权限**：禁止无约束文件系统读写
6. **未接通后端的功能**：显示 disabled/coming soon，不制造假成功

## 验收标准

### UI Demo MVP
- [ ] Qoder Light Theme 默认启用
- [ ] TitleBar + Sidebar + MainArea + RightPanel 四区布局
- [ ] Quest Home 完整（标题、Start in、输入框、推荐任务、Security Banner）
- [ ] Chat View 消息气泡正确渲染
- [ ] 右侧 Summary/Terminal/Files/Spec/Review Tab 可切换
- [ ] 左侧导航可切换视图
- [ ] 主题切换正常工作
- [ ] 移动端响应式

### 基础功能
- [ ] 输入框 @ 和 / 触发浮层
- [ ] Spec/Goal 开关
- [ ] Agent/Model 选择器
- [ ] 视图路由（home/chat/knowledge/marketplace/settings）
- [ ] Tauri 桌面端可构建运行

### 验证命令
```bash
cd cli-gui
npm test           # 单元测试
npm run build      # 构建验证
npm run test:e2e   # Playwright E2E
npm run tauri:build # Tauri 构建（如果配置了）
```

## 交付要求

1. 更新 Issues 完成状态
2. 补充必要测试
3. 不提交或推送（除非用户要求）
4. 最终报告：完成的 Issues、关键决定、新增/修改文件、测试结果、未完成项
