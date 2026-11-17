@echo off
title GoalInsight Next.js Frontend
color 0E
cd /d "%~dp0"

echo ===================================================================
echo               GOALINSIGHT WEB DASHBOARD
echo         Local Web App: http://localhost:3000
echo ===================================================================
echo.

if not exist "node_modules" (
    echo [ERROR] Frontend node_modules not found.
    echo Run the root RUN_GOALINSIGHT.bat first to install dependencies.
    pause
    exit /b 1
)

:: Check npm command
set "NPM_CMD=npm"
where npm.cmd >nul 2>&1
if %errorlevel% equ 0 (
    set "NPM_CMD=npm.cmd"
)

call %NPM_CMD% run dev

echo.
echo [INFO] Frontend server stopped.
pause
