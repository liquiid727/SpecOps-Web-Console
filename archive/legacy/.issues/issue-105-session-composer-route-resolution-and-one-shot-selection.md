# Add Session and Composer Route resolution controls

## Traceability
- Track: implementation
- Spec ID: CLI-GUI-032
- Source Spec: `.features/CLI-GUI-032-model-routing-gui/spec.md`
- Source Version: 1.0
- Requirement IDs: US-004, US-005, FR-24..FR-27
- Depends On: issue-097, issue-104

## Goal
在 NewSessionDialog 和 PromptComposer 展示 resolved Route/首选模型/来源，并提供 Session binding 与一次性固定 Deployment。

## Scope
- New Session：inherit project / explicit Route、resolve preview、send blocking。
- Composer 单一 Route control：inherit、change Session、fixed once。
- fixed selection 只进入当前 sendMessage request，任何结束后清除。
- fixed invalid/no candidate/secret missing/unsupported Engine 映射修复动作。
- terminal 模式不展示虚假 Route control。

## Out of Scope
- Attempt timeline/confirmation（issue-106）。
- E2E full flow（issue-107）。

## Acceptance Criteria
- [ ] 发送前可见 route、deployment/model 和 source
- [ ] fixed once 不写 AppState/Session，第二次发送恢复继承
- [ ] invalid fixed/no candidate 时 send disabled 且不调用 API
- [ ] Session route change 只影响下一轮，运行中显示 frozen actual model
- [ ] terminal/unsupported Engine 显示明确原因或隐藏控制
- [ ] first/second interaction、focus、i18n component tests 通过

## Inputs
- issue-097 APIs、issue-104 Settings、NewSessionDialog/PromptComposer/ChatView

## Outputs
- Route controls、one-shot request wiring、error/i18n/tests

## Owner
implementation-agent（cli-gui-agent + frontend-agent）

## Required Evidence
- API call payload assertions；second-send regression；focus tests

## Gate Impact
- blocking
