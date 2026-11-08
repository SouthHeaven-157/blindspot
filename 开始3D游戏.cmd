@echo off
chcp 65001 >nul
where node >nul 2>nul
if not errorlevel 1 (
  node "%~dp0phase\launch.cjs"
) else (
  if exist "D:\新建文件夹 (2)\node.exe" (
    "D:\新建文件夹 (2)\node.exe" "%~dp0phase\launch.cjs"
  ) else (
    echo 请先安装 Node.js 22 或更新版本，再启动游戏。
    pause
    exit /b 1
  )
)
if errorlevel 1 pause
