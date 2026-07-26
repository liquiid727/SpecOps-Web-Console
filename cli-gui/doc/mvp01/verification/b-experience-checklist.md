# MVP01-B 段体验验收核对清单（issue-016）

- 日期：2026-07-26
- 分支：feature-cli-gui
- 核对对象：frontend-spec §6–7、architecture-spec §5、PRD §4.5/§5
- 验证手段：代码走查 + vitest 全量（35 files / 198 tests 全绿）+ `node scripts/check-i18n-keys.cjs`

## 1. 三栏壳 / 抽屉 / 响应式折叠（frontend-spec §2、PRD §5）

- [x] 三栏布局：`TitleBar` + `Sidebar`（session navigator）+ `MainArea`（Quest Home ↔ Chat View 双舞台）+ `RightPanel`（`client/app/App.tsx`）
- [x] 抽屉折叠：`navigatorOpen` / `inspectorOpen` 偏好持久化；drawer backdrop 点击关闭（`drawer-backdrop` 按钮，含 aria-label）
- [x] 响应式：`styles/responsive.css` 断点折叠；移动端 drawer 焦点圈定 `useMobileDrawerFocus`
- [x] 快捷键：⌘B（左栏）/ ⌘N（新建）/ ⌘1..5（视图切换）/ ⌘⇧I（右栏）已存在；**⌘J 原缺失，本卡补齐**（⌘J 切换右栏 Runtime Monitor drawer，App.tsx）

## 2. 会话组织：chat 与 terminal 行为一致（frontend-spec §6）

- [x] 分组（project/time/recent/manual）、过滤（active/completed/archived）、排序（manual/recent）：`client/app/session-selectors.ts` 全程不读 `interactionMode`，chat 会话与 terminal 会话在全部组织路径下行为一致
- [x] 右键菜单：rename / pin / complete / archive / fork / delete（`Sidebar.tsx`，Menu 组件带焦点归还）
- [x] 拖拽排序：manual 分组下 `draggable` + drop 重排（`reorderGroup`）
- [x] 键盘排序：manual 分组下每行 ↑/↓ 按钮（aria-label=Move up/down，禁用态处理，aria-live 播报 `movedSessionUp/Down`）

## 3. 会话卡片（frontend-spec §6）

- [x] 模式徽标：`mode-badge chat|terminal`（缺省按 terminal 渲染，文案 i18n `sessionModeChat/Terminal`）
- [x] 轮次进行中指示：`activeTurns` → `turnInProgress` 文案（chat 轮次由 turn-status 事件驱动）
- [x] 运行状态：`quest-dot` 四态（starting/running/stopped/error）+ 文字标签（状态不只靠颜色）
- [x] pinned：星标图标；archived/completed 经过滤视图正确渲染（selectSessions 按 organizationStatus）

## 4. Runtime Monitor / RightPanel（PRD §4.5，issue-016 AC4）

- [x] 会话详情：Agent/Profile、Model、Project（workspace 路径）、运行状态 + 组织状态（`DetailsTab`）
- [x] **running/limit 展示（本卡补齐）**：`/api/state` 新增 `maxRunningSessions`（服务端 D-6 已解析值，纯增量字段）；RightPanel Summary 顶部 `runtime-monitor-row` 展示 `N/limit`（role=status）
- [x] **接近上限提示（本卡补齐）**：`running >= limit - 1` 时展示 `nearConcurrencyLimit` 提示（EN/ZH）；单测覆盖（RightPanel.test.tsx）
- [x] 并发上限拒绝 toast：429 `SESSION_CONCURRENCY_LIMIT` → `sessionConcurrencyLimit` 文案插值 running/limit（issue-011 已交付，frontend-spec §6）
- 超范围记录：Tool 执行数量 / 文件修改数量 / Token 消耗聚合（PRD §4.5 列出，SPEC 分册未定义聚合数据通道）——未实现，转入 roadmap 候选

## 5. 键盘可达性（frontend-spec §7）

- [x] 焦点环全局可见：`base.css` `:focus-visible` box-shadow（button/input/select/textarea/[tabindex]）
- [x] 新增控件均为原生 button/Select：Transcript/Terminal tab 切换（Tabs role=tablist）、审批 allow/deny 按钮、取消轮次按钮、权限/模式/模型选择器（custom Select trigger 为 button + role=listbox/option）→ Tab 聚焦 + Enter/Space 激活
- [x] 审批气泡进入不抢焦点（无 autofocus；issue-013 验收）
- [x] 模态焦点圈定与归还：ActionDialog / Menu / NewSessionDialog 现有模式复用
- [x] reduced-motion：`base.css`/`responsive.css` `prefers-reduced-motion: reduce` 关闭过渡
- [x] readonly：composer/取消/审批/创建/组织操作全部禁用（Sidebar menu disabled、App runAction 拦截）

## 6. i18n 走查（frontend-spec §7）

- [x] 静态检查脚本 `scripts/check-i18n-keys.cjs`：字典 381 EN / 381 ZH 完全对称；代码引用 257 个 key 全部存在；0 缺失（本卡新增脚本，纳入验收工具）
- [x] MVP01 新增文案（chat 轮次、审批、并发上限、交互模式、Runtime Monitor）EN/ZH 同批交付

## 7. 差异清单汇总

| # | 差异 | 处置 |
|---|---|---|
| 1 | ⌘J 快捷键缺失（frontend-spec §2 要求 ⌘B/⌘J/⌘N） | 本卡修复：⌘J 切换右栏 drawer |
| 2 | Runtime Monitor 无 running/limit 展示与接近上限提示 | 本卡修复：`/api/state.maxRunningSessions`（增量字段）+ RightPanel Summary 展示 + 单测 |
| 3 | PRD §4.5 Tool 执行数 / 文件修改数 / Token 消耗聚合 | 超范围：SPEC 分册未定义聚合通道，转 roadmap |
| 4 | Sidebar Chats 区（近 5 会话）无模式徽标 | 保持现状：Quests 主列表已含徽标，Chats 为快捷入口非组织视图 |
