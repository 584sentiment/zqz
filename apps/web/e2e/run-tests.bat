@echo off
REM E2E 测试运行脚本 (Windows)
REM 用法: run-tests.bat [options]

echo ========================================
echo   E2E 测试运行器
echo ========================================
echo.

REM 默认参数
set MODE=run
set BROWSER=chromium
set TEST_PATH=
set HEADLESS=--headed

REM 解析命令行参数
:parse_args
if "%~1"=="" goto :run_test
if /i "%~1"=="--ui" (
    set MODE=ui
    shift
    goto :parse_args
)
if /i "%~1"=="--debug" (
    set MODE=debug
    shift
    goto :parse_args
)
if /i "%~1"=="--headed" (
    set HEADLESS=--headed
    shift
    goto :parse_args
)
if /i "%~1"=="--headless" (
    set HEADLESS=--headless
    shift
    goto :parse_args
)
if /i "%~1"=="--browser" (
    set BROWSER=%~2
    shift
    shift
    goto :parse_args
)
if /i "%~1"=="-b" (
    set BROWSER=%~2
    shift
    shift
    goto :parse_args
)
if /i "%~1"=="--test" (
    set TEST_PATH=%~2
    shift
    shift
    goto :parse_args
)
if /i "%~1"=="-t" (
    set TEST_PATH=%~2
    shift
    shift
    goto :parse_args
)
if /i "%~1"=="--help" goto :show_help
if /i "%~1"=="-h" goto :show_help

echo 未知参数: %~1
echo 使用 --help 查看帮助
exit /b 1

:show_help
echo 用法: run-tests.bat [options]
echo.
echo 选项:
echo   --ui              以 UI 模式运行测试
echo   --debug           以调试模式运行测试
echo   --headed          显示浏览器窗口 (默认)
echo   --headless        隐藏浏览器窗口
echo   --browser, -b     指定浏览器 (chromium/firefox/webkit)
echo   --test, -t        指定测试文件路径
echo   --help, -h        显示帮助信息
echo.
echo 示例:
echo   run-tests.bat                           # 运行所有测试
echo   run-tests.bat --ui                      # UI 模式运行
echo   run-tests.bat -t e2e/subscription/      # 运行 subscription 目录测试
echo   run-tests.bat -t upgrade.spec.ts        # 运行指定文件测试
exit /b 0

:run_test
REM 切换到 web 目录
cd /d "%~dp0.."

REM 运行测试
echo 运行模式: %MODE%
echo 浏览器: %BROWSER%
echo.

if "%MODE%"=="ui" (
    echo 启动 UI 模式...
    npx playwright test --ui %TEST_PATH%
) else if "%MODE%"=="debug" (
    echo 启动调试模式...
    npx playwright test --debug %HEADLESS% --project=%BROWSER% %TEST_PATH%
) else (
    echo 运行测试...
    npx playwright test %HEADLESS% --project=%BROWSER% %TEST_PATH%
)

if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================
    echo   测试完成
    echo ========================================
    echo.
    echo 查看测试报告: npx playwright show-report
)
