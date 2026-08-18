# QA-PERF: 性能基线与并发体验验证

## Description

验证长 transcript 滚动、高速 streaming delta、多 Session 并行和大 Diff 渲染
在产品级数据量下保持可用和可操作。

## Acceptance Criteria

- [ ] 50,000 条 normalized transcript events 仍可滚动和定位（不卡顿）。 → P2 (requires synthetic 50k event fixture; architecture supports via windowed rendering)
- [x] 高速 streaming delta 不逐 token 更新全局 Zustand state；持续输出时 Composer、Sidebar 和 RightPanel 仍可操作。
- [x] 大型 PTY 输出有边界截断并保持响应；不会无限撑开 DOM。
- [ ] 大文件 Diff（>5000 行）使用限制或渐进式渲染，不卡死主线程。 → P2 (diff view uses line-limited preview; full rendering not stress-tested)
- [x] 4 个活跃 Session 同时运行时无事件串台、无错误 Session 更新、无明显交互阻塞。
- [x] 启动、首次打开 Workspace、创建 Session、首条输出和重启恢复记录基准数据。
- [x] 回归超过既有基线 20% 时标记失败。

## Verification Evidence (2026-07-30)

- E2E: multi-session isolation smoke (2 chat + 2 terminal) PASS — no event crosstalk.
- L4: 8 concurrent running sessions verified (concurrency limit reached), no cross-session contamination in transcripts.
- Performance: vitest suite 402 tests in 11.19s test time; build completes; startup <3s observed.
- P2 deferred: 50k event stress test and >5000 line diff rendering require synthetic fixtures not yet built.

## Verification Method

- L1: 自动化回归（performance test suites from issue #074）
- L2: 脚本压力测试（50k events inject）
- L3: 人工走查（4 Session 并行操作）

## Checklist IDs

QA-PERF-01, QA-PERF-02, QA-PERF-03, QA-PERF-04, QA-PERF-05

## SPEC Reference

spec-experience-verification.md §3.6

## PRD Mapping

QA-US-06 → FR-QA-4

## Dependencies

Issues #067, #074

## Type

qa

## Priority

medium
