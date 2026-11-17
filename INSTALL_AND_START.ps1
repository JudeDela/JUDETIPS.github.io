# GoalInsight PowerShell 1-Click Runner
# Run with: powershell -ExecutionPolicy Bypass -File .\INSTALL_AND_START.ps1

Write-Host "===================================================================" -ForegroundColor Green
Write-Host "          GOALINSIGHT FOOTBALL INTELLIGENCE PLATFORM               " -ForegroundColor Green
Write-Host "===================================================================" -ForegroundColor Green

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

$BackendDir = Join-Path $Root "backend"
$FrontendDir = Join-Path $Root "frontend"

# Check Python
Write-Host "`n[1/4] Checking Python environment..." -ForegroundColor Cyan
$PyExe = Join-Path $BackendDir ".venv\Scripts\python.exe"
if (-not (Test-Path $PyExe)) {
    Write-Host "Creating Python virtual environment in backend\.venv..." -ForegroundColor Yellow
    py -m venv "$BackendDir\.venv"
}

Write-Host "`n[2/4] Installing backend requirements..." -ForegroundColor Cyan
& $PyExe -m pip install -r "$BackendDir\requirements.txt" --quiet

# Check Node modules
Write-Host "`n[3/4] Checking frontend modules..." -ForegroundColor Cyan
if (-not (Test-Path "$FrontendDir\node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    Set-Location $FrontendDir
    npm.cmd install
    Set-Location $Root
}

Write-Host "`n[4/4] Launching GoalInsight..." -ForegroundColor Cyan
Start-Process cmd -ArgumentList "/k cd /d `"$BackendDir`" && `"$PyExe`" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
Start-Sleep -Seconds 3

Start-Process cmd -ArgumentList "/k cd /d `"$FrontendDir`" && npm.cmd run dev"
Start-Sleep -Seconds 5

Start-Process "http://localhost:3000"

Write-Host "`nGoalInsight is running!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "Backend API: http://localhost:8000/docs" -ForegroundColor White
