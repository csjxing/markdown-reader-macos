#!/bin/bash

# Markdown Reader 完整打包脚本
# 使用方法: ./build-dmg.sh

set -e

APP_NAME="Markdown Reader"
VERSION="2.0.1"

echo "=========================================="
echo "  Markdown Reader DMG 打包脚本"
echo "=========================================="
echo ""

# 步骤1: 构建项目
echo "==> [1/3] 构建项目..."
npm run build

# 步骤2: 打包应用（生成 .app）
echo "==> [2/3] 打包 macOS 应用..."
rm -rf dist
npx electron-builder --mac --dir

# 步骤3: 创建 DMG
echo "==> [3/3] 创建 DMG 安装程序..."

DMG_DIR="dist/dmg_temp"
APP_PATH="dist/mac-arm64/${APP_NAME}.app"
DMG_PATH="dist/${APP_NAME}-${VERSION}.dmg"

# 清理
rm -rf "${DMG_DIR}"
rm -f "${DMG_PATH}"

# 创建 DMG 内容目录
mkdir -p "${DMG_DIR}"
cp -R "${APP_PATH}" "${DMG_DIR}/"
ln -sf /Applications "${DMG_DIR}/Applications"

# 创建 DMG
hdiutil create -volname "${APP_NAME}" \
    -srcfolder "${DMG_DIR}" \
    -ov -format UDZO \
    "${DMG_PATH}"

# 清理临时文件
rm -rf "${DMG_DIR}"

echo ""
echo "=========================================="
echo "  打包完成!"
echo "=========================================="
echo ""
echo "DMG 文件: ${DMG_PATH}"
echo ""
ls -lh "${DMG_PATH}"