/**
 * 前端功能开关（console-gaps SPEC §1）。
 * chat 交互模式暂时封闭：所有 chat 入口降级 terminal，UI 保留但不可点击；
 * 服务端 chat 链路（headless / 常驻运行时 / 流式）保留不动，恢复 chat 仅需翻转此开关。
 */
export const CHAT_INTERACTION_ENABLED = false;
