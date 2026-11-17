@echo off
setlocal
title JUDETIPS Launcher
color 0B

cd /d "%~dp0"

echo ===================================================================
echo               JUDETIPS FOOTBALL INTELLIGENCE PLATFORM
echo          Dixon-Coles and Poisson Modeling - API-Sports Live
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
    echo [NOTICE] Node.js not detected. You can view the live website directly!
    start "" "%~dp0index.html"
    exit /b 0
)

:: Check npm command
set "NPM_CMD=npm"
where npm.cmd >nul 2>&1
if %errorlevel% equ 0 (
    set "NPM_CMD=npm.cmd"
)

echo [1/3] Starting JUDETIPS Backend (FastAPI + API-Sports Provider)...
cd /d "%BACKEND%"
if not exist ".venv" (
    echo [*] Creating virtual environment...
    %PY_CMD% -m venv .venv
)
call ".\.venv\Scripts\activate.bat"
start "JUDETIPS Backend" /min uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

echo [2/3] Opening JUDETIPS Landing Page in browser...
timeout /t 2 /nobreak >nul
start "" "%~dp0index.html"

echo ===================================================================
echo   JUDETIPS is now running!
echo   Landing Page: file:///%~dp0index.html
echo   Backend API:  http://localhost:8000/docs
echo ===================================================================
pause
