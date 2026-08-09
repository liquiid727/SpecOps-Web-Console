.DEFAULT_GOAL := help

CLI_GUI_DIR := cli-gui
BUGRAIL_DIR := bugrail
BUGRAIL_PORT ?= 3011
FRONTEND_URL := http://127.0.0.1:3000
BACKEND_URL := http://127.0.0.1:3001
HEALTH_URL := $(BACKEND_URL)/health
BUGRAIL_URL := http://127.0.0.1:$(BUGRAIL_PORT)

BLUE := \033[1;34m
CYAN := \033[1;36m
GREEN := \033[1;32m
YELLOW := \033[1;33m
DIM := \033[2m
RESET := \033[0m

.PHONY: help dev dev-all dev-frontend dev-backend dev-web frontend backend bugrail-init bugrail-dev bugrail-desktop bugrail-build bugrail-build-desktop bugrail-test bugrail-upstream-status bugrail-upstream-sync bugrail-upstream-finalize

help: ## 显示可用的开发命令
	@printf "\n$(BLUE)🧚 SpecOS CLI GUI · Development Commands$(RESET)\n"
	@printf "$(DIM)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(RESET)\n\n"
	@printf "  $(GREEN)make dev$(RESET)           🚀 前后端一起启动（推荐，含健康检查）\n"
	@printf "  $(GREEN)make dev-all$(RESET)       🧩 同 make dev，统一管理两个进程\n"
	@printf "  $(CYAN)make dev-frontend$(RESET)  🖥️  仅启动前端 · $(FRONTEND_URL)\n"
	@printf "  $(CYAN)make dev-backend$(RESET)   🧠 仅启动后端 · $(BACKEND_URL)\n"
	@printf "\n  $(YELLOW)快捷别名$(RESET)\n"
	@printf "  make frontend      → make dev-frontend\n"
	@printf "  make backend       → make dev-backend\n"
	@printf "  make dev-web       → make dev-all（兼容旧命令）\n"
	@printf "\n  $(YELLOW)Code: Bugrail$(RESET)\n"
	@printf "  $(CYAN)make bugrail-init$(RESET)              初始化子模块并安装依赖\n"
	@printf "  $(CYAN)make bugrail-dev$(RESET)              启动 Web 预览 · $(BUGRAIL_URL)\n"
	@printf "  $(CYAN)make bugrail-desktop$(RESET)         启动 Tauri 桌面开发版\n"
	@printf "  $(CYAN)make bugrail-test$(RESET)             运行 Bugrail 前端测试\n"
	@printf "  $(CYAN)make bugrail-build$(RESET)            构建 Bugrail 静态前端\n"
	@printf "  $(CYAN)make bugrail-build-desktop$(RESET)   构建本地 Tauri 桌面安装包\n"
	@printf "  $(CYAN)make bugrail-upstream-status$(RESET)  检查 CodeG 最新 release tag\n"
	@printf "  $(CYAN)make bugrail-upstream-sync$(RESET)   同步最新 CodeG release（可 TAG=vX.Y.Z）\n"
	@printf "  $(CYAN)make bugrail-upstream-finalize$(RESET) 标记某 release 为基线（需 TAG=vX.Y.Z）\n"
	@printf "\n$(DIM)💡 独立启动时，请分别打开两个终端运行前端和后端命令。$(RESET)\n"
	@printf "$(DIM)🛑 使用 Ctrl+C 停止当前进程。首次运行 Bugrail 请先执行 make bugrail-init。$(RESET)\n\n"

dev: dev-all ## 前后端一起启动（推荐）

dev-all: ## 前后端一起启动，并等待服务就绪
	@printf "\n$(GREEN)🚀 正在启动 SpecOS CLI GUI 开发环境…$(RESET)\n"
	@printf "$(DIM)   前端  $(FRONTEND_URL)$(RESET)\n"
	@printf "$(DIM)   后端  $(BACKEND_URL) · 健康检查 $(HEALTH_URL)$(RESET)\n"
	@printf "$(DIM)   两个进程将统一管理；任一退出时会安全停止另一端。$(RESET)\n\n"
	@npm --prefix $(CLI_GUI_DIR) run dev:status

dev-frontend: ## 仅启动 Vite 前端
	@printf "\n$(CYAN)🖥️  正在独立启动前端…$(RESET)\n"
	@printf "$(DIM)   页面地址  $(FRONTEND_URL)$(RESET)\n"
	@printf "$(YELLOW)⚠️  API 与 WebSocket 将代理到 $(BACKEND_URL)，请另开终端运行 make dev-backend。$(RESET)\n\n"
	@npm --prefix $(CLI_GUI_DIR) run dev:client

dev-backend: ## 仅启动 Session Manager 后端
	@printf "\n$(CYAN)🧠 正在独立启动 Session Manager…$(RESET)\n"
	@printf "$(DIM)   API 地址    $(BACKEND_URL)$(RESET)\n"
	@printf "$(DIM)   健康检查    $(HEALTH_URL)$(RESET)\n"
	@printf "$(YELLOW)⚠️  当前只启动后端；需要界面时请另开终端运行 make dev-frontend。$(RESET)\n\n"
	@npm --prefix $(CLI_GUI_DIR) run dev:server

dev-web: dev-all ## 兼容旧的前后端联合启动命令

frontend: dev-frontend ## 前端快捷别名

backend: dev-backend ## 后端快捷别名

bugrail-init: ## 初始化 Bugrail 子模块并安装锁定依赖
	@git submodule update --init --recursive $(BUGRAIL_DIR)
	@pnpm --dir $(BUGRAIL_DIR) install --frozen-lockfile

bugrail-dev: ## 启动 Code: Bugrail Web 预览
	@pnpm --dir $(BUGRAIL_DIR) exec next dev --turbopack --hostname 127.0.0.1 --port $(BUGRAIL_PORT)

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
