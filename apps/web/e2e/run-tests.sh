#!/bin/bash

# E2E 测试运行脚本
# 用法: ./run-tests.sh [options]

set -e

echo "========================================"
echo "  E2E 测试运行器"
echo "========================================"
echo ""

# 默认参数
MODE="run"
BROWSER="chromium"
TEST_PATH=""
HEADLESS="--headed"
DEBUG=""

# 解析命令行参数
while [[ $# -gt 0 ]]; do
  case $1 in
    --ui)
      MODE="ui"
      shift
      ;;
    --debug)
      MODE="debug"
      shift
      ;;
    --headed)
      HEADLESS="--headed"
      shift
      ;;
    --headless)
      HEADLESS="--headless"
      shift
      ;;
    --browser|-b)
      BROWSER="$2"
      shift 2
      ;;
    --test|-t)
      TEST_PATH="$2"
      shift 2
      ;;
    --help|-h)
      echo "用法: ./run-tests.sh [options]"
      echo ""
      echo "选项:"
      echo "  --ui              以 UI 模式运行测试"
      echo "  --debug           以调试模式运行测试"
      echo "  --headed          显示浏览器窗口 (默认)"
      echo "  --headless        隐藏浏览器窗口"
      echo "  --browser, -b     指定浏览器 (chromium/firefox/webkit)"
      echo "  --test, -t        指定测试文件路径"
      echo "  --help, -h        显示帮助信息"
      echo ""
      echo "示例:"
      echo "  ./run-tests.sh                           # 运行所有测试"
      echo "  ./run-tests.sh --ui                      # UI 模式运行"
      echo "  ./run-tests.sh -t e2e/subscription/      # 运行 subscription 目录测试"
      echo "  ./run-tests.sh -t upgrade.spec.ts        # 运行指定文件测试"
      exit 0
      ;;
    *)
      echo "未知参数: $1"
      echo "使用 --help 查看帮助"
      exit 1
      ;;
  esac
done

# 切换到 web 目录
cd "$(dirname "$0")/.."

# 检查依赖
if ! command -v npx &> /dev/null; then
    echo "错误: npx 未安装"
    exit 1
fi

# 运行测试
echo "运行模式: $MODE"
echo "浏览器: $BROWSER"
echo ""

case $MODE in
  ui)
    echo "启动 UI 模式..."
    npx playwright test --ui $TEST_PATH
    ;;
  debug)
    echo "启动调试模式..."
    npx playwright test --debug $HEADLESS --project=$BROWSER $TEST_PATH
    ;;
  run)
    echo "运行测试..."
    npx playwright test $HEADLESS --project=$BROWSER $TEST_PATH
    ;;
esac

# 显示报告
if [ $? -eq 0 ]; then
    echo ""
    echo "========================================"
    echo "  测试完成"
    echo "========================================"
    echo ""
    echo "查看测试报告: npx playwright show-report"
fi
