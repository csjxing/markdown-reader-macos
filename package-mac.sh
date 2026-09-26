#!/bin/bash

# Markdown Reader 打包脚本
# 用于生成桌面应用程序

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "========================================"
echo "    Markdown Reader 打包工具"
echo "========================================"
echo ""

# 检查 electron-builder 是否安装
if ! npm list electron-builder &> /dev/null; then
    print_warning "electron-builder 未安装，正在安装..."
    npm install --save-dev electron-builder
fi

# 检查当前平台
PLATFORM=$(uname -s)
case "$PLATFORM" in
    Darwin)
        print_info "检测到 macOS 系统"
        TARGET="mac"
        ;;
    Linux)
        print_info "检测到 Linux 系统"
        TARGET="linux"
        ;;
    MINGW*|MSYS*|CYGWIN*)
        print_info "检测到 Windows 系统"
        TARGET="win"
        ;;
    *)
        print_error "未知平台: $PLATFORM"
        exit 1
        ;;
esac

# 解析目标平台参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --mac|-m)
            TARGET="mac"
            shift
            ;;
        --win|-w)
            TARGET="win"
            shift
            ;;
        --linux|-l)
            TARGET="linux"
            shift
            ;;
        --all|-a)
            TARGET="all"
            shift
            ;;
        --help|-h)
            echo ""
            echo "使用方法: ./package.sh [选项]"
            echo ""
            echo "选项:"
            echo "  --mac, -m      打包 macOS 版本"
            echo "  --win, -w      打包 Windows 版本"
            echo "  --linux, -l    打包 Linux 版本"
            echo "  --all, -a      打包所有平台"
            echo "  --help, -h     显示帮助信息"
            echo ""
            echo "默认: 打包当前系统平台"
            exit 0
            ;;
        *)
            print_error "未知参数: $1"
            exit 1
            ;;
    esac
done

print_info "目标平台: $TARGET"

# 构建项目
print_info "正在构建项目..."
npm run build
if [ $? -ne 0 ]; then
    print_error "构建失败"
    exit 1
fi
print_success "构建完成"

# 打包应用
print_info "正在打包应用..."
case "$TARGET" in
    "mac")
        npx electron-builder --mac
        ;;
    "win")
        npx electron-builder --win
        ;;
    "linux")
        npx electron-builder --linux
        ;;
    "all")
        npx electron-builder --mac --win --linux
        ;;
esac

if [ $? -eq 0 ]; then
    print_success "打包完成！"
    print_info "安装包位于 dist/ 目录"
else
    print_error "打包失败"
    exit 1
fi