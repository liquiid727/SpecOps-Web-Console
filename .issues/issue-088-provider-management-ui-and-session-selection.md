# Build provider management UI and per-session provider selection

## Traceability
- Track: implementation
- Spec ID: CLI-GUI-027
- Source Spec: `.features/CLI-GUI-027-session-model-providers/spec.md`
- Source Version: 1.0
- Requirement IDs: US-003, US-004, US-005
- Depends On: issue-086, issue-087

## Goal
在 Settings > Models 提供供应商管理界面，并在新建会话对话框与 composer 提供按供应商分组的模型选择，使每个会话可独立选定 provider + model。

## Scope
- `SettingsView.tsx`（Models Tab）新增 Providers 区块：
  - 列表展示 `ModelProviderSummary`（name、protocol、configured 状态徽标、models 数）。
  - 新增/编辑表单：name、protocol 下拉、baseUrl、credentialRef（提示"仅存环境变量名，密钥不落盘"）、models 输入；校验错误就地提示。
  - 删除：被运行中会话引用时弹确认警告。
  - 空状态（无供应商引导文案）、加载中、保存失败三种状态。
- 新建会话对话框：可选 provider 选择（仅列出与所选 profile adapter 协议匹配且 configured 的 provider）；选定后模型列表优先展示该 provider 模型。
- composer 模型选择器：按供应商分组展示（无 provider 配置时保持现有平铺形态）；分组标签为 provider name。
- client runtime ports：新增 provider CRUD 调用与会话创建 `providerId` 透传。
- i18n：全部新增文案提供 zh/en 双语。

## Out of Scope
- 服务端 API 与注入逻辑（issue-086 / issue-087）。
- 会话运行中切换 provider（本期 provider 创建时冻结）。
- 主题/样式体系调整。

## Acceptance Criteria
- [ ] Providers 区块完成 CRUD 全流程且校验错误就地展示；空/加载/失败状态可见
- [ ] credentialRef 输入处有"密钥不落盘"提示文案
- [ ] 新建会话可选 provider，仅显示协议匹配且 configured 的项
- [ ] composer 模型选择器按 provider 分组；无 provider 时形态与现状一致（回归）
- [ ] 删除被运行中会话引用的 provider 触发确认警告
- [ ] 新增文案 zh/en 完整；Typecheck/lint 通过
- [ ] Verify in a browser（`run` skill）：两个会话分别选不同 provider 各完成一轮对话

## Inputs
- `cli-gui/client/components/SettingsView.tsx`、`NewSessionDialog.tsx`、composer 相关组件、`client/runtime/` ports、i18n 资源
- issue-086 / issue-087 交付的 API 与注入链路
- CLI-GUI-027 spec §Deliverables / §Test Plan 浏览器验证项

## Outputs
- Providers 管理 UI、会话级选择 UI、i18n 文案、浏览器验证证据

## Owner
implementation-agent（frontend-agent 执行）

## Required Evidence
- 浏览器验证截图（Providers CRUD、双会话不同 provider 对话）
- typecheck/lint 通过记录

## Gate Impact
- blocking
