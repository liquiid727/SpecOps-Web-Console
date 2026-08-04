# Go 工程基座与 CLI 脚手架设计规范（2026 版）

> 文档版本：v1.0.0  
> 更新时间：2026-08-04  
> 适用范围：Go API 服务、gRPC 服务、后台 Worker、定时任务、网关和命令行程序  
> 默认实现：Gin + Cobra + Viper + Zap + PostgreSQL/pgx + Redis + Goose  
> 本文不包含需求 Spec 体系，也不包含 Feature Flag 体系。

---

## 1. 文档目标

本文用于建立一套可以长期复用的 Go 工程基座，使后续创建的新项目在初始化阶段就具备统一的：

- 项目目录和分层规则；
- 命令行入口与生命周期管理；
- 配置、日志、错误、鉴权和中间件；
- HTTP、gRPC、数据库、Redis 和异步任务能力；
- 版本号、构建信息、Git 标签和发布产物；
- 单元测试、并发测试、集成测试、接口测试和性能测试；
- 静态检查、漏洞检查、依赖治理和软件供应链安全；
- Docker、CI、CD、灰度、回滚和发布后验证；
- 项目生成、模块追加、工程检查和基座升级能力。

最终目标不是创建一个封装 Gin 的新 Web 框架，而是建设一条稳定的 Go 工程“黄金路径”：

```text
工程规范
   ↓
版本化项目模板
   ↓
goforge CLI
   ↓
代码生成与模块安装
   ↓
Doctor / Lint / Test / CI
   ↓
构建、发布、部署与回滚
```

---

## 2. 核心原则

### 2.1 工程基座不等于业务框架

工程基座负责解决重复且稳定的问题：

- 项目初始化；
- 目录和分层；
- 服务启动和停止；
- 配置加载和校验；
- 日志、错误和可观测性；
- 数据库和缓存连接；
- 测试、构建和发布；
- 工程治理。

业务代码仍然按照具体项目实现。不要在基座中预置用户、订单、支付等业务模型。

### 2.2 标准库优先，成熟组件优先

优先使用 Go 标准库解决基础问题，但不为了“零依赖”重复实现成熟组件。

例如：

- HTTP Server 使用 `net/http.Server`；
- 路由层可以使用 Gin、Chi 或标准库；
- 日志使用 Zap 或 `log/slog`，不自研日志存储格式；
- 指标使用 Prometheus/OpenTelemetry，不自研指标协议；
- YAML 使用成熟解析库，不手写简化解析器；
- 数据库迁移使用 Goose/Atlas，不直接拼接 SQL Shell；
- Protobuf 使用 Buf，不自行管理 protoc 插件下载。

### 2.3 业务层不依赖传输框架

必须遵守：

```text
HTTP/gRPC/MQ Transport
          ↓
Application/Biz
          ↓
Repository/Store
          ↓
PostgreSQL、Redis、第三方服务
```

禁止：

- Biz 层直接接收 `*gin.Context`；
- Store 层返回 HTTP 状态码；
- Handler 直接执行 SQL；
- Repository 决定 HTTP 返回结构；
- Domain/Application 直接依赖具体 Web 框架。

### 2.4 默认简单，按需扩展

基础模板只提供稳定公共能力。

PostgreSQL、Redis、gRPC、Kafka、定时任务等使用模块方式追加，避免所有项目默认携带全部组件。

### 2.5 规范必须可执行

文档只用于说明规则，真正约束依赖：

- `gofmt`；
- `go vet`；
- GolangCI-Lint；
- 自定义 `go/analysis`；
- `go test`；
- `govulncheck`；
- `goforge doctor`；
- CI 合并门禁。

---

## 3. 2026 工具链基线

截至 2026-08-04，Go 当前稳定大版本为 Go 1.26，最新补丁版本为 Go 1.26.5。新项目建议：

```go
module example.com/company/project

go 1.25.0

toolchain go1.26.5
```

含义：

- `go 1.25.0`：项目保持对 Go 1.25 语言和标准库能力的最低兼容；
- `toolchain go1.26.5`：本地和 CI 推荐使用 Go 1.26.5；
- 若项目明确使用 Go 1.26 新语法或 API，则改为 `go 1.26.0`；
- 公共库应测试最近两个受支持的大版本；
- 业务服务通常只需固定当前生产工具链。

### 3.1 工具依赖统一写入 go.mod

Go 1.24 起支持 `tool` 指令，脚手架不再要求开发者分别执行一堆 `go install ...@latest`。

示例：

```go
tool (
    github.com/golangci/golangci-lint/v2/cmd/golangci-lint
    github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen
    github.com/sqlc-dev/sqlc/cmd/sqlc
    github.com/pressly/goose/v3/cmd/goose
    golang.org/x/vuln/cmd/govulncheck
)
```

安装或更新工具：

```bash
go get -tool github.com/sqlc-dev/sqlc/cmd/sqlc@latest
go get -tool golang.org/x/vuln/cmd/govulncheck@latest
```

执行：

```bash
go tool sqlc generate
go tool golangci-lint run
go tool govulncheck ./...
```

生产项目不应在 CI 中无版本约束地执行：

```bash
go install xxx@latest
```

---

## 4. 项目类型

CLI 至少提供以下 Profile：

| Profile | 说明 | 默认入口 |
|---|---|---|
| `api` | Gin HTTP API 服务 | `cmd/apiserver` |
| `grpc` | gRPC 服务 | `cmd/grpcserver` |
| `api-grpc` | 同时提供 HTTP 与 gRPC | `cmd/server` |
| `worker` | MQ、队列和后台消费任务 | `cmd/worker` |
| `scheduler` | 定时任务和周期任务 | `cmd/scheduler` |
| `gateway` | 认证、支付或业务网关 | `cmd/gateway` |
| `cli` | 独立命令行工具 | `cmd/<name>` |
| `library` | 可被其他 Go 模块引用的公共库 | 根目录或公开包目录 |

推荐创建方式：

```bash
goforge new payment-service --profile api
goforge new settlement-worker --profile worker
goforge new auth-gateway --profile api-grpc
goforge new opsctl --profile cli
```

---

## 5. 推荐目录结构

以中大型 API 服务为例：

```text
project/
├── cmd/
│   └── apiserver/
│       └── main.go
├── internal/
│   ├── app/
│   │   ├── app.go
│   │   ├── lifecycle.go
│   │   └── bootstrap.go
│   ├── config/
│   │   ├── config.go
│   │   └── validate.go
│   ├── transport/
│   │   ├── http/
│   │   │   ├── router.go
│   │   │   ├── handler/
│   │   │   ├── middleware/
│   │   │   ├── request/
│   │   │   └── response/
│   │   └── grpc/
│   ├── modules/
│   │   ├── user/
│   │   │   ├── application/
│   │   │   ├── repository/
│   │   │   └── model/
│   │   └── order/
│   ├── platform/
│   │   ├── database/
│   │   ├── redis/
│   │   ├── logging/
│   │   ├── telemetry/
│   │   ├── security/
│   │   └── client/
│   ├── errorsx/
│   └── version/
├── api/
│   ├── openapi/
│   └── proto/
├── migrations/
├── configs/
│   ├── config.example.yaml
│   └── config.local.yaml
├── deployments/
│   ├── docker/
│   ├── compose/
│   └── kubernetes/
├── scripts/
├── test/
│   ├── integration/
│   ├── e2e/
│   ├── contract/
│   └── performance/
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── deployment/
│   └── runbook/
├── .github/
│   └── workflows/
├── .golangci.yml
├── .goreleaser.yaml
├── .air.toml
├── Dockerfile
├── Makefile
├── go.mod
├── go.sum
├── goforge.yaml
├── CHANGELOG.md
├── README.md
└── LICENSE
```

### 5.1 目录规则

1. `cmd` 只保留程序入口，不堆放业务逻辑。
2. 服务私有实现放入 `internal`。
3. 不默认创建 `pkg`；只有明确需要被外部模块复用时才创建公开包。
4. `transport` 负责协议适配，不负责核心业务。
5. 简单服务可以使用 `handler/biz/store`。
6. 复杂业务建议按业务模块组织，而不是建立巨大的全局 `handler`、`service`、`repository`。
7. 生成代码集中放置并明确标记，禁止人工修改。
8. 配置示例可以提交，真实密钥和生产配置禁止提交。
9. 部署文件和运行手册属于项目的一部分，不应放在个人电脑或聊天记录中。

---

## 6. 架构分层

### 6.1 简单项目

适合内部管理系统、小型 CRUD 服务：

```text
Handler
   ↓
Biz
   ↓
Store
```

职责：

- Handler：参数解析、参数校验、身份信息提取、调用 Biz、转换响应；
- Biz：业务规则、事务边界和流程编排；
- Store：数据库、缓存和第三方服务访问。

### 6.2 中大型业务项目

适合支付、计费、调度、资源管理和风控：

```text
Transport
    ↓
Application
    ↓
Domain（按需）
    ↓
Repository
    ↓
Infrastructure
```

Domain 层只在存在明显领域规则时引入。禁止为了目录漂亮而创建空的 DDD 层。

### 6.3 依赖规则

```text
transport  → application
application → repository interface / domain
repository implementation → database / redis / remote client
platform → third-party libraries
```

推荐接口定义在使用方附近：

```go
package order

type Repository interface {
    GetByID(ctx context.Context, id int64) (*Order, error)
    Save(ctx context.Context, order *Order) error
}
```

不要提前为每个结构体创建毫无价值的接口。

---

## 7. 应用入口与命令行

### 7.1 Cobra 作为统一入口

所有可执行服务统一支持：

```bash
project serve
project version
project migrate up
project migrate down
project migrate status
project config validate
project doctor
```

基础结构：

```text
cmd/apiserver/main.go
internal/command/root.go
internal/command/serve.go
internal/command/version.go
internal/command/migrate.go
```

`main.go` 保持极简：

```go
package main

import (
    "os"

    "example.com/project/internal/command"
)

func main() {
    if err := command.Execute(); err != nil {
        os.Exit(1)
    }
}
```

### 7.2 启动流程

```text
解析命令行
  ↓
加载配置
  ↓
校验配置
  ↓
初始化日志
  ↓
初始化 Telemetry
  ↓
初始化数据库、Redis、外部客户端
  ↓
构建业务模块
  ↓
启动 HTTP/gRPC/Worker
  ↓
等待退出信号
  ↓
停止接收新请求
  ↓
等待在途任务
  ↓
关闭外部连接
  ↓
刷新日志与遥测
```

### 7.3 生命周期接口

```go
type Component interface {
    Name() string
    Start(ctx context.Context) error
    Stop(ctx context.Context) error
    Health(ctx context.Context) error
}
```

简单项目可以手动组装；组件和生命周期非常复杂时，可以把 Uber Fx 作为可选模块，但不应成为所有项目默认依赖。

---

## 8. 配置管理

默认使用 Viper，也允许后续替换 Koanf，但对业务代码暴露的是强类型配置结构。

```go
type Config struct {
    App       AppConfig
    HTTP      HTTPConfig
    GRPC      GRPCConfig
    Database  DatabaseConfig
    Redis     RedisConfig
    Logging   LoggingConfig
    Telemetry TelemetryConfig
}
```

### 8.1 配置来源优先级

推荐：

```text
命令行参数
    >
环境变量
    >
环境专用配置文件
    >
基础配置文件
    >
代码默认值
```

### 8.2 环境变量映射

```text
APP_NAME
HTTP_ADDR
HTTP_READ_TIMEOUT
DATABASE_DSN
REDIS_ADDR
LOG_LEVEL
OTEL_EXPORTER_OTLP_ENDPOINT
```

禁止通过 `cp .env.example .env` 暗示应用会自动加载 `.env`，除非代码确实实现了 `.env` 加载。

### 8.3 启动时校验

以下错误必须在启动阶段失败，而不是收到流量后才报错：

- 端口格式错误；
- 数据库 DSN 缺失；
- 超时小于等于零；
- 日志级别非法；
- JWT Key 缺失；
- 生产环境使用默认密码；
- 必要目录不可写；
- 配置项之间相互冲突。

提供命令：

```bash
project config validate --config configs/config.prod.yaml
```

### 8.4 敏感信息

- 示例配置只保留占位符；
- 生产密钥来自环境变量或密钥管理系统；
- 日志不得打印完整配置对象；
- DSN、Token、Cookie、支付密钥必须脱敏；
- CLI 的 `doctor` 应检查常见敏感文件是否被 Git 追踪。

---

## 9. 日志规范

默认使用 Zap，业务代码依赖项目定义的 Logger 接口。

```go
type Logger interface {
    Debug(ctx context.Context, msg string, fields ...Field)
    Info(ctx context.Context, msg string, fields ...Field)
    Warn(ctx context.Context, msg string, fields ...Field)
    Error(ctx context.Context, msg string, fields ...Field)
}
```

### 9.1 必须结构化输出

推荐 JSON 字段：

```text
timestamp
level
service
service_version
environment
message
trace_id
span_id
request_id
user_id
tenant_id
error_code
latency_ms
```

### 9.2 日志事件命名

不要只写：

```go
logger.Info(ctx, "处理成功")
```

应写：

```go
logger.Info(ctx, "payment_callback_processed",
    String("order_no", orderNo),
    String("provider", provider),
    Duration("latency", latency),
)
```

### 9.3 禁止记录

- 密码；
- Access Token 和 Refresh Token；
- 完整银行卡号；
- 支付私钥；
- 完整身份证号；
- 完整手机号和邮箱；
- 未裁剪的大型请求体；
- 用户上传文件的原始敏感内容。

### 9.4 日志级别

- Debug：开发调试信息；
- Info：正常业务事件和生命周期；
- Warn：可恢复异常、降级、重试；
- Error：当前操作失败，需要定位；
- Panic/Fatal：只允许入口层在无法继续启动时使用。

业务包不得直接 `Fatal`，否则会绕过统一清理流程。

---

## 10. 版本管理与构建信息

这是工程基座的默认能力，不是发布前临时添加的功能。

### 10.1 版本规则

使用 SemVer：

```text
vMAJOR.MINOR.PATCH
```

- MAJOR：不兼容变更；
- MINOR：向下兼容的新能力；
- PATCH：向下兼容的问题修复；
- 预发布：`v1.2.0-alpha.1`、`v1.2.0-rc.1`；
- 构建元数据：`v1.2.0+20260804.sha1234567`。

应用服务内部仍可以独立维护：

- API 版本；
- 数据库 Schema 版本；
- 配置 Schema 版本；
- 镜像标签。

不要把所有版本概念混成一个数字。

### 10.2 version 包

```go
package version

import (
    "fmt"
    "runtime"
)

var (
    GitVersion   = "v0.0.0-dev"
    GitCommit    = "unknown"
    GitTreeState = "unknown"
    BuildDate    = "unknown"
)

type Info struct {
    GitVersion   string `json:"git_version"`
    GitCommit    string `json:"git_commit"`
    GitTreeState string `json:"git_tree_state"`
    BuildDate    string `json:"build_date"`
    GoVersion    string `json:"go_version"`
    Compiler     string `json:"compiler"`
    Platform     string `json:"platform"`
}

func Get() Info {
    return Info{
        GitVersion:   GitVersion,
        GitCommit:    GitCommit,
        GitTreeState: GitTreeState,
        BuildDate:    BuildDate,
        GoVersion:    runtime.Version(),
        Compiler:     runtime.Compiler,
        Platform:     fmt.Sprintf("%s/%s", runtime.GOOS, runtime.GOARCH),
    }
}
```

### 10.3 ldflags 注入

Makefile：

```makefile
VERSION ?= $(shell git describe --tags --always --dirty)
COMMIT  ?= $(shell git rev-parse HEAD)
DATE    ?= $(shell date -u '+%Y-%m-%dT%H:%M:%SZ')
STATE   ?= $(shell test -z "$$(git status --porcelain)" && echo clean || echo dirty)

LDFLAGS := \
	-X 'example.com/project/internal/version.GitVersion=$(VERSION)' \
	-X 'example.com/project/internal/version.GitCommit=$(COMMIT)' \
	-X 'example.com/project/internal/version.GitTreeState=$(STATE)' \
	-X 'example.com/project/internal/version.BuildDate=$(DATE)'
```

构建：

```bash
go build -trimpath -ldflags "$(LDFLAGS)" -o _output/project ./cmd/apiserver
```

### 10.4 版本输出

```bash
project version
project version --output json
```

建议健康接口暴露精简版本：

```json
{
  "status": "ok",
  "version": "v1.6.2",
  "commit": "2f03d1a"
}
```

不要对公网暴露不必要的构建机和内部仓库信息。

### 10.5 Git 标签

发布前：

```bash
go mod tidy
go test ./...
git tag -a v1.2.0 -m "release v1.2.0"
git push origin v1.2.0
```

已发布标签不可覆盖。修复问题必须发布新版本。

---

## 11. Git 与协作规范

### 11.1 分支

推荐简化的 Trunk-Based Development：

```text
main
  ├── feature/*
  ├── fix/*
  └── release/*（仅在确有稳定窗口时使用）
```

规则：

- `main` 始终保持可构建；
- 短生命周期分支；
- 通过 Pull Request 合并；
- 禁止直接向受保护主分支推送；
- 必须通过 CI 和 Code Review；
- 合并后自动删除分支。

### 11.2 Commit

推荐 Conventional Commits 风格：

```text
feat: add wallet settlement
fix: prevent duplicate callback processing
refactor: split allocation strategy
test: add redis failover integration test
build: update Go toolchain
ci: add vulnerability scan
docs: update deployment runbook
```

提交应说明“为什么”，不能只写：

```text
update
fix bug
修改代码
```

### 11.3 CHANGELOG

维护 `CHANGELOG.md`，至少分组：

```text
Added
Changed
Fixed
Deprecated
Removed
Security
```

发布说明可以由 GoReleaser 根据 Git 日志生成，但关键业务变更、升级步骤和不兼容项必须人工补充。

---

## 12. HTTP 服务规范

### 12.1 Server 配置

必须显式设置：

```go
server := &http.Server{
    Addr:              cfg.HTTP.Addr,
    Handler:           router,
    ReadHeaderTimeout: cfg.HTTP.ReadHeaderTimeout,
    ReadTimeout:       cfg.HTTP.ReadTimeout,
    WriteTimeout:      cfg.HTTP.WriteTimeout,
    IdleTimeout:       cfg.HTTP.IdleTimeout,
    MaxHeaderBytes:    cfg.HTTP.MaxHeaderBytes,
}
```

禁止只写：

```go
http.ListenAndServe(":8080", router)
```

然后忽略超时、优雅停止和错误处理。

### 12.2 中间件顺序

推荐：

```text
Recovery
Request ID
Trace Context
Access Log
Security Headers
CORS
Body Limit
Timeout
Authentication
Authorization
Rate Limit
Handler
```

并非每个项目都必须启用全部中间件，但顺序必须明确。

### 12.3 基础接口

```text
GET /healthz
GET /readyz
GET /metrics
GET /version（按需）
```

区别：

- `/healthz`：进程是否存活；
- `/readyz`：是否具备接收流量的条件；
- `/metrics`：Prometheus 指标；
- `/version`：构建版本。

`readyz` 应检查关键依赖，但必须设置非常短的超时，不能让探针拖垮数据库。

### 12.4 优雅关停

收到 `SIGTERM` 或 `SIGINT`：

1. 标记 Not Ready；
2. 停止接收新请求；
3. 等待负载均衡摘流；
4. 调用 `http.Server.Shutdown`；
5. 停止消费者拉取新任务；
6. 等待在途任务提交或安全回退；
7. 关闭数据库、Redis、MQ；
8. 刷新 Trace 和日志；
9. 超过总超时后强制退出。

---

## 13. API 契约与代码生成

### 13.1 HTTP API

推荐契约优先：

```text
OpenAPI 文件
  ↓
Lint 与兼容性检查
  ↓
生成请求、响应、Server Interface 和 Client
  ↓
实现业务逻辑
```

OpenAPI 当前已经发布 3.2.0，但实际项目应以生成器支持情况为准。默认基座可以采用兼容性更稳的 OpenAPI 3.0.4，并通过版本升级计划逐步提高。

推荐：

- `oapi-codegen`：OpenAPI 到 Go；
- Spectral 或 Redocly CLI：契约 lint；
- Bruno：接口用例和环境管理；
- 生成代码放入明确目录；
- CI 检查生成代码是否与契约一致。

### 13.2 Protobuf 与 gRPC

统一使用 Buf v2：

```text
buf.yaml
buf.gen.yaml
buf.lock
```

本地与 CI：

```bash
buf format --diff --exit-code
buf lint
buf breaking --against '.git#branch=main'
buf generate
```

规则：

- 已使用字段号不得复用；
- 删除字段必须 `reserved`；
- Enum 第一个值使用 `*_UNSPECIFIED = 0`；
- 包名包含版本，例如 `payment.v1`；
- 对外接口默认避免破坏兼容；
- 生成代码不手改。

---

## 14. 统一错误模型

### 14.1 内部错误

```go
type Error struct {
    Code      string
    Message   string
    Cause     error
    Metadata  map[string]any
    Retryable bool
}
```

错误码格式：

```text
<Domain>.<Reason>
```

示例：

```text
Common.InvalidArgument
Common.Unauthenticated
Common.PermissionDenied
User.NotFound
Payment.InsufficientBalance
Order.InvalidStatus
Resource.CapacityExhausted
```

### 14.2 HTTP 错误

推荐使用 RFC 9457 Problem Details：

```json
{
  "type": "urn:problem:payment:insufficient-balance",
  "title": "Insufficient balance",
  "status": 409,
  "detail": "The available balance is insufficient.",
  "instance": "/orders/ORD20260001",
  "code": "Payment.InsufficientBalance",
  "trace_id": "01K..."
}
```

响应 Content-Type：

```text
application/problem+json
```

### 14.3 gRPC 错误

转换为：

```text
codes.Code
status.Status
google.rpc.ErrorInfo
google.rpc.BadRequest
google.rpc.RetryInfo
```

业务层不直接构造 HTTP JSON 或 gRPC Status，由 Transport 层转换。

### 14.4 错误处理规则

- 使用 `%w` 包装底层错误；
- 使用 `errors.Is` 和 `errors.As`；
- 禁止通过字符串判断错误类型；
- 对用户返回稳定错误码；
- 原始数据库错误只进入内部日志；
- Retryable 必须明确，不允许所有错误无脑重试；
- 重试必须有上限、退避和抖动。

---

## 15. 身份认证与授权

### 15.1 认证

按业务选择：

- 用户名/密码；
- JWT Access Token；
- Refresh Token；
- OAuth 2.0 / OIDC；
- 服务间 mTLS；
- 服务间短期 Token。

规则：

- 密码使用 Argon2id 或 bcrypt；
- JWT 必须验证算法、签发者、受众、过期时间；
- 禁止接受 Token 自带的任意算法；
- Refresh Token 支持撤销和轮换；
- Token 不写入日志；
- 对外回调必须验证签名、时间戳和重放风险。

### 15.2 授权

简单项目：

```text
RBAC
```

复杂租户项目：

```text
RBAC + 资源归属校验
```

不要只在前端隐藏按钮。所有权限在服务端执行。

---

## 16. 数据库规范

### 16.1 推荐技术栈

核心业务：

```text
PostgreSQL
pgx/v5
sqlc
Goose
```

普通后台 CRUD 可以使用 GORM，但支付、计费、结算、库存、资源调度等关键链路优先使用明确 SQL。

### 16.2 连接池

显式配置：

- MaxConns；
- MinConns；
- MaxConnLifetime；
- MaxConnIdleTime；
- HealthCheckPeriod；
- 建连超时；
- 查询超时。

连接池参数必须通过压测和数据库容量确定，不可机械复制。

### 16.3 sqlc

SQL 示例：

```sql
-- name: GetWalletForUpdate :one
SELECT id, user_id, balance, version
FROM wallets
WHERE user_id = $1
FOR UPDATE;
```

生成：

```bash
go tool sqlc generate
```

CI 检查：

```bash
go tool sqlc diff
```

### 16.4 Migration

使用 Goose：

```bash
project migrate status
project migrate up
project migrate down
```

规范：

- Migration 一旦进入生产不得直接修改；
- 所有 Schema 变更必须有 Migration；
- 大表变更考虑锁时间；
- 先兼容代码，再变更 Schema，再清理旧字段；
- 删除字段必须经过至少一个兼容周期；
- CI 使用空数据库完整执行全部 Migration；
- 生产回滚不能只依赖 Down Migration，必须具备应用回滚策略。

### 16.5 事务

事务边界放在 Application/Biz 层。

必须处理：

- Commit 错误；
- Rollback 错误；
- Context 取消；
- 死锁和序列化失败；
- 幂等；
- 锁顺序；
- 事务中调用远程服务导致的长事务。

---

## 17. Redis 与缓存

使用 `go-redis`。

规则：

- Key 必须带业务前缀；
- TTL 必须明确；
- 禁止无限制存储大对象；
- 缓存不是事实来源；
- 缓存失败通常不应破坏核心写入；
- Lua 脚本需要测试；
- 分布式锁必须定义过期、续约和所有权校验；
- 热点 Key 和大 Key 必须可监控；
- 不要用 Redis Pub/Sub 承担不可丢失的关键消息。

缓存模式按需选择：

```text
Cache Aside
Write Through
Delayed Double Delete
Versioned Cache
```

---

## 18. 异步任务与消息

Worker Profile 应包含：

- 消费者生命周期；
- 并发数；
- 消费超时；
- 重试；
- Dead Letter；
- 幂等；
- 消费进度；
- 优雅停止；
- 指标和告警。

消息处理推荐：

```text
接收消息
  ↓
校验
  ↓
幂等检查
  ↓
执行业务
  ↓
提交结果
  ↓
确认消息
```

禁止在业务成功前提前 Ack。

数据库写入和发消息的一致性场景，优先考虑 Outbox，而不是尝试让数据库和 MQ 进入不可靠的伪分布式事务。

---

## 19. 可观测性

推荐架构：

```text
Application
  ├── Zap JSON Logs
  ├── OpenTelemetry Traces
  └── Prometheus/OpenTelemetry Metrics
              ↓
      OpenTelemetry Collector
              ↓
Prometheus / Grafana / Loki / Tempo
```

2026 年 OpenTelemetry Go 的 Trace 和 Metrics 已稳定，Logs 仍为 Beta。默认基座建议：

- Trace：OpenTelemetry；
- Metrics：Prometheus Client 或 OpenTelemetry Metrics；
- Logs：Zap；
- 日志关联 `trace_id` 和 `span_id`。

### 19.1 Trace

自动插桩：

- HTTP Server；
- HTTP Client；
- gRPC Server/Client；
- PostgreSQL；
- Redis；
- MQ。

手动 Span：

- 支付回调；
- 订单结算；
- 资源分配；
- 状态机转换；
- 长流程关键步骤。

禁止把密码、Token、完整 SQL 和大型请求体写入 Span Attribute。

### 19.2 Metrics

基础指标：

```text
http_server_requests_total
http_server_request_duration_seconds
http_server_active_requests
grpc_server_requests_total
db_pool_acquired_connections
db_pool_acquire_duration_seconds
redis_commands_total
worker_jobs_total
worker_job_duration_seconds
process_errors_total
```

业务指标：

```text
orders_created_total
payment_callbacks_total
allocation_success_total
wallet_deduction_total
```

禁止高基数标签：

- user_id；
- order_no；
- trace_id；
- 完整 URL；
- 错误 Message；
- SQL 原文。

### 19.3 健康检查与告警

健康检查不是告警系统。

告警应基于：

- 错误率；
- P95/P99 延迟；
- 队列积压；
- 数据库连接等待；
- Redis 错误；
- Worker 重试和死信；
- 资源使用；
- 业务成功率。

---

## 20. 测试体系

### 20.1 测试类型

```text
单元测试
表驱动测试
并发测试
Race Test
Fuzz Test
集成测试
数据库迁移测试
契约测试
E2E
性能测试
容量测试
故障恢复测试
```

### 20.2 单元测试

优先使用标准库 `testing`。

规则：

- 使用表驱动；
- 测试业务边界；
- 不追求无意义覆盖率；
- Mock 外部边界，不 Mock 被测函数内部每一层；
- 对核心算法测试不变量；
- 时间和随机数通过依赖注入控制。

### 20.3 synctest

Go 1.25 的 `testing/synctest` 已可用于测试并发和时间相关代码。

适合：

- Context 超时；
- Token 过期；
- 定时器；
- 重试退避；
- Session Grace Period；
- Worker 停止；
- goroutine 协调。

### 20.4 Race

PR 或主干 CI：

```bash
go test -race ./...
```

超大项目可以拆分执行，但关键并发模块不得跳过。

### 20.5 Fuzz

适合：

- JSON/Protobuf 解析；
- 支付回调；
- JWT 和签名；
- URL/Header；
- 文件元数据；
- 状态机输入；
- SQL 参数转换；
- 错误映射。

```bash
go test -fuzz=FuzzParseCallback -fuzztime=30s ./...
```

### 20.6 Testcontainers

PostgreSQL、Redis、Kafka 等集成测试优先使用 Testcontainers，避免所有依赖都 Mock。

适合验证：

- Migration；
- SQL；
- 事务和锁；
- Redis Lua；
- 幂等；
- 消费重试；
- 服务启动和停止。

### 20.7 性能测试

默认 K6，也可以为纯 Go 包增加 Benchmark。

```bash
go test -bench=. -benchmem ./...
k6 run test/performance/smoke.js
k6 run test/performance/load.js
```

性能结果至少记录：

- RPS；
- 并发数；
- P50/P95/P99；
- 错误率；
- CPU；
- 内存；
- GC；
- 数据库连接；
- Redis QPS；
- 队列积压。

---

## 21. 代码质量与静态检查

### 21.1 基础命令

```bash
gofmt
go vet
go test
go test -race
go tool golangci-lint run
go tool govulncheck ./...
```

### 21.2 GolangCI-Lint v2

建议启用：

```yaml
version: "2"

linters:
  enable:
    - errcheck
    - govet
    - staticcheck
    - ineffassign
    - unused
    - bodyclose
    - contextcheck
    - errorlint
    - nilerr
    - noctx
    - rowserrcheck
    - sqlclosecheck
    - revive
```

禁止无脑开启全部 Linter，否则会产生大量冲突和噪声。

### 21.3 自定义 Analyzer

后续可以建设公司级或个人级 Analyzer：

- Handler 禁止直接导入数据库实现；
- Application 禁止依赖 Gin；
- Store 禁止返回 HTTP 错误；
- 外部 HTTP Client 必须设置 Timeout；
- 禁止 `context.Background()` 逃逸请求链；
- 禁止忽略 `Rows.Close`；
- 禁止日志输出敏感字段；
- 禁止业务包调用 `os.Exit`；
- 禁止无上限 goroutine；
- 事务必须显式处理错误；
- 错误必须拥有稳定业务码。

---

## 22. Makefile 与统一命令

Makefile 仍然是 Go 项目中成本低、兼容性高的统一入口。

建议目标：

```makefile
.PHONY: init tidy fmt lint vet test test-race test-integration \
        generate build run clean docker-build \
        migrate-up migrate-down migrate-status \
        vuln sbom release-snapshot release doctor ci

init:
	go mod download

tidy:
	go mod tidy

fmt:
	gofmt -w .
	goimports -w .

lint:
	go tool golangci-lint run

vet:
	go vet ./...

test:
	go test -count=1 ./...

test-race:
	go test -race -count=1 ./...

test-integration:
	go test -tags=integration -count=1 ./test/integration/...

generate:
	go generate ./...
	go tool sqlc generate

build:
	mkdir -p _output
	go build -trimpath -ldflags "$(LDFLAGS)" \
		-o _output/project ./cmd/apiserver

run:
	go run ./cmd/apiserver serve

vuln:
	go tool govulncheck ./...

release-snapshot:
	goreleaser release --snapshot --clean

doctor:
	goforge doctor

ci: tidy fmt vet lint test test-race vuln build
```

本地命令和 CI 命令必须复用，避免出现：

```text
本地 make test 能过
CI 使用另一套隐藏脚本失败
```

---

## 23. 本地开发体验

### 23.1 Air

使用 Air 热加载：

```toml
root = "."
tmp_dir = "tmp"

[build]
cmd = "go build -o ./tmp/project ./cmd/apiserver"
bin = "./tmp/project"
args_bin = ["serve", "--config", "configs/config.local.yaml"]
include_ext = ["go", "yaml", "yml"]
exclude_dir = ["tmp", "vendor", "_output"]
```

### 23.2 Docker Compose

本地 Compose 至少可选提供：

- PostgreSQL；
- Redis；
- OpenTelemetry Collector；
- Prometheus；
- Grafana；
- Loki；
- Tempo。

基础 Profile 不强制启动完整监控栈，开发者可以通过：

```bash
docker compose --profile observability up -d
```

启用。

### 23.3 环境检查

```bash
goforge doctor
```

检查：

- Go 版本；
- Docker；
- Git；
- 配置文件；
- 本地端口；
- 数据库和 Redis；
- 必要工具；
- go.mod 是否整洁；
- 生成代码是否过期。

---

## 24. Docker 镜像规范

### 24.1 多阶段构建

```dockerfile
FROM golang:1.26 AS builder

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .

ARG VERSION=dev
ARG COMMIT=unknown
ARG BUILD_DATE=unknown

RUN CGO_ENABLED=0 GOOS=linux go build \
    -trimpath \
    -ldflags="-s -w \
      -X 'example.com/project/internal/version.GitVersion=${VERSION}' \
      -X 'example.com/project/internal/version.GitCommit=${COMMIT}' \
      -X 'example.com/project/internal/version.BuildDate=${BUILD_DATE}'" \
    -o /out/project ./cmd/apiserver

FROM gcr.io/distroless/static-debian12:nonroot

COPY --from=builder /out/project /project

USER nonroot:nonroot

ENTRYPOINT ["/project"]
CMD ["serve"]
```

### 24.2 镜像规则

- 运行阶段不携带 Go 工具链；
- 默认非 Root；
- 不将密钥打入镜像；
- 不在镜像中携带 `.git`；
- 使用固定基础镜像版本或 Digest；
- 镜像支持 amd64/arm64 时由 CI 多架构构建；
- 提供 OCI Label；
- 每个镜像关联版本、Commit 和构建时间；
- 生成 SBOM；
- 扫描漏洞；
- 对正式镜像签名。

---

## 25. CI 设计

CI 目标是阻止明显不合格代码进入主干，而不是把所有测试都挤进一个 Job。

### 25.1 Pull Request CI

建议阶段：

```text
Checkout
  ↓
Setup Go + Cache
  ↓
go mod tidy 检查
  ↓
生成代码一致性检查
  ↓
Format
  ↓
Vet
  ↓
Lint
  ↓
Unit Test
  ↓
Race Test
  ↓
关键 Integration Test
  ↓
Vulnerability Scan
  ↓
Build
  ↓
Docker Build
```

示例：

```yaml
name: ci

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - uses: actions/setup-go@v5
        with:
          go-version-file: go.mod
          cache: true

      - name: Verify modules
        run: |
          go mod tidy
          git diff --exit-code -- go.mod go.sum

      - name: Generate
        run: |
          make generate
          git diff --exit-code

      - name: Format
        run: |
          test -z "$(gofmt -l .)"

      - name: Vet
        run: make vet

      - name: Lint
        run: make lint

      - name: Test
        run: make test

      - name: Race
        run: make test-race

      - name: Vulnerabilities
        run: make vuln

      - name: Build
        run: make build

      - name: Docker build
        run: docker build -t project:ci .
```

### 25.2 Nightly CI

执行耗时较长的：

- 全量集成测试；
- 完整 E2E；
- 长时间 Fuzz；
- K6；
- 多版本 Go 测试；
- 多架构构建；
- 依赖升级验证；
- 数据库升级和回滚演练；
- 故障恢复测试。

### 25.3 CI 输出

保存：

- 测试报告；
- 覆盖率；
- Benchmark；
- K6 报告；
- Lint 结果；
- SBOM；
- 构建产物；
- Docker 镜像 Digest。

---

## 26. CD 与发布流程

### 26.1 环境

```text
local
development
testing
staging
production
```

小团队可以简化，但生产和非生产必须隔离。

### 26.2 发布流程

```text
主干代码通过 CI
  ↓
创建 SemVer Tag
  ↓
GoReleaser 构建
  ↓
生成二进制、压缩包、校验和、SBOM
  ↓
构建多架构镜像
  ↓
漏洞扫描与签名
  ↓
推送制品库
  ↓
部署 Staging
  ↓
Smoke Test
  ↓
人工或策略审批
  ↓
灰度 Production
  ↓
指标与日志观察
  ↓
全量或回滚
```

### 26.3 GoReleaser

`.goreleaser.yaml` 示例：

```yaml
version: 2

project_name: project

builds:
  - id: project
    main: ./cmd/apiserver
    binary: project
    env:
      - CGO_ENABLED=0
    goos:
      - linux
      - darwin
    goarch:
      - amd64
      - arm64
    flags:
      - -trimpath
    ldflags:
      - >-
        -s -w
        -X example.com/project/internal/version.GitVersion={{.Version}}
        -X example.com/project/internal/version.GitCommit={{.Commit}}
        -X example.com/project/internal/version.BuildDate={{.Date}}

archives:
  - formats:
      - tar.gz

checksum:
  name_template: checksums.txt

changelog:
  use: git
  sort: asc
```

本地验证：

```bash
goreleaser healthcheck
goreleaser build --snapshot --clean
goreleaser release --snapshot --clean
```

### 26.4 发布前门禁

必须检查：

- 工作区干净；
- 版本号合法；
- CHANGELOG 已更新；
- CI 通过；
- 数据库变更已评审；
- 配置变更有说明；
- 向后兼容性明确；
- 回滚步骤可执行；
- Dashboard 和告警可用；
- 发布负责人明确。

### 26.5 部署后检查

- 健康探针；
- 核心接口 Smoke Test；
- 错误率；
- P95/P99；
- 数据库连接；
- Redis；
- 队列积压；
- 关键业务成功率；
- 新旧版本实例数量；
- 日志中的新增错误；
- 数据一致性抽查。

---

## 27. 回滚规范

回滚必须包含：

1. 应用版本回滚；
2. 配置回滚；
3. 数据库兼容策略；
4. 消息消费者兼容；
5. 缓存版本兼容；
6. 任务是否可重复；
7. 是否需要停止写入；
8. 回滚后的验证。

推荐数据库变更采用 Expand/Contract：

```text
先增加兼容字段
  ↓
新旧代码同时兼容
  ↓
迁移数据
  ↓
切换读写
  ↓
观察
  ↓
后续版本删除旧字段
```

不要在同一发布中直接：

```text
删除旧字段 + 发布只支持新字段的程序
```

---

## 28. 安全与软件供应链

### 28.1 代码和依赖

```bash
go vet ./...
go tool golangci-lint run
go tool govulncheck ./...
```

按需增加：

- Gosec；
- Secret Scan；
- License 检查；
- Dependabot/Renovate；
- 容器镜像漏洞扫描。

`govulncheck` 会结合静态分析缩小到代码可能调用的受影响函数，但仍需理解其反射、接口调用和二进制分析限制。

### 28.2 SBOM

使用 Syft 或 GoReleaser 生成：

```text
SPDX JSON
CycloneDX JSON
```

SBOM 应与正式版本产物一起保存。

### 28.3 制品签名

正式镜像和关键二进制建议使用 Cosign 签名，并在部署阶段验证：

```text
构建者身份
Commit
Workflow
镜像 Digest
签名
SBOM/Provenance
```

### 28.4 最小权限

- CI Token 最小权限；
- 默认 `permissions: contents: read`；
- 发布 Job 单独提升权限；
- 生产密钥不进入普通 PR Job；
- Fork PR 不获得发布凭据；
- 容器非 Root；
- Kubernetes 使用独立 ServiceAccount；
- 数据库账号按读写权限拆分。

---

## 29. 文档基线

每个项目至少提供：

```text
README.md
CHANGELOG.md
LICENSE
docs/architecture/
docs/api/
docs/deployment/
docs/runbook/
configs/config.example.yaml
```

README 至少包含：

- 项目用途；
- 快速启动；
- 依赖；
- 配置；
- 常用命令；
- 测试；
- 构建；
- Docker；
- 数据库迁移；
- 发布方式；
- 故障定位入口。

Runbook 至少包含：

- 服务无法启动；
- 数据库不可用；
- Redis 不可用；
- 消费积压；
- 磁盘满；
- CPU/内存异常；
- 错误率突然升高；
- 发布回滚；
- 数据修复审批流程。

---

# 第二部分：将规范建设为 goforge CLI

## 30. CLI 的定位

`goforge` 不是一个新的 Web 框架，而是 Go 工程基座管理工具。

它负责：

```text
初始化项目
追加工程模块
生成重复代码
执行规范检查
管理模板版本
辅助升级旧项目
统一开发命令
```

不负责：

- 自动生成全部业务逻辑；
- 替代 Gin、gRPC、pgx；
- 在运行时控制业务请求；
- 把所有项目强制变成一种架构；
- 用字符串随意重写用户代码。

---

## 31. CLI 命令设计

```bash
goforge version

goforge new <project>
  --module example.com/company/project
  --profile api
  --framework gin
  --database postgres
  --cache redis

goforge add postgres
goforge add redis
goforge add grpc
goforge add worker
goforge add scheduler
goforge add telemetry
goforge add auth
goforge add docker
goforge add github-actions

goforge generate resource user
goforge generate migration create_users
goforge generate client payment
goforge generate error-codes
goforge generate mocks

goforge doctor
goforge verify
goforge lint
goforge test

goforge upgrade
goforge upgrade --to v0.4.0
goforge diff-template
```

---

## 32. 项目 Manifest

每个生成项目根目录创建 `goforge.yaml`：

```yaml
schema_version: v1
generator_version: v0.1.0
template_version: v0.1.0

project:
  name: payment-service
  module: example.com/company/payment-service
  profile: api
  go_version: "1.25.0"
  toolchain: "go1.26.5"

architecture:
  style: modular-layered

runtime:
  cli: cobra
  http: gin
  logger: zap
  config: viper

modules:
  postgres:
    enabled: true
    driver: pgx-v5
    generator: sqlc
    migration: goose
  redis:
    enabled: true
  grpc:
    enabled: false
  telemetry:
    enabled: true
    traces: opentelemetry
    metrics: prometheus

quality:
  golangci_lint: v2
  race_test: true
  govulncheck: true

delivery:
  docker: true
  ci: github-actions
  release: goreleaser
  sbom: syft
```

Manifest 用于：

- `doctor` 判断项目应该具备哪些能力；
- `add` 避免重复安装模块；
- `upgrade` 判断当前模板版本；
- CI 读取项目约束；
- 生成器选择代码模板；
- 输出工程能力清单。

---

## 33. CLI 自身目录

```text
goforge/
├── cmd/
│   └── goforge/
│       └── main.go
├── internal/
│   ├── command/
│   │   ├── root.go
│   │   ├── new.go
│   │   ├── add.go
│   │   ├── generate.go
│   │   ├── doctor.go
│   │   └── upgrade.go
│   ├── template/
│   │   ├── engine.go
│   │   ├── renderer.go
│   │   └── registry.go
│   ├── module/
│   │   ├── installer.go
│   │   ├── postgres/
│   │   ├── redis/
│   │   ├── grpc/
│   │   └── telemetry/
│   ├── manifest/
│   ├── generator/
│   │   ├── resource/
│   │   ├── migration/
│   │   └── client/
│   ├── doctor/
│   │   ├── rule.go
│   │   ├── result.go
│   │   └── rules/
│   ├── upgrade/
│   │   ├── migration.go
│   │   └── registry.go
│   ├── astx/
│   ├── fsx/
│   └── version/
├── templates/
│   ├── api/
│   ├── grpc/
│   ├── api-grpc/
│   ├── worker/
│   ├── scheduler/
│   └── cli/
├── go.mod
├── Makefile
└── .goreleaser.yaml
```

模板使用 `embed.FS` 打包进 CLI：

```go
//go:embed templates/**
var templates embed.FS
```

这样安装一个二进制即可创建项目。

---

## 34. 模板体系

### 34.1 Project Template

负责第一次生成完整项目：

```text
api
grpc
api-grpc
worker
scheduler
cli
```

### 34.2 Module Template

负责向已有项目追加能力：

```text
postgres
redis
grpc
auth
telemetry
worker
scheduler
docker
github-actions
gitlab-ci
```

### 34.3 Code Generator

负责生成重复业务骨架：

```text
resource
handler
application
repository
migration
grpc service
http client
mock
```

三者不要混成一个巨大模板。

---

## 35. 模板渲染

初次生成使用：

```text
text/template
embed.FS
go/format
```

模板变量：

```go
type ProjectContext struct {
    ProjectName string
    ModulePath  string
    BinaryName  string
    Profile     string
    GoVersion   string
    Toolchain   string
    Year        int
}
```

渲染后必须：

1. 写入临时目录；
2. 执行 Go 格式化；
3. 执行 `go mod tidy`；
4. 执行 `go test ./...`；
5. 全部成功后移动到目标目录；
6. 失败时删除临时目录。

避免生成半成品项目。

---

## 36. 修改已有代码的策略

优先级：

```text
生成独立文件
  >
修改受控注册表
  >
Go AST
  >
文本锚点（最后手段）
```

### 36.1 生成独立文件

例如安装 Redis：

```text
internal/platform/redis/client.go
internal/platform/redis/config.go
internal/platform/redis/health.go
```

### 36.2 受控注册表

```go
var Modules = []ModuleFactory{
    NewHTTPModule,
    NewDatabaseModule,
    NewRedisModule,
}
```

CLI 只维护这个小型受控文件，而不是修改 `main.go` 的任意位置。

### 36.3 Go AST

需要添加 Import、函数调用、结构体字段时使用：

```text
go/parser
go/ast
go/token
go/format
golang.org/x/tools/go/packages
```

### 36.4 禁止脆弱替换

不要依赖：

```go
strings.Replace(source, "lifecycle := app.New()", generated, 1)
```

用户改个变量名，模块安装就会失效。

---

## 37. Module 接口

```go
type Module interface {
    Name() string
    Version() string
    Dependencies() []string

    Plan(ctx Context) ([]Change, error)
    Apply(ctx Context) error
    Verify(ctx Context) error
}
```

`Plan` 必须先展示修改：

```text
CREATE internal/platform/redis/client.go
CREATE internal/platform/redis/config.go
UPDATE internal/app/modules_gen.go
UPDATE go.mod
UPDATE configs/config.example.yaml
UPDATE goforge.yaml
```

支持：

```bash
goforge add redis --dry-run
goforge add redis --yes
```

---

## 38. 幂等性

所有命令必须尽量幂等：

```bash
goforge add redis
goforge add redis
```

第二次应该输出：

```text
Redis module is already installed.
No changes required.
```

而不是重复：

- 依赖；
- 配置；
- 路由；
- Module 注册；
- Docker Compose 服务。

---

## 39. Doctor 设计

### 39.1 Rule 接口

```go
type Rule interface {
    ID() string
    Description() string
    Check(ctx Context) Result
    Fix(ctx Context) (Result, error)
}
```

结果：

```go
type Result struct {
    Status   Status
    Message  string
    Path     string
    Fixable  bool
    Severity Severity
}
```

### 39.2 检查分类

#### Toolchain

- Go 版本；
- toolchain；
- go.mod；
- go.sum；
- `go mod tidy`；
- Tool 依赖。

#### Layout

- cmd 入口；
- internal；
- 配置；
- Migration；
- 测试目录；
- README、CHANGELOG、LICENSE。

#### Runtime

- HTTP Timeout；
- 优雅关停；
- healthz；
- readyz；
- Request ID；
- Recovery；
- 配置校验；
- 日志初始化。

#### Data

- 数据库连接池；
- Migration；
- Context；
- Rows Close；
- 事务处理；
- Redis TTL。

#### Quality

- gofmt；
- go vet；
- lint；
- test；
- race；
- govulncheck；
- 生成代码一致性。

#### Delivery

- Docker 非 Root；
- 多阶段构建；
- CI；
- Release；
- 版本注入；
- SBOM；
- 回滚文档。

### 39.3 输出

```text
$ goforge doctor

Toolchain
  ✓ Go toolchain go1.26.5
  ✓ go.mod is tidy
  ✗ sqlc is not declared as a tool dependency

Runtime
  ✓ graceful shutdown configured
  ✓ /healthz configured
  ✗ HTTP ReadHeaderTimeout is zero

Delivery
  ✓ Docker multi-stage build
  ✗ container runs as root
  ✗ release workflow is missing

Summary: 9 passed, 4 failed, 3 fixable
```

自动修复：

```bash
goforge doctor --fix
```

只修复确定安全的内容。涉及业务代码和数据库的修改必须人工确认。

---

## 40. Upgrade 机制

脚手架不是生成一次就结束。每个项目记录模板版本：

```yaml
generator_version: v0.3.0
template_version: v0.4.2
```

升级命令：

```bash
goforge upgrade --to v0.5.0
```

升级由一系列 Migration 组成：

```go
type Migration interface {
    From() string
    To() string
    Plan(ctx Context) ([]Change, error)
    Apply(ctx Context) error
    Verify(ctx Context) error
}
```

示例：

```text
v0.3.0 → v0.4.0
- 将工具依赖迁移到 go.mod tool
- GolangCI-Lint 配置迁移到 v2
- 增加 ReadHeaderTimeout
- 更新 GitHub Actions
```

升级流程：

1. 检查 Git 工作区是否干净；
2. 创建临时分支或备份；
3. 输出变更 Plan；
4. 应用文件修改；
5. 执行 `go fix ./...`；
6. 执行格式化；
7. 执行 `go mod tidy`；
8. 执行 `doctor`；
9. 执行测试；
10. 输出需要人工处理的差异。

禁止直接用新模板覆盖用户项目。

---

## 41. CLI 安装与发布

### 41.1 安装

```bash
go install example.com/tools/goforge/cmd/goforge@latest
```

或通过 GoReleaser 提供：

- macOS amd64/arm64；
- Linux amd64/arm64；
- Windows amd64；
- Checksums；
- Homebrew Tap；
- Scoop；
- Docker 镜像（按需）。

### 41.2 CLI 自身版本

```bash
goforge version
```

输出：

```text
goforge v0.3.0
commit: 8c0d90d
built: 2026-08-04T07:00:00Z
go: go1.26.5
platform: darwin/arm64
```

---

## 42. 推荐实施路线

### Phase 1：整理基座

先从一个真实、运行稳定的项目抽取：

- Cobra；
- Viper；
- Zap；
- HTTP Server；
- 生命周期；
- healthz/readyz；
- version；
- Makefile；
- Dockerfile；
- CI；
- GoReleaser。

不要直接从想象中设计全部代码。

### Phase 2：实现 new

```bash
goforge new demo --module example.com/demo --profile api
```

验收：

```bash
cd demo
make ci
docker build .
./_output/demo version
```

全部成功。

### Phase 3：实现 add

优先：

```text
postgres
redis
telemetry
grpc
worker
```

每个模块支持：

- Dry Run；
- 幂等；
- Verify；
- Manifest 更新；
- 自动测试。

### Phase 4：实现 doctor

先做 20 条最有价值的规则，不要一开始做 200 条。

优先检查：

- Go 版本；
- go mod tidy；
- gofmt；
- HTTP Timeout；
- 优雅关停；
- healthz/readyz；
- 日志；
- 版本注入；
- Docker 非 Root；
- CI；
- Test；
- Race；
- govulncheck。

### Phase 5：实现 upgrade

先支持 CLI 自己创建的项目，不要宣称能升级所有 Go 项目。

### Phase 6：建设 Analyzer

将真正重要的架构规则变成静态分析。

---

## 43. MVP 范围

第一版只需要：

```text
goforge new
goforge add postgres
goforge add redis
goforge add telemetry
goforge doctor
goforge version
```

Profile：

```text
api
worker
cli
```

默认栈：

```text
Go 1.26 Toolchain
Gin
Cobra
Viper
Zap
pgx/v5
sqlc
Goose
go-redis
OpenTelemetry
Prometheus
GolangCI-Lint v2
govulncheck
Testcontainers
Docker
GitHub Actions
GoReleaser
```

不要第一版就开发：

- 可视化页面；
- 模板市场；
- 在线模板仓库；
- 复杂插件系统；
- 支持所有 Web 框架；
- 自动理解任意旧项目；
- 自动生成完整业务。

---

## 44. 项目生成后的验收标准

一个新生成的 API 项目必须满足：

```bash
goforge new demo --profile api
cd demo

go mod tidy
make fmt
make vet
make lint
make test
make test-race
make vuln
make build
docker build .
./_output/demo version
./_output/demo config validate
./_output/demo serve
```

并具备：

- `/healthz`；
- `/readyz`；
- `/metrics`；
- Request ID；
- Trace ID；
- Recovery；
- Access Log；
- HTTP Timeout；
- 优雅关停；
- 配置校验；
- 版本信息；
- CI；
- Docker；
- Release 配置；
- CHANGELOG；
- README；
- Migration 命令；
- 基础测试。

---

## 45. 最终技术决策

### 默认选择

| 领域 | 选择 |
|---|---|
| Go | Go 1.26 工具链 |
| CLI | Cobra |
| HTTP | Gin + net/http.Server |
| 配置 | Viper + 强类型 Config |
| 日志 | Zap |
| 错误 | 内部错误模型 + RFC 9457 |
| 数据库 | PostgreSQL + pgx/v5 |
| SQL 生成 | sqlc |
| Migration | Goose |
| Redis | go-redis |
| gRPC | grpc-go + Buf v2 |
| HTTP 契约 | OpenAPI + oapi-codegen |
| Trace | OpenTelemetry |
| Metrics | Prometheus/OpenTelemetry |
| 单元测试 | testing |
| 并发测试 | testing/synctest + race |
| 集成测试 | Testcontainers |
| 性能测试 | K6 |
| Lint | GolangCI-Lint v2 |
| 漏洞检查 | govulncheck |
| 构建入口 | Makefile |
| 容器 | Multi-stage + Non-root |
| CI | GitHub Actions/GitLab CI |
| Release | GoReleaser |
| SBOM | Syft/GoReleaser |
| 签名 | Cosign |
| 脚手架 | goforge CLI |

### 按需选择

| 能力 | 条件 |
|---|---|
| Chi/标准库路由 | 小服务或希望减少框架依赖 |
| GORM | 简单 CRUD 管理后台 |
| Fx | 组件和生命周期明显复杂 |
| Kafka/NATS/RabbitMQ | 存在可靠异步消息需求 |
| Kubernetes/Helm | 部署规模需要 |
| 自定义 Analyzer | 规范已稳定，需要强制执行 |

---

## 46. 结论

2026 年的 Go 项目基座不应只是：

```text
生成几个目录
添加 Gin
添加 Viper
写一个 main.go
```

它应该完整覆盖：

```text
初始化
开发
测试
构建
版本管理
发布
部署
观测
安全
回滚
升级
```

最合理的建设方式是：

```text
先从真实项目提炼稳定基座
  ↓
将基座变成版本化模板
  ↓
使用 goforge new 创建项目
  ↓
使用 goforge add 追加模块
  ↓
使用 goforge doctor 持续检查
  ↓
使用 CI 强制工程规范
  ↓
使用 goforge upgrade 演进旧项目
```

这样你后续开发 Realdesk、支付网关、AI 网关、AIOps、JobAgent 或新的 Go 服务时，不再重复搭建日志、配置、版本、Docker、CI/CD 和可观测性，而是直接从一个经过验证、可以持续升级的 Project Base 开始。

---

## 参考依据

本文在原有 2024 Go 项目规划基础上重新整理，并参考了截至 2026-08-04 的以下官方资料：

1. Go 1.26 Release Notes 与 Go Release History；
2. Go Modules Reference、Module Layout 与 Module Release Workflow；
3. Go `tool` directive 与 Go toolchain 文档；
4. Go `testing/synctest` 与 Go Vulnerability Management；
5. Semantic Versioning 2.0.0；
6. OpenAPI 3.2.0 与 RFC 9457；
7. Buf v2 Lint、Generate 与 Breaking Change 文档；
8. OpenTelemetry Go 状态文档；
9. sqlc pgx/v5 文档；
10. Testcontainers for Go 文档；
11. GolangCI-Lint v2 文档；
12. GitHub Actions Go CI 文档；
13. GoReleaser 文档；
14. Syft SBOM 文档。
