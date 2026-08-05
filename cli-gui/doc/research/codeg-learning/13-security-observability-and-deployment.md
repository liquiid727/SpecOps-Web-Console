# 13｜安全、可观测性与部署：Agent 平台的控制面

## 本篇目标

Codeg 是 local-first，但 Agent 产品的安全边界不只取决于“数据是否上传到 Codeg
服务器”。Agent CLI、模型供应商、MCP、Git remote、聊天平台、Skill 脚本和外部
工具都可能接触数据。

因此需要同时学习：秘密存储、Web Service 鉴权、权限交互、命令执行、日志脱敏、备份、
Server/Docker 部署和多 binary 发布。

## 1. 画信任边界

```text
User / UI
  │ permission / question / auth
  ▼
Codeg Core
  ├── SQLite / transcript / logs
  ├── keyring / token store
  ├── file / git / terminal capability
  ├── ACP Agent child process
  │     ├── model provider network
  │     └── MCP servers / Skills
  ├── Chat Channel platform
  └── Browser / mobile client via Web Service
```

每条数据都要问：

- 谁能读取？
- 谁能修改？
- 是否会进入日志、transcript、backup 或远程 channel？
- 是否需要用户确认？
- 是否可以撤销、轮换、过期？

## 2. Secret storage 不是一个统一答案

Codeg 对不同部署选择不同秘密边界：

| 场景 | 存储 | 学习重点 |
| --- | --- | --- |
| Desktop | OS keyring | 宿主用户、keyring service、备份不自动包含 |
| Server | `CODEG_DATA_DIR/tokens.json` 等文件 | volume 权限、owner、文件备份和轮换 |
| Agent native config | vendor-specific config/env | Codeg 不一定能控制格式或 at-rest 加密 |
| MCP remote | URL/headers | header 注入、日志、TLS、配置同步 |
| Chat channel | bot token/webhook secret | inbound authenticity、rotation、scope |
| Backup | manifest + optional passphrase encryption | 是否包含 secrets、恢复后是否重新登录 |

源码入口：

- [`keyring_store.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/keyring_store.rs)
- [`web/auth.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/web/auth.rs)
- [`commands/backup/manifest.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/commands/backup/manifest.rs)
- [`commands/backup/crypto.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/commands/backup/crypto.rs)

官方 Privacy & Security 页面适合和源码交叉阅读：[Privacy & Security](https://docs.codeg.app/reference/privacy)

## 3. Authentication 与 Authorization 要分开

Web Service 的 Bearer token 或 WebSocket subprotocol 解决的是“这个客户端能否连接”。
Permission UI 解决的是“当前 Agent 是否允许执行某个副作用”。两者不能互相替代。

```text
Authentication
  -> user/client may attach to Codeg

Authorization / permission
  -> this Agent turn may run this command / write this file / call this tool
```

还要区分：

- Web Service token 的轮换和撤销；
- Agent provider API key 的存储和传递；
- MCP server token 的配置范围；
- Chat channel token 的 sender/channel 绑定；
- workspace/file scope 与用户账号 scope。

## 4. Permission 是产品安全控制面

Codeg 官方 Workspace 指南强调，Agent 的行为模式和中途 permission prompt 共同决定
执行自由度；不存在一个简单的“全局自动批准”开关。[Workspace](https://docs.codeg.app/guide/workspace)

对一个 permission request，建议记录：

```text
request_id
session_id / connection_id
operation / command / target path
risk level / requested scope
created_at / expires_at
user decision / actor
decision scope: turn / session / user / project
```

不能只在 UI 显示“Allow / Reject”，然后丢掉 request identity。断线、窗口关闭、移动
端确认、重复点击和 Agent 退出都需要依靠这个 identity 处理。

## 5. 路径、命令和供应链

### 路径

- workspace root 与 linked folder 的允许范围；
- symlink/junction 是否跨出根目录；
- archive 内部启动路径是否含绝对路径或 `..`；
- restore/archive 是否能覆盖现有文件；
- Agent reported path 是否只作为展示，不能直接作为授权依据。

### 命令

- `program`、`args`、`env` 结构化保存；
- 不把用户配置拼成 shell string；
- version probe、MCP command、Skill script、Automation 都视为可执行代码；
- stdout/stderr 分离，日志不得回显 token；
- PATH fallback 需要记录 resolved executable 和版本。

### 供应链

- npx/uvx package 版本和 registry；
- bundled binary 的平台、签名/hash、升级回滚；
- Skill pack 的来源、共享 store 写权限；
- OfficeCLI/Python/uv 等外部运行时；
- MCP remote URL 与 TLS/headers。

路径校验和 sha256 能降低一部分风险，但不等价于沙箱。最终执行仍发生在 Agent 或
外部进程边界。

## 6. 可观测性：让一条请求可追踪

建议所有 Agent 操作至少关联：

```text
workspace_id
folder_id
conversation_id
connection_id
session_id
turn_id
task_id
request_id
event_seq
run_seq
```

日志分层：

| level | 内容 | 例子 |
| --- | --- | --- |
| info | 生命周期 | connection started/closed、task completed |
| debug | 调试上下文 | preflight resolution、cache hit、replay range |
| warn | 可恢复异常 | reconnect、gap、unknown event、timeout |
| error | 终止或安全失败 | auth failure、bad archive、protocol failure |

日志要与用户 transcript 分开：

- transcript 服务用户历史和恢复；
- runtime log 服务诊断；
- audit record 服务权限、token、远程访问和合规；
- 三者的保留时间、脱敏规则和访问者可能不同。

源码入口：

- [`logging/hub.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/logging/hub.rs)
- [`logging/throttle.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/logging/throttle.rs)
- [`logging/init.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/logging/init.rs)
- [`web/handlers/logging.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/web/handlers/logging.rs)

## 7. 部署模式改变依赖和风险

```text
Desktop
  Tauri + static Next + codeg_lib + local Agent processes

Server
  codeg-server + static Next + codeg-mcp sibling + HTTP/WS auth

Docker
  supervisor/PID 1 + worker + persistent /data + reverse proxy/TLS

Browser/mobile client
  no local Agent process; all file/DB/Agent capability stays on host
```

官方 Development 文档把 Desktop、Server、MCP 的构建和 feature matrix 分开；Server
部署还要求静态前端产物与 headless binary 共同存在。[Development](https://docs.codeg.app/reference/development)

发布时应验证：

- `codeg` 默认 Tauri feature；
- `codeg-server --no-default-features`；
- `codeg-mcp --no-default-features`；
- Next static export 的资源路径；
- sidecar sibling/`CODEG_MCP_BIN`；
- Docker `/data` 持久化和 upgrade rollback；
- reverse proxy、HTTPS、token、WebSocket；
- Linux/Windows/macOS 的 binary 和路径差异。

## 8. CI 与发布矩阵

```text
source / dependencies
  -> frontend lint/test/build
  -> Rust default check/test/clippy
  -> Rust headless server check/test
  -> MCP companion check/test
  -> parser snapshot review
  -> platform package / sidecar
  -> smoke: startup, auth, session, cancel, shutdown
```

不能只在开发者机器上执行默认 Desktop build；headless 和 companion 的 feature path
必须在 CI 中显式构建。否则一处 Tauri-only import 可能直到 Server 发布才发现。

## 9. 安全/运维实验

### 实验 A：Web auth matrix

隔离启动 server，测试无 token、错误 Bearer、正确 Bearer、WebSocket subprotocol、token
轮换和旧 token 撤销。

### 实验 B：日志脱敏

用 fake Agent 生成 Authorization header、MCP token、文件路径和 permission error，检查
runtime log、transcript、channel reply、backup manifest 是否泄露。

### 实验 C：配置/供应链

测试 custom Agent 的 `npx`、`uvx`、binary hash、archive path traversal、version probe
和 PATH 冲突；所有失败必须进入 actionable preflight，而不是 child 启动后才报错。

### 实验 D：部署 smoke

对 Desktop-like、headless Server、MCP companion、Docker supervisor 分别执行 startup、
one prompt、cancel、shutdown 和 restart。

本篇验收：

- 能画出 Codeg 的 desktop/server/agent/MCP/channel trust zones；
- 能区分 authentication、authorization、permission 和 capability；
- 能设计不泄露 token 的 logs/transcript/audit/backup 规则；
- 能写出 Desktop/Server/MCP/Docker 的构建与 smoke matrix；
- 能解释 local-first 不等于没有外部数据流。
