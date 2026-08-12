.DEFAULT_GOAL := help

BUGRAIL_DIR := bugrail
BUGRAIL_PORT ?= 3011
BUGRAIL_DEV_PORT := $(shell node scripts/find-free-port.mjs $(BUGRAIL_PORT) 2>/dev/null || echo $(BUGRAIL_PORT))
BUGRAIL_URL := http://127.0.0.1:$(BUGRAIL_DEV_PORT)

BLUE := \033[1;34m
CYAN := \033[1;36m
GREEN := \033[1;32m
YELLOW := \033[1;33m
DIM := \033[2m
RESET := \033[0m

.PHONY: help dev dev-all dev-frontend dev-backend dev-web frontend backend bugrail-init bugrail-dev bugrail-desktop bugrail-build bugrail-build-desktop bugrail-test bugrail-upstream-status bugrail-upstream-sync bugrail-upstream-finalize

help: ## 显示可用的开发命令
	@printf "\n$(BLUE)🧚 Code: Bugrail · Development Commands$(RESET)\n"
	@printf "$(DIM)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(RESET)\n\n"
	@printf "  $(GREEN)make dev$(RESET)           🚀 启动 Bugrail 开发预览（推荐）\n"
	@printf "  $(GREEN)make dev-all$(RESET)       🧩 同 make dev\n"
	@printf "  $(CYAN)make dev-frontend$(RESET)  🖥️  同 make dev（单进程 Next 应用，无独立前端）\n"
	@printf "  $(CYAN)make dev-backend$(RESET)   🧠 同 make dev（单进程 Next 应用，无独立后端）\n"
	@printf "\n  $(YELLOW)快捷别名$(RESET)\n"
	@printf "  make frontend      → make dev-frontend\n"
	@printf "  make backend       → make dev-backend\n"
	@printf "  make dev-web       → make dev-all（兼容旧命令）\n"
	@printf "\n  $(YELLOW)Code: Bugrail$(RESET)\n"
	@printf "  $(CYAN)make bugrail-init$(RESET)              初始化子模块并安装依赖\n"
	@printf "  $(CYAN)make bugrail-dev$(RESET)              启动 Web 预览 · $(BUGRAIL_URL)（端口自动 +1 探测）\n"
	@printf "  $(CYAN)make bugrail-desktop$(RESET)         启动 Tauri 桌面开发版\n"
	@printf "  $(CYAN)make bugrail-test$(RESET)             运行 Bugrail 前端测试\n"
	@printf "  $(CYAN)make bugrail-build$(RESET)            构建 Bugrail 静态前端\n"
	@printf "  $(CYAN)make bugrail-build-desktop$(RESET)   构建本地 Tauri 桌面安装包\n"
	@printf "  $(CYAN)make bugrail-upstream-status$(RESET)  检查 CodeG 最新 release tag\n"
	@printf "  $(CYAN)make bugrail-upstream-sync$(RESET)   同步最新 CodeG release（可 TAG=vX.Y.Z）\n"
	@printf "  $(CYAN)make bugrail-upstream-finalize$(RESET) 标记某 release 为基线（需 TAG=vX.Y.Z）\n"
	@printf "\n$(DIM)🛑 使用 Ctrl+C 停止当前进程。首次运行 Bugrail 请先执行 make bugrail-init。$(RESET)\n\n"

dev: dev-all ## 启动 Bugrail 开发预览（推荐）

dev-all: bugrail-dev ## 同 make dev

dev-frontend: bugrail-dev ## 同 make dev（单进程 Next 应用，无独立前端）

dev-backend: bugrail-dev ## 同 make dev（单进程 Next 应用，无独立后端）

dev-web: dev-all ## 兼容旧的前后端联合启动命令

frontend: dev-frontend ## 前端快捷别名

backend: dev-backend ## 后端快捷别名

bugrail-init: ## 初始化 Bugrail 子模块并安装锁定依赖
	@git submodule update --init --recursive $(BUGRAIL_DIR)
	@pnpm --dir $(BUGRAIL_DIR) install --frozen-lockfile

bugrail-dev: ## 启动 Code: Bugrail Web 预览（自动选择空闲端口）
	@printf "\n$(GREEN)🚀 正在启动 Code: Bugrail 开发预览…$(RESET)\n"
	@printf "$(DIM)   页面地址  $(BUGRAIL_URL)$(RESET)\n"
	@printf "$(DIM)   端口 $(BUGRAIL_PORT) 被占用时自动 +1 探测；首次运行请先 make bugrail-init。$(RESET)\n\n"
	@pnpm --dir $(BUGRAIL_DIR) exec next dev --turbopack --hostname 127.0.0.1 --port $(BUGRAIL_DEV_PORT)

bugrail-desktop: bugrail-init ## 启动 Code: Bugrail Tauri 桌面开发版
	@pnpm --dir $(BUGRAIL_DIR) tauri dev

bugrail-test: ## 运行 Code: Bugrail 前端测试
	@pnpm --dir $(BUGRAIL_DIR) test

bugrail-build: ## 构建 Code: Bugrail 静态前端
	@pnpm --dir $(BUGRAIL_DIR) build

bugrail-build-desktop: bugrail-init ## 构建本地 Code: Bugrail Tauri 桌面安装包
	@pnpm --dir $(BUGRAIL_DIR) tauri build --debug --config '{"bundle":{"createUpdaterArtifacts":false}}'

bugrail-upstream-status: ## 检查 CodeG 最新 release tag
	@pnpm --dir $(BUGRAIL_DIR) upstream:status

BUGRAIL_UPSTREAM_TAG_ARGS := $(if $(TAG),--tag $(TAG),)

bugrail-upstream-sync: ## 同步 CodeG release（默认最新，可指定 TAG=vX.Y.Z）
	@pnpm --dir $(BUGRAIL_DIR) sync:upstream prepare $(BUGRAIL_UPSTREAM_TAG_ARGS)

bugrail-upstream-finalize: ## 将某个 CodeG release 标记为基线（需指定 TAG=vX.Y.Z）
	@test -n "$(TAG)" || (echo "✗ 请指定 make bugrail-upstream-finalize TAG=vX.Y.Z"; exit 1)
	@pnpm --dir $(BUGRAIL_DIR) sync:upstream finalize --tag $(TAG)
