

# Product AI OS - MVP 01 Specification

## 1. 项目概述

### 1.1 项目名称

Product AI OS（暂定）

### 1.2 MVP 版本

MVP 01 - AI CLI Workspace Launcher

### 1.3 项目定位

Product AI OS MVP 01 是一个轻量级本地 AI CLI 工作空间管理工具。

目标：

> 用 GUI 管理本地 AI Coding CLI，让用户无需手动打开多个终端、切换目录、输入 CLI 命令，即可快速创建、管理和恢复 Codex CLI、Claude CLI 等 AI Agent 会话。

第一阶段不重新实现 Agent 能力，而是作为官方 CLI 的管理层。

支持：

* Codex CLI
* Claude Code CLI
* Gemini CLI（预留）
* 其他本地 CLI 工具（可扩展）

---

# 2. MVP 目标

## 2.1 核心目标

实现：

* 桌面 GUI
* 本地 Terminal
* CLI Profile 管理
* 快速创建 CLI Session
* Session 名称自定义
* 多 Session 管理
* Session 持久化

用户体验：

从：

```
打开 Terminal

cd project

运行 claude

打开另一个 Terminal

cd project

运行 codex

自己记窗口作用
```

变成：

```
打开 Product AI OS

选择项目

点击:

+ New Session


选择:

Backend Development
    Codex CLI

Code Review
    Claude CLI


创建即可使用
```

---

# 3. MVP 非目标

本版本明确不实现：

## 不实现 Agent 系统

暂不包含：

* Leader Agent
* Multi Agent
* Agent 调度
* Agent Workflow

## 不实现 Memory

暂不包含：

* 长期记忆
* 项目知识库
* RAG
* Context 自动注入

## 不实现代码编辑器

不替代：

* VS Code
* Cursor
* JetBrains

## 不实现模型管理

不负责：

* API Key 管理
* Model Router
* Provider Gateway

核心原则：

> CLI 能力保持官方原生，Product AI OS 只负责管理和组织。

---

# 4. 产品功能设计

# 4.1 Workspace

Workspace 代表一个开发项目。

示例：

```
Workspace

Payment Platform

path:

/Users/alex/payment
```

Workspace 保存：

| 字段         | 说明   |
| ---------- | ---- |
| name       | 项目名称 |
| path       | 项目目录 |
| created_at | 创建时间 |

---

# 4.2 CLI Profile

CLI Profile 是启动配置。

示例：

```
Codex CLI

command:

codex


Claude CLI

command:

claude
```

数据：

```json
{
 "id":"codex-default",
 "name":"Codex CLI",
 "command":"codex"
}
```

支持扩展：

```json
{
"name":"Review Claude",

"command":"claude",

"args":[
 "--model",
 "opus"
]
}
```

---

# 4.3 Session

Session 是一次 CLI 工作实例。

例如：

```
Session:

支付接口重构


CLI:

Codex


Workspace:

Payment Platform


Status:

Running
```

Session 属性：

| 字段          | 说明      |
| ----------- | ------- |
| name        | 用户自定义名称 |
| cli_profile | 使用的 CLI |
| workspace   | 所在项目    |
| status      | 运行状态    |
| created_at  | 创建时间    |
| last_active | 最后使用时间  |

---

# 4.4 Terminal

每个 Session 对应一个 Terminal。

结构：

```
Session

    |

Terminal Instance

    |

PTY Process

    |

codex / claude
```

支持：

* 输入
* 输出
* Ctrl+C
* resize
* 多 Tab

---

# 5. 用户流程

## 5.1 创建 Session

流程：

```
用户点击 New Session

        |

填写:

名称

选择 CLI

选择 Workspace


        |

创建


        |

启动 Terminal


        |

执行:

codex

或者

claude
```

---

## 5.2 Session 列表

首页：

```
Projects


Payment Platform


Sessions:


🟢 Backend API Development

    Codex


🟢 Code Review

    Claude


🟡 Migration Debug

    Codex
```

---

## 5.3 恢复 Session

用户重新打开：

```
Product AI OS


选择:

Backend API Development


Resume


打开 Terminal
```

---

# 6. 系统架构

整体：

```
┌───────────────────────┐
│ React UI               │
│                       │
│ Workspace              │
│ Session List           │
│ Terminal View          │
└───────────┬───────────┘
            |
            |
┌───────────▼───────────┐
│ Tauri Backend          │
│                       │
│ Session Manager        │
│ Profile Manager        │
│ Storage                │
│ PTY Manager            │
└───────────┬───────────┘
            |
            |
        Local OS


            |

      ┌───────────┐
      │ codex     │
      │ claude    │
      │ gemini    │
      └───────────┘
```

---

# 7. 技术方案

## 7.1 Desktop Framework

选择：

```
Tauri 2
```

原因：

* 轻量
* 原生能力强
* 支持系统 API
* 适合长期演进

---

## 7.2 Frontend

技术：

```
React

TypeScript

TailwindCSS
```

负责：

* UI
* Session 管理界面
* Terminal 展示

---

## 7.3 Terminal

采用：

```
xterm.js
```

能力：

* terminal rendering
* keyboard input
* resize
* ANSI color

插件：

```
xterm-addon-fit

xterm-addon-search

xterm-addon-webgl
```

---

## 7.4 Backend

Tauri Rust。

负责：

* PTY
* CLI Process
* 文件系统
* SQLite

目录：

```
src-tauri

├── terminal

│    ├── pty.rs

│    └── process.rs


├── session

│    └── manager.rs


├── storage

│    └── sqlite.rs


└── commands.rs
```

---

# 8. 数据模型

## workspace

```sql
CREATE TABLE workspace (

id TEXT PRIMARY KEY,

name TEXT,

path TEXT,

created_at DATETIME

);
```

---

## cli_profile

```sql
CREATE TABLE cli_profile (

id TEXT PRIMARY KEY,

name TEXT,

command TEXT,

args TEXT

);
```

---

## session

```sql
CREATE TABLE session (

id TEXT PRIMARY KEY,

workspace_id TEXT,

profile_id TEXT,

name TEXT,

status TEXT,

created_at DATETIME,

last_active DATETIME

);
```

---

# 9. MVP UI

## 主界面

```
------------------------------------------------

Workspace


Payment Platform


Sessions


+ Backend Development

  Codex


+ Code Review

  Claude


------------------------------------------------


Terminal


$ codex


------------------------------------------------
```

---

# 10. MVP 开发任务拆解

## Phase 1 - Desktop Skeleton

目标：

完成：

* Tauri
* React
* 页面框架

---

## Phase 2 - Terminal

目标：

完成：

* xterm.js
* PTY
* Shell

验收：

可以执行：

```
ls

pwd

git status
```

---

## Phase 3 - CLI Launcher

支持：

```
codex

claude
```

验收：

点击按钮：

自动启动 CLI。

---

## Phase 4 - Session Management

实现：

* 创建 Session
* 修改名称
* 删除 Session
* 保存 Session

---

## Phase 5 - Workspace

实现：

* 项目目录管理
* Session 绑定项目

---

# 11. 后续演进路线

## MVP02

Agent Profile

增加：

```
Backend Agent

Frontend Agent

Test Agent

Review Agent
```

Agent 包含：

* CLI
* Prompt
* Skill

---

## MVP03

Task System

增加：

```
Task

↓

Agent Run

↓

Result

↓

Review
```

---

## MVP04

Leader Agent

增加：

```
Leader

    |

Planner

    |

Backend

Frontend

Test

Review
```

---

## MVP05

Product AI OS

增加：

* Skill Marketplace
* Project Knowledge
* Memory
* Workflow
* AIOps Agent
* Release Agent

---

# 12. MVP01 成功标准

完成后用户可以：

✅ 打开一个桌面应用

✅ 管理多个项目

✅ 一键创建 Codex CLI

✅ 一键创建 Claude CLI

✅ 自定义 Session 名称

✅ 多 Tab 并行运行

✅ 下次打开恢复历史 Session

最终体验：

```
Warp Terminal

+

Claude Code

+

Codex CLI

+

Session Manager

```

作为 Product AI OS 的基础运行层。
