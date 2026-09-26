# Markdown Reader Makefile
# 便捷的开发命令集合

.PHONY: help install dev build preview clean start

# 默认目标
help:
	@echo "Markdown Reader - 命令帮助"
	@echo ""
	@echo "使用方法: make [命令]"
	@echo ""
	@echo "可用命令:"
	@echo "  install    安装依赖"
	@echo "  dev        启动开发服务器"
	@echo "  build      构建生产版本"
	@echo "  preview    预览生产版本"
	@echo "  clean      清理构建输出"
	@echo "  start      快速启动 (检查依赖后运行开发服务器)"
	@echo ""
	@echo "示例:"
	@echo "  make dev     # 启动开发服务器"
	@echo "  make build   # 构建应用"

# 安装依赖
install:
	@echo "[INFO] 正在安装依赖..."
	npm install
	@echo "[SUCCESS] 依赖安装完成"

# 启动开发服务器
dev:
	@echo "[INFO] 正在启动开发服务器..."
	npm run dev

# 构建生产版本
build:
	@echo "[INFO] 正在构建生产版本..."
	npm run build
	@echo "[SUCCESS] 构建完成！"

# 预览生产版本
preview:
	@echo "[INFO] 正在预览生产版本..."
	npm run preview

# 清理构建输出
clean:
	@echo "[INFO] 正在清理构建输出..."
	rm -rf out
	@echo "[SUCCESS] 清理完成"

# 快速启动 (自动检查依赖)
start:
	@echo "[INFO] 检查依赖..."
	@if [ ! -d "node_modules" ]; then \
		echo "[WARNING] 依赖未安装，正在安装..."; \
		npm install; \
	fi
	@echo "[INFO] 启动开发服务器..."
	npm run dev