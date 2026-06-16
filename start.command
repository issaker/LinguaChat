#!/bin/bash

# LinguaChat 开发启动脚本
# 双击此文件快速启动开发环境

# ============================================
# 配置
# ============================================
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
MODE="${1:-dev}"  # dev = 完整Electron, web = 仅浏览器

# ============================================
# 颜色输出
# ============================================
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     LinguaChat · 语伴                ║${NC}"
echo -e "${BLUE}║     开发环境启动中...                 ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
echo ""

# ============================================
# 检查 Node.js
# ============================================
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}❌ 未找到 Node.js，请先安装: https://nodejs.org/${NC}"
    echo "按 Enter 键退出..."
    read -r
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node --version)${NC}"

# ============================================
# 检查 node_modules
# ============================================
if [ ! -d "$PROJECT_DIR/node_modules" ]; then
    echo -e "${YELLOW}📦 正在安装依赖...${NC}"
    cd "$PROJECT_DIR" && npm install
    if [ $? -ne 0 ]; then
        echo -e "${YELLOW}❌ 安装依赖失败${NC}"
        echo "按 Enter 键退出..."
        read -r
        exit 1
    fi
    echo -e "${GREEN}✓ 依赖安装完成${NC}"
fi

# ============================================
# 清理残留进程
# ============================================
cleanup() {
    echo ""
    echo -e "${YELLOW}正在关闭 LinguaChat...${NC}"
    if [ "$MODE" = "dev" ]; then
        pkill -f "electron ." 2>/dev/null
    fi
    pkill -f "vite" 2>/dev/null
    exit 0
}
trap cleanup SIGINT SIGTERM

# ============================================
# 启动
# ============================================
cd "$PROJECT_DIR"

if [ "$MODE" = "web" ]; then
    # 仅启动 Vite 前端（浏览器预览）
    echo -e "${GREEN}🚀 启动前端开发服务器 (浏览器模式)...${NC}"
    echo -e "${GREEN}   打开 http://localhost:5173${NC}"
    echo -e "${YELLOW}   提示: API 调用在浏览器中可能受 CORS 限制${NC}"
    echo ""
    npx vite --config vite.config.ts
else
    # 完整 Electron 模式
    echo -e "${GREEN}🚀 启动 Electron + Vite 开发环境...${NC}"
    echo ""
    npm run dev
fi
