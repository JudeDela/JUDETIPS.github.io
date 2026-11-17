@echo off
setlocal
title GoalInsight Launcher
color 0A

cd /d "%~dp0"

echo ===================================================================
echo               GOALINSIGHT FOOTBALL INTELLIGENCE PLATFORM
echo          Dixon-Coles and Poisson Modeling - football-data.org
echo ===================================================================
echo.

set "BACKEND=%~dp0backend"
set "FRONTEND=%~dp0frontend"

:: Check Python
set "PY_CMD="
where py >nul 2>&1
if %errorlevel% equ 0 (
    set "PY_CMD=py"
) else (
    where python >nul 2>&1
    if %errorlevel% equ 0 (
        set "PY_CMD=python"
    ) else (
        echo [ERROR] Python was not found on your system PATH.
        echo Please install Python 3.10 or later from python.org.
        pause
        exit /b 1
    )
)

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js was not found on your system PATH.
    echo Please install Node.js 18 or later from nodejs.org.
    pause
    exit /b 1
)

:: Check npm command
set "NPM_CMD=npm"
where npm.cmd >nul 2>&1
if %errorlevel% equ 0 (
    set "NPM_CMD=npm.cmd"
)

echo [1/4] Verifying Python backend environment...
if not exist "%BACKEND%\.venv\Scripts\python.exe" (
    echo       Creating Python virtual environment in backend\.venv...
    %PY_CMD% -m venv "%BACKEND%\.venv"
    if %errorlevel% neq 0 goto error
)

echo [2/4] Checking Python backend dependencies...
"%BACKEND%\.venv\Scripts\python.exe" -m pip install -r "%BACKEND%\requirements.txt" --quiet
if %errorlevel% neq 0 goto error

echo [3/4] Verifying frontend dependencies...
if not exist "%FRONTEND%\node_modules" (
    echo       Installing frontend packages, this may take a moment...
    cd /d "%FRONTEND%"
    call %NPM_CMD% install
    if %errorlevel% neq 0 goto error
    cd /d "%~dp0"
)

echo [4/4] Launching GoalInsight services...
echo.
echo - Starting FastAPI Backend Server on http://localhost:8000
start "GoalInsight Backend" "%BACKEND%\run.bat"

ping 127.0.0.1 -n 4 >nul

echo - Starting Next.js Web Frontend on http://localhost:3000
start "GoalInsight Frontend" "%FRONTEND%\run.bat"

ping 127.0.0.1 -n 5 >nul

echo - Opening default browser to GoalInsight Dashboard...
start "" "http://localhost:3000"

echo.
echo ===================================================================
echo     GOALINSIGHT IS NOW RUNNING!
echo     - Web Dashboard: http://localhost:3000
echo     - Interactive API Docs: http://localhost:8000/docs
echo     Keep both terminal windows open while using the application.
echo ===================================================================
echo.
pause
exit /b 0

:error
echo.
echo [ERROR] An installation or startup step encountered an issue.
echo Review the error messages above for details.
pause
exit /b 1
