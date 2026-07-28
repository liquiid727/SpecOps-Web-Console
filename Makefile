.DEFAULT_GOAL := help

CLI_GUI_DIR := cli-gui
FRONTEND_URL := http://127.0.0.1:3000
BACKEND_URL := http://127.0.0.1:3001
HEALTH_URL := $(BACKEND_URL)/health

BLUE := \033[1;34m
CYAN := \033[1;36m
GREEN := \033[1;32m
YELLOW := \033[1;33m
DIM := \033[2m
RESET := \033[0m

.PHONY: help dev dev-all dev-frontend dev-backend dev-web frontend backend

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
	@printf "\n$(DIM)💡 独立启动时，请分别打开两个终端运行前端和后端命令。$(RESET)\n"
	@printf "$(DIM)🛑 使用 Ctrl+C 停止当前进程。首次运行请先在 cli-gui 安装依赖。$(RESET)\n\n"

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
