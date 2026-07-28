# Product AI OS — CLI GUI MVP01

本目录是独立的本地 CLI 工作空间管理子项目，不依赖现有 `spec-web-ui` 页面。

## Run locally

```bash
npm install
npm run dev
```

开发监督器默认优先使用 GUI `3000`、Session Manager API `3001`。如果端口已被占用，会从各自的首选端口开始递增选择可用端口，并保证 GUI 与 API 不重复。

也可以通过 `SPECOS_GUI_PORT`、`SPECOS_API_PORT`（或后端已有的 `PORT`）设置首选端口；冲突时仍会自动递增。启动完成后请使用最终 banner 中打印的 GUI URL，不要假设地址一定是 `http://127.0.0.1:3000`。浏览器仍通过 GUI 同源的 `/api` 和 `/ws` 路径访问后端。

生产构建和启动：

```bash
npm run build
npm start
```

## MVP capabilities

- Workspace 本地目录登记和校验。
- Codex、Claude 及自定义 CLI Profile。
- Session 创建、停止、恢复、重命名和删除。
- 每个 Session 独立 PTY。
- xterm.js 交互式 Terminal、Ctrl+C、ANSI 输出和 resize。
- 本地 JSON 元数据持久化；服务重启后运行中的 Session 标记为 stopped。
- `SPECOS_RUNTIME_MODE=readonly` 禁止本地写操作和 CLI 启动。

Session 配置保存在 `data/state.json`，该运行时文件已加入 `.gitignore`。

## Architecture

```text
React + xterm.js
        │ HTTP / WebSocket
Local Session Manager
        │
     node-pty
        │
  codex / claude / custom CLI
```

后续 Tauri 桌面版本可以复用 Session Manager 和前端工作台。
