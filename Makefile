.DEFAULT_GOAL := help

WEB_DIR := spec-web-ui
WEB_PORT ?= 3000

BLUE := \033[1;34m
CYAN := \033[1;36m
GREEN := \033[1;32m
DIM := \033[2m
RESET := \033[0m

.PHONY: help install build test dev web

help: ## 显示可用的开发命令
	@printf "\n$(BLUE)SpecOS · Development Commands$(RESET)\n"
	@printf "$(DIM)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(RESET)\n\n"
	@printf "  $(GREEN)make install$(RESET)   安装仓库依赖\n"
	@printf "  $(GREEN)make dev$(RESET)       启动 spec-web-ui · http://localhost:$(WEB_PORT)\n"
	@printf "  $(CYAN)make build$(RESET)     构建 packages 工作区\n"
	@printf "  $(CYAN)make test$(RESET)      运行工作区测试\n"
	@printf "\n$(DIM)Code: Bugrail 已独立到 ~/code/bugrail，请在那个目录运行 make dev。$(RESET)\n\n"

install: ## 安装仓库依赖
	@npm install

build: ## 构建 packages 工作区
	@npm run build

test: ## 运行工作区测试
	@npm test

dev: web ## 启动 spec-web-ui

web: ## 启动 spec-web-ui
	@printf "\n$(GREEN)正在启动 SpecOS web workspace…$(RESET)\n"
	@printf "$(DIM)   页面地址  http://localhost:$(WEB_PORT)$(RESET)\n\n"
	@npm --prefix $(WEB_DIR) run dev
