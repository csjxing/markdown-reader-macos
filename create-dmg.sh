#!/bin/bash

# Markdown Reader DMG 创建脚本
# 使用方法: ./create-dmg.sh

set -e

APP_NAME="Markdown Reader"
VERSION="2.0.1"
DIST_DIR="dist"
APP_PATH="${DIST_DIR}/mac-arm64/${APP_NAME}.app"
DMG_NAME="${APP_NAME}-${VERSION}.dmg"
DMG_DIR="${DIST_DIR}/dmg_contents"

echo "==> 创建 DMG 安装程序..."

# 检查应用是否存在
if [ ! -d "${APP_PATH}" ]; then
    echo "错误: 找不到应用 ${APP_PATH}"
    echo "请先运行: npm run build && npm run package:mac"
    exit 1
fi

# 清理旧的 DMG 文件
rm -f "${DIST_DIR}/${DMG_NAME}"

# 创建临时 DMG 目录
rm -rf "${DMG_DIR}"
mkdir -p "${DMG_DIR}"

# 复制应用到 DMG 目录
echo "==> 复制应用..."
cp -R "${APP_PATH}" "${DMG_DIR}/"

# 创建 Applications 符号链接
echo "==> 创建 Applications 链接..."
ln -sf /Applications "${DMG_DIR}/Applications"

# 创建 DMG
echo "==> 创建 DMG 文件..."
hdiutil create -volname "${APP_NAME}" \
    -srcfolder "${DMG_DIR}" \
    -ov -format UDZO \
    "${DIST_DIR}/${DMG_NAME}"

# 清理临时目录
rm -rf "${DMG_DIR}"

echo ""
echo "==> DMG 创建成功!"
echo "==> 文件位置: ${DIST_DIR}/${DMG_NAME}"