# Quest Home 一次提交创建流：Start in 下拉 → 创建 + 首轮直达

## Description
升级 Quest Home / NewSessionDialog 为一次提交完成「选工作区 + 选 profile + 输入首条消息 → 创建会话 → start-and-send 首轮」的创建流（B 段，Qoder 式体验）。含服务端降级的前端解释。

## Acceptance Criteria
- [x] Quest Home 输入框 + Start in 工作区下拉（含最近使用排序）+ profile 选择，单次提交完成创建并进入会话视图（frontend-spec §2、§6）
- [x] 创建请求携带 `interactionMode`（capabilities 支持时默认 chat）；首条消息在创建成功后自动作为第一轮提交（复用 #8 start-and-send）
- [x] 响应 `interactionModeDowngraded: true` 时，进入会话前显示一次性说明（该 CLI 不支持对话模式，已切换为终端模式），i18n 双语
- [x] NewSessionDialog 增加模式选择（chat/terminal），capability 不支持 chat 时选项禁用并说明原因
- [x] 四态：工作区列表为空（引导添加）/ 创建中 loading / 成功跳转 / 失败（错误码文案 + 可重试，输入不丢失）
- [x] 创建失败时首条消息保留在输入框（不丢用户输入）
- [x] Playwright：一次提交创建流 happy path + 降级路径

## Dependencies
Issue #6

## Type
frontend

## Priority
medium

## SPEC Reference
frontend-spec §2、§6；api-spec §2.6；test-spec §3.7

## Notes
- Quest Home 提交前不额外拉取 capabilities：恒发送 `interactionMode: "chat"`，降级判定以服务端响应为准（frontend-spec §6 保守解释）；`interactionModeDowngraded: true` 时进入会话前 feedback.warning 一次性说明（i18n key `sessionDowngradedToTerminal`，EN/ZH）。
- SPEC 未规定一次提交创建流的会话命名：取首条消息压缩空白后的前 48 字符，为空则回退 `newCliSession` 文案。
- AC「创建失败输入不丢失」仅约束创建失败场景：createSession 失败时 Promise reject，PromptComposer 保留输入并提示错误码文案；创建成功但首轮 sendMessage 失败时仍进入会话并 toast 错误（可在会话内重发），不算创建失败。
- 推荐任务卡直接走同一创建流（taskBusy 防重复提交）；工作区或 profile 任一缺失时 Quest Home 显示 setupFirst 空态引导（打开设置）。
- NewSessionDialog capabilities 加载失败时模式保持可选、默认 chat（服务端仍会兜底降级）；仅在明确 `supportsHeadlessTurns === false` 时锁定为 terminal 并展示说明。`loadCapabilities` 作为可注入 prop 便于单测。
- 最近使用排序按 `lastOpenedAt`（缺省回退 `createdAt`）降序；Recent workspaces 卡片点击语义从「打开新建对话框」改为「选中该工作区」以配合一次提交流。
