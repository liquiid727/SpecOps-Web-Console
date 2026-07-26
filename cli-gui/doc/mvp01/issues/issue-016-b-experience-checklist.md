# B 段体验验收核对：三栏壳 / 组织管理 / Runtime Monitor / 键盘可达

## Description
既有实现（三栏壳、会话分组排序、pin/archive/complete、fork、拖拽排序、Runtime Monitor）已覆盖约 60% 的 B 段体验需求。本 Issue 不是重写，而是对照 SPEC 逐项核对差异并补齐缺口，产出核对清单。

## Acceptance Criteria
- [x] 对照 frontend-spec §6–7 逐项核对并记录：三栏壳（Sidebar/中心区/RightPanel）、抽屉、响应式折叠
- [x] 会话组织：分组（workspace/status）、排序（manual/recent）、生命周期过滤、右键菜单、拖拽 + 键盘手动排序——确认 chat 会话在全部组织路径下与 terminal 会话行为一致
- [x] 会话卡片：interactionMode 图标、轮次进行中指示、pinned/archived 态在分组视图正确渲染
- [x] Runtime Monitor / RightPanel：running 数与并发上限（N/limit）展示，接近上限提示（依赖 #11 数据）
- [x] 键盘可达性：新交互（tab 切换、审批按钮、取消按钮、模型选择器）可 Tab 聚焦、Enter/Space 触发、焦点环可见
- [x] i18n 走查：本次 MVP01 全部新增文案 en/zh 无缺 key（控制台无 missing-key 告警）
- [x] 差异清单写入 `cli-gui/doc/mvp01/verification/b-experience-checklist.md`：符合项打勾、缺口列出并在本卡内修复或明确记为超范围

## Dependencies
None（Runtime Monitor 上限展示项依赖 #11 数据可用）

## Type
ui

## Priority
medium

## SPEC Reference
frontend-spec §6–7；architecture-spec §5（B 段范围）；PRD §5

## Notes
- 核对发现两处缺口并在本卡修复：① ⌘J 快捷键缺失（frontend-spec §2 要求 ⌘B/⌘J/⌘N），补为切换右栏 drawer；② Runtime Monitor 无 running/limit 展示与接近上限提示，补齐：`/api/state` 新增可选字段 `maxRunningSessions`（纯增量，api-spec 未定义该数据通道，保守选择不新建端点只附带在现有 state 响应）+ RightPanel Summary 顶部 `N/limit`（role=status），`running >= limit - 1` 时展示提示。
- 接近上限阈值 SPEC 未规定，保守取 limit-1（最后一个名额前告警）。
- i18n 走查新增静态检查脚本 `scripts/check-i18n-keys.cjs`（字典 EN/ZH 对称性 + t() 引用全量比对），本次结果 381/381 对称、0 缺 key。
- PRD §4.5 的 Tool 执行数/文件修改数/Token 消耗聚合未实现：SPEC 分册未定义聚合数据通道，记为超范围转 roadmap（见 verification/b-experience-checklist.md §7）。
- 全部核对结论与证据见 `cli-gui/doc/mvp01/verification/b-experience-checklist.md`；vitest 35 files / 198 tests 全绿，Playwright 10/10 全绿。
