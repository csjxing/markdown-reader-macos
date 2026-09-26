@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

:: Markdown Reader 启动脚本
:: 用于 Windows 系统

:: 获取脚本所在目录
cd /d "%~dp0"

echo.
echo ========================================
echo     Markdown Reader 启动程序
echo ========================================
echo.

:: 检查 Node.js 是否安装
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js
    echo [信息] 请访问 https://nodejs.org/ 下载安装
    pause
    exit /b 1
)

:: 显示 Node.js 版本
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo [信息] Node.js 版本: %NODE_VERSION%

:: 检查 npm 是否安装
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 npm，请先安装 npm
    pause
    exit /b 1
)

:: 显示 npm 版本
for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
echo [信息] npm 版本: %NPM_VERSION%

:: 检查 node_modules 是否存在
if not exist "node_modules" (
    echo [警告] 未检测到依赖，正在安装...
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
    echo [成功] 依赖安装完成
) else (
    :: 检查关键依赖
    if not exist "node_modules\electron" (
        echo [警告] 检测到依赖不完整，正在重新安装...
        call npm install
        if %errorlevel% neq 0 (
            echo [错误] 依赖安装失败
            pause
            exit /b 1
        )
        echo [成功] 依赖安装完成
    ) else (
        echo [信息] 依赖已存在，跳过安装
    )
)

:: 解析参数
set MODE=dev
:parse_args
if "%~1"=="" goto :run
if /i "%~1"=="--build" (
    set MODE=build
    shift
    goto :parse_args
)
if /i "%~1"=="-b" (
    set MODE=build
    shift
    goto :parse_args
)
if /i "%~1"=="--preview" (
    set MODE=preview
    shift
    goto :parse_args
)
if /i "%~1"=="-p" (
    set MODE=preview
    shift
    goto :parse_args
)
if /i "%~1"=="--help" (
    goto :show_help
)
if /i "%~1"=="-h" (
    goto :show_help
)
echo [错误] 未知参数: %~1
pause
exit /b 1

:show_help
echo.
echo 使用方法: start.bat [选项]
echo.
echo 选项:
echo   --build, -b    构建生产版本
echo   --preview, -p  预览生产版本
echo   --help, -h     显示帮助信息
echo.
echo 默认: 启动开发服务器
pause
exit /b 0

:run
echo.
if "%MODE%"=="dev" (
    echo [信息] 正在启动开发服务器...
    call npm run dev
) else if "%MODE%"=="build" (
    echo [信息] 正在构建生产版本...
    call npm run build
    if %errorlevel% equ 0 (
        echo [成功] 构建完成！
        echo [信息] 运行 'start.bat --preview' 来预览构建结果
    )
) else if "%MODE%"=="preview" (
    echo [信息] 正在启动预览...
    call npm run preview
)

pause