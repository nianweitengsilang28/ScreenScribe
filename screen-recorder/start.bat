@echo off
REM 清除 VS Code 终端可能设置的 ELECTRON_RUN_AS_NODE 环境变量
set ELECTRON_RUN_AS_NODE=
echo 🎀 启动 截屏识字幕...
npx electron .
pause
