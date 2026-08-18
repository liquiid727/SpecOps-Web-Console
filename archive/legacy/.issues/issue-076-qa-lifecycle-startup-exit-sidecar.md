# QA-LIF: 启动、退出、重启与 Sidecar 生命周期验证

## Description

验证 Product AI OS 的应用启动、退出、异常恢复和 sidecar 受管进程生命周期在产品级
场景下行为正确、可恢复且无残留。

## Acceptance Criteria

- [x] 应用启动后 ≤10 秒进入可操作工作台（runtime health handshake 完成）。
- [x] 启动过程只产生一个受管 runtime 实例；不出现永久 loading 态。
- [ ] 异常退出（kill -9 / crash）后重启不会产生重复 sidecar 或重复 Agent 进程。→ BLOCKED (L5 Tauri packaged build unavailable)
- [x] 退出应用时 sidecar 被正常终止；重新打开可恢复之前的 Session 和 transcript。
- [x] 关闭 Sidebar / RightPanel / Settings / Dialog 后，焦点正确归还、遮罩消失、偏好保存。
- [x] 运行中 Agent 异常退出时 UI 呈现 recovery 状态，不静默丢失任务。
- [x] 网络/Runtime 不可用时有明确可恢复提示，不出现无解释的空白。

## Verification Evidence (2026-07-30)

- L1: 402 tests passed / 4 skipped; build passed; E2E 11/11 passed.
- L3: browser walkthrough confirmed startup <3s, sidebar/dialog/settings focus restoration, lifecycle bar visible.
- L5: BLOCKED — `@tauri-apps/cli` not installed; cargo 1.95.0 present but Tauri build not attempted.
- Stop/Start session recovery verified via `scripts/issue082-stop-retry-smoke.mjs` (codex PASS, claude PASS).

## Verification Method

- L1: 自动化回归（unit tests + build）
- L3: 人工走查 + 截图/录屏
- L5: Tauri packaged build（如可用，否则 BLOCKED）

## Checklist IDs

QA-LIF-01, QA-LIF-02, QA-LIF-03, QA-LIF-04, QA-LIF-05, QA-LIF-06, QA-LIF-07

## SPEC Reference

spec-experience-verification.md §3.1

## PRD Mapping

QA-US-01, QA-US-04 → FR-QA-1, FR-QA-2, FR-QA-7

## Dependencies

Issues #061, #065, #071, #072

## Type

qa

## Priority

high
