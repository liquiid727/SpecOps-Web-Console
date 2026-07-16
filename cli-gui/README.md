# Product AI OS — CLI GUI MVP01

本目录是独立的本地 CLI 工作空间管理子项目，不依赖现有 `spec-web-ui` 页面。

## Run locally

```bash
npm install
npm run dev
```

- Frontend: http://127.0.0.1:3000
- Local Session Manager: http://127.0.0.1:3001

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
