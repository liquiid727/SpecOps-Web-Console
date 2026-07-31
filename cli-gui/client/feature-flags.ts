/**
 * 前端功能开关（QA 调节）。
 * CHAT_ENABLED：Chat 结构化通道（issue-062 AgentBackend + issue-066 Chat-first）已开启——
 * 支持 headless 的 Profile 默认创建 chat 会话，不支持时服务端显式降级 terminal 并提示原因。
 * 关闭则回到 console-gaps SPEC §1 的全量 terminal 行为（存量 chat 会话仍可查看）。
 */
export const CHAT_ENABLED = true;
