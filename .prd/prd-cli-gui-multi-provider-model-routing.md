# PRD: CLI GUI 多供应商模型优先级路由

## Meta

- Status: Accepted
- Approval Date: 2026-08-02
- Approval Evidence: 用户确认采用推荐边界（`1A 2A 3A 4A 5A 6A`），并在 PRD 草案评审后回复 `OK`
- Scope Classification: Epic
- Product Surface: `cli-gui`
- Source Architecture: `cli-gui/doc/mvp02-check-qa/ide-multi-provider-model-routing-architecture.md`
- Foundation PRD: `.prd/prd-mvp02-model-auto-sync-and-session-providers.md`
- Foundation Specs: `CLI-GUI-026 Model Auto-Sync`、`CLI-GUI-027 Session Model Providers`
- Target Phase: MVP02-B Model Management 后续增量；不属于 `mvp02-check-qa`

## 1. Introduction

CLI GUI 已支持从本机 CLI 配置发现模型，并允许用户在会话中选择模型，但当前仍是单一 Profile 下的模型字符串选择。系统尚未把供应商连接、可执行模型、优先级候选与每次真实执行分开管理，也不能在首选模型发生安全可重试的技术故障时自动切换备用模型。

本 PRD 建立第一阶段的多供应商模型路由能力。用户可以配置 CLI 兼容供应商、模型部署和优先级 Route；系统根据全局、项目、Session 和单次运行配置解析最终候选，在没有持久副作用时执行最多一次自动降级，并为每次真实执行保存独立 Attempt。

第一阶段继续通过 Codex CLI、Claude Code CLI 及其兼容供应商执行，不新增供应商 HTTP/SDK API Executor。Provider、Agent Engine 和 Transport 保持正交。

## 2. Goals

- 通过 GUI 完成供应商、模型部署和优先级 Route 配置。
- 在发送前展示最终 Route、首选模型和配置来源。
- 对安全白名单内的技术故障执行最多一次自动降级。
- 分别记录首选执行、自动降级和用户确认重试的 Attempt。
- 使用 OS Keychain 或系统凭证服务保存真实密钥。
- 保持旧 Profile、Session、resume、fork 和模型选择行为兼容。

## 3. User Stories

### US-001: 管理供应商与凭证

**Description:** As a 用户, I want 在 Settings 中管理 CLI 兼容供应商 so that 我可以安全接入不同模型服务。

**Acceptance Criteria:**

- [ ] 支持新增、编辑、启停和删除供应商，字段包含名称、协议、Endpoint、凭证和适用 CLI Engine。
- [ ] 密钥写入 OS Keychain；AppState、项目配置和 API 只保存或返回不透明 `secretRef`。
- [ ] 覆盖空、加载、成功、失败、凭证缺失和 Keychain 不可用状态。
- [ ] 删除被 Route/Session 引用的供应商前显示影响范围并确认。
- [ ] `npm --prefix cli-gui run ui:check` 通过，并在 Google Chrome 中验证中英文和窄屏。

### US-002: 注册模型部署

**Description:** As a 用户, I want 将 Provider、CLI Engine 和模型组成稳定部署 so that Route 引用明确可执行的目标。

**Acceptance Criteria:**

- [ ] 每个 Deployment 具有稳定 ID，并关联 Provider、CLI Profile/Engine 和模型 ID。
- [ ] 展示已验证能力、上下文限制、Session 恢复能力和最近状态；未知信息不得伪装为已支持。
- [ ] 不兼容组合不能保存，自动同步模型也不能绕过 capability 校验。
- [ ] Deployment 停用或删除后，历史 Attempt 仍然可读。
- [ ] `npm --prefix cli-gui run ui:check` 通过，并在 Google Chrome 中验证空、加载、成功和失败状态。

### US-003: 配置优先级 Route

**Description:** As a 用户, I want 配置有序模型候选 so that 首选不可用时可以使用明确的备用模型。

**Acceptance Criteria:**

- [ ] 支持创建、编辑、启停和删除 Route。
- [ ] Route 保存有序 Deployment 候选，并支持键盘和指针排序。
- [ ] 可单独开启技术故障自动降级，第一阶段最多自动切换一次。
- [ ] 被停用、不兼容或缺少凭证的候选显示排除原因。
- [ ] 无可执行候选时阻断运行并提供 Route 修复入口。
- [ ] `npm --prefix cli-gui run ui:check` 通过，并在 Google Chrome 中验证排序、焦点和错误状态。

### US-004: 解析覆盖与来源

**Description:** As a 用户, I want 查看配置继承来源 so that 我能理解本次为什么使用某个模型。

**Acceptance Criteria:**

- [ ] 按“系统默认 < 用户全局 < 项目 < Session < 单次运行”解析。
- [ ] 结果包含最终 Route、候选顺序、固定候选、来源层级和覆盖字段。
- [ ] 项目配置只能引用用户已信任的全局资源，不能包含真实密钥。
- [ ] 删除上层配置后重新解析继承关系，不静默修改下层配置。
- [ ] 单元测试覆盖全部优先级、缺失引用和冲突覆盖。
- [ ] `npm --prefix cli-gui run ui:check` 通过，并在 Google Chrome 中验证来源和恢复继承状态。

### US-005: Session 与单次运行选择

**Description:** As a 用户, I want 为 Session 选择 Route，并临时固定一次候选 so that 我能控制默认策略和当前执行。

**Acceptance Criteria:**

- [ ] 新建 Session 可继承项目 Route 或显式选择其他 Route。
- [ ] Composer 展示解析后的 Route、首选模型和来源。
- [ ] 单次固定候选只影响下一次运行，不修改持久化默认值。
- [ ] 固定候选不可执行时阻断发送，不静默切换。
- [ ] terminal 模式和不支持结构化路由的 Engine 不展示虚假可用控制。
- [ ] `npm --prefix cli-gui run ui:check` 通过，并在 Google Chrome 中验证首次发送、第二次切换、失败恢复、焦点和响应式布局。

### US-006: 安全自动降级

**Description:** As a 用户, I want 在首选模型发生可恢复故障时使用备用模型 so that 临时故障不会直接中断任务。

**Acceptance Criteria:**

- [ ] 只有启动失败、连接失败、超时、限流、供应商暂不可用和模型暂不可用允许自动降级。
- [ ] 配置错误、凭证缺失、认证失败、非法请求、取消、审批拒绝和工具策略拒绝不自动降级。
- [ ] 未产生持久副作用时，可自动创建一个备用 Attempt。
- [ ] 已发生文件写入、命令或外部工具副作用后，必须暂停并由用户确认。
- [ ] 取消 Task 不得启动备用 Attempt；候选耗尽时显示脱敏错误链。
- [ ] 故障注入测试覆盖允许降级、禁止降级、确认后重试、取消和候选耗尽。

### US-007: 保存 Execution Attempt

**Description:** As a 用户, I want 查看任务的所有真实执行尝试 so that 我能理解模型选择和降级过程。

**Acceptance Criteria:**

- [ ] 首选、自动备用和确认重试分别创建独立 Attempt ID。
- [ ] 输入快照、Provider、Deployment、Route、候选和选择原因创建后不可变。
- [ ] Attempt 生命周期按有序事件记录，不覆盖之前失败的 Attempt。
- [ ] 保存时间、错误分类，以及 Engine 可提供的 Token、延迟和成本。
- [ ] resume、fork 和重启后仍可读取 Attempt；记录中不得出现凭证值。
- [ ] 持久化、恢复、fork 和脱敏测试通过。

### US-008: 展示执行与恢复状态

**Description:** As a 用户, I want 在 Chat 中看到实际模型、降级原因和恢复操作 so that 我无需查看日志即可处理失败。

**Acceptance Criteria:**

- [ ] 执行时展示实际 Provider、Deployment 和模型。
- [ ] 降级后同时保留原 Attempt 失败状态和新 Attempt 状态。
- [ ] 副作用确认界面展示已发生操作、备用候选和固定输入快照。
- [ ] 覆盖运行中、成功、失败、取消、等待确认、候选耗尽和恢复后状态。
- [ ] 状态更新不得清空 Transcript、重复结算或触发重复发送。
- [ ] `npm --prefix cli-gui run ui:check` 通过，并在 Google Chrome 中验证中英文、焦点、辅助技术名称和移动端布局。

### US-009: 迁移既有模型选择

**Description:** As an existing 用户, I want 升级后继续使用旧 Session so that 路由能力不会破坏现有工作。

**Acceptance Criteria:**

- [ ] 旧 `profileId`、`launchConfig.model` 和 `activeModel` 迁移为兼容的 legacy Deployment 引用或只读历史值。
- [ ] 未配置 Route 的 Session 沿用当前 Profile/模型执行链路。
- [ ] 旧 resume 和 fork 不因缺少 Route/Attempt 字段失败。
- [ ] 环境变量型 `credentialRef` 可兼容读取，但新凭证默认进入 Keychain。
- [ ] 迁移失败时保留原状态和备份，且不启动 Agent 进程。
- [ ] 升级、重复迁移、损坏输入和未配置 Route 的回归测试通过。

## 4. Functional Requirements

- FR-1: 系统必须将 Provider、Deployment、Route、Task 和 Attempt 建模为独立实体。
- FR-2: 系统必须保持 Provider、Agent Engine 和 Transport 的身份分离。
- FR-3: 系统必须支持 Codex/Claude CLI 及其兼容 Provider。
- FR-4: 系统不得在第一阶段直接调用供应商 API。
- FR-5: 系统必须将真实凭证保存到系统凭证服务。
- FR-6: 系统必须在状态、配置、API、日志和 Transcript 中脱敏凭证。
- FR-7: 系统必须在保存 Provider 前验证 Endpoint、协议和适用 Engine。
- FR-8: 系统必须为每个 Deployment 分配稳定 ID。
- FR-9: 系统必须在 Route 中保存有序的 Deployment 候选。
- FR-10: 系统必须在执行前过滤停用、不兼容、缺少凭证或能力不满足的候选。
- FR-11: 系统必须按“系统默认 < 用户全局 < 项目 < Session < 单次运行”解析配置。
- FR-12: 系统必须返回最终配置及其来源层级。
- FR-13: 单次固定候选必须覆盖 Route 选择，但不得修改默认值。
- FR-14: 系统必须在固定候选不可执行时阻断运行。
- FR-15: 每次真实模型执行必须创建独立 Attempt。
- FR-16: Attempt 必须冻结输入快照和 resolved 配置。
- FR-17: 系统必须区分技术、配置、认证、策略、副作用和取消错误。
- FR-18: 系统只能对白名单技术错误执行自动降级。
- FR-19: 自动降级必须发生在持久副作用之前。
- FR-20: 副作用后重试必须取得用户确认。
- FR-21: 第一阶段最多执行一个自动备用 Attempt。
- FR-22: 候选耗尽必须返回有序、完整、脱敏的错误链。
- FR-23: 用户取消不得触发备用 Attempt。
- FR-24: GUI 必须展示发送前解析结果和执行后实际模型。
- FR-25: GUI 必须覆盖 Provider、Deployment、Route 和 Attempt 的空、加载、成功和失败状态。
- FR-26: 新增 UI 必须支持英文、中文、键盘和窄屏。
- FR-27: 旧 Session 无 Route 时必须保持原有行为。
- FR-28: 新实体必须通过版本化、备份和非破坏性迁移引入。
- FR-29: 被删除或停用配置关联的历史 Attempt 必须保持可读。

## 5. Error Semantics

以下错误名称用于约束产品语义，最终稳定错误码由 Feature Spec 确认：

| Error | Retryable | Automatic fallback | User action |
| --- | --- | --- | --- |
| `PROVIDER_SECRET_MISSING` | 否 | 否 | 配置凭证 |
| `PROVIDER_AUTH_FAILED` | 否 | 否 | 更新凭证 |
| `MODEL_DEPLOYMENT_INCOMPATIBLE` | 否 | 否 | 编辑 Deployment |
| `ROUTE_NO_CANDIDATE` | 否 | 否 | 编辑 Route |
| `PROVIDER_RATE_LIMITED` | 是 | 副作用前允许 | 等待或使用备用 |
| `PROVIDER_UNAVAILABLE` | 是 | 副作用前允许 | 重试或使用备用 |
| `MODEL_TEMPORARILY_UNAVAILABLE` | 是 | 副作用前允许 | 使用备用 |
| `ROUTE_REPLAY_CONFIRMATION_REQUIRED` | 需确认 | 否 | 审查副作用并确认 |
| `ROUTE_FALLBACK_EXHAUSTED` | 视原因 | 否 | 查看错误链 |
| `TASK_CANCELLED` | 否 | 否 | 用户主动重新运行 |

## 6. Non-Goals

- 不做供应商 API/SDK 直连。
- 不做成本、延迟、权重或质量动态路由。
- 不做自动质量评分和质量重试。
- 不做 A/B 并行、结果综合或自动结果选择。
- 不做 Worktree/Patch Sandbox 和自动代码合并。
- 不做 Model Slot、Agent、Skill、Knowledge 或 Permission 配置。
- 不做 Pipeline DSL、独立 Review Pipeline 和远程路由管理。
- 不改写用户的 Codex/Claude 全局配置文件。
- 不根据少量历史数据自动推荐模型或供应商。

## 7. Design Considerations

- Settings 使用 `Providers`、`Models`、`Routes` 三个视图，不扩展为五个独立产品页面。
- Composer 通过一个入口区分“继承 Route”“固定候选一次”和“修改 Session Route”。
- 候选排序必须提供键盘替代操作。
- Transcript 显示实际执行模型和 Attempt 链，不只显示 Route 名称。
- 删除、恢复继承和副作用后重试必须显示影响范围并恢复焦点。
- 所有文案进入 `client/i18n.tsx`，同时提供 `en` 和 `zh`。
- 窄屏沿用现有 Drawer/Dialog，不允许候选名和错误码溢出。

## 8. Technical Considerations

- 现有模型同步和会话 Provider PRD/Specs 是前置基础，不覆盖、不删除。
- 后续 Feature Spec 必须更新 `design/cli-gui-platform-design.md` 的应用路由边界。
- 旧模型字符串不能直接作为 Deployment ID。
- Route Resolver 应保持可独立测试，不依赖 UI 或执行进程。
- AgentBackend 内部 transport fallback 与模型 Route fallback 必须分别归属。
- 无法证明“未产生副作用”时，默认要求用户确认。
- 项目配置是不受信任输入，只能引用用户批准的全局资源。
- Token、成本和能力信息不可用时显示未知，不生成伪数据。

## 9. Success Metrics

- 用户可在 5 分钟内配置一个 Provider、两个 Deployment 和一个 Route。
- 发送前一次展开操作内可查看 Route、首选模型和来源。
- 允许降级的故障场景 100% 生成两个独立 Attempt。
- 认证、配置、取消和副作用场景 100% 不自动启动备用 Attempt。
- AppState、项目配置、API fixture、日志和 Transcript 中真实凭证泄漏数量为 0。
- 旧 Session、resume、fork 和无 Route 回归通过率为 100%。
- 所有新增 UI 通过中英文、桌面和窄屏浏览器验收。

## 10. Open Questions

- Linux 或无系统凭证服务环境是否允许环境变量兼容模式？
- 项目 Route 覆盖文件的名称、位置和首次信任流程是什么？
- Route 最大候选数、默认超时和健康状态有效期是多少？
- “模型不存在”属于可降级临时故障还是部署配置错误？
- Provider 健康状态是否跨应用重启持久化？

## 11. Recommended Feature Split

1. Secret Store 与 Provider Connection。
2. Model Deployment、兼容性和迁移。
3. Priority Route、配置解析与来源追踪。
4. Execution Task/Attempt 与安全自动降级。
5. Settings、Session、Composer 和 Attempt GUI。

每个 Feature Spec 独立审批并生成版本绑定的 Test Spec。A/B、Model Slot、质量路由和 Pipeline 另立后续 PRD。
