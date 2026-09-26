#!/bin/bash

# Markdown Reader 启动脚本
# 用于 Mac/Linux 系统

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "========================================"
echo "    Markdown Reader 启动程序"
echo "========================================"
echo ""

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    print_error "未检测到 Node.js，请先安装 Node.js"
    print_info "推荐使用 nvm 安装: curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
    exit 1
fi

NODE_VERSION=$(node -v)
print_info "Node.js 版本: $NODE_VERSION"

# 检查 npm 是否安装
if ! command -v npm &> /dev/null; then
    print_error "未检测到 npm，请先安装 npm"
    exit 1
fi

NPM_VERSION=$(npm -v)
print_info "npm 版本: $NPM_VERSION"

# 检查 node_modules 是否存在
if [ ! -d "node_modules" ]; then
    print_warning "未检测到依赖，正在安装..."
    npm install
    if [ $? -ne 0 ]; then
        print_error "依赖安装失败"
        exit 1
    fi
    print_success "依赖安装完成"
else
    # 检查关键依赖是否存在
    if [ ! -d "node_modules/electron" ] || [ ! -d "node_modules/react" ]; then
        print_warning "检测到依赖不完整，正在重新安装..."
        npm install
        if [ $? -ne 0 ]; then
            print_error "依赖安装失败"
            exit 1
        fi
        print_success "依赖安装完成"
    else
        print_info "依赖已存在，跳过安装"
    fi
fi

# 解析参数
MODE="dev"
while [[ $# -gt 0 ]]; do
    case $1 in
        --build|-b)
            MODE="build"
            shift
            ;;
        --preview|-p)
            MODE="preview"
            shift
            ;;
        --help|-h)
            echo ""
            echo "使用方法: ./start.sh [选项]"
            echo ""
            echo "选项:"
            echo "  --build, -b    构建生产版本"
            echo "  --preview, -p  预览生产版本"
            echo "  --help, -h     显示帮助信息"
            echo ""
            echo "默认: 启动开发服务器"
            exit 0
            ;;
        *)
            print_error "未知参数: $1"
            exit 1
            ;;
    esac
done

echo ""
case $MODE in
    "dev")
        print_info "正在启动开发服务器..."
        npm run dev
        ;;
    "build")
        print_info "正在构建生产版本..."
        npm run build
        if [ $? -eq 0 ]; then
            print_success "构建完成！"
            print_info "运行 './start.sh --preview' 来预览构建结果"
        fi
        ;;
    "preview")
        print_info "正在启动预览..."
        npm run preview
        ;;
esac