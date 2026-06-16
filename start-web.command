#!/bin/bash

# LinguaChat 浏览器快速预览脚本
# 双击此文件仅启动前端界面（不启动 Electron）

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

cd "$PROJECT_DIR"

# 检查 node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖中..."
    npm install
fi

echo ""
echo "🚀 启动浏览器预览模式..."
echo "   打开 http://localhost:5173"
echo "   (Ctrl+C 停止)"
echo ""

npx vite --config vite.config.ts --open
