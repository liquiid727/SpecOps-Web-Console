# Issue 084 implementation handoff

已有实现位于 `cli-gui/server/model-catalog.ts`，本轮未修改生产代码。独立验证覆盖 Codex provider 配置、Claude 环境模型、kimi/glm URL 归属、去重、空/坏输入容错；43 个聚焦测试、typecheck、lint、build、ui:check 和 `npx specos check` 均通过。

状态：locally accepted。残余风险是完整回归与打包/真实引擎证据不属于本 issue 的 parser 范围，需由后续聚合 gate 继续确认。
