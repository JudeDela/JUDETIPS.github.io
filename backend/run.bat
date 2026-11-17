@echo off
title GoalInsight Backend API Server
color 0B
cd /d "%~dp0"

echo ===================================================================
echo               GOALINSIGHT FASTAPI BACKEND SERVER
echo         Swagger API Docs: http://127.0.0.1:8000/docs
echo ===================================================================
echo.

if not exist ".venv\Scripts\python.exe" (
    echo [ERROR] Virtual environment not found in %~dp0.venv
    echo Run the root RUN_GOALINSIGHT.bat first to set up the environment.
    pause
    exit /b 1
)

".venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

echo.
echo [INFO] Backend server stopped.
pause
