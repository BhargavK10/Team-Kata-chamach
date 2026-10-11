@echo off
setlocal enabledelayedexpansion

title Corporate Risk Radar - Server Launcher

echo ===================================================
echo     STARTING CORPORATE RISK RADAR SERVERS
echo ===================================================
echo.

cd /d "%~dp0"

:: 1. Check Python Virtual Environment
if not exist ".venv\Scripts\python.exe" (
    echo [ERROR] Python virtual environment (.venv) not found!
    echo Please create the virtual environment and install requirements first:
    echo   python -m venv .venv
    echo   .venv\Scripts\pip install -r requirements.txt
    pause
    exit /b 1
)

:: 2. Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    pause
    exit /b 1
)

:: 3. Check Frontend node_modules
if not exist "frontend\node_modules" (
    echo [INFO] Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)

echo [1/2] Starting Python Risk Engine API (FastAPI on http://127.0.0.1:8000)...
start "Risk Engine Python Backend (Port 8000)" cmd /k "title Python Risk Engine && cd /d "%~dp0" && .venv\Scripts\python.exe -m uvicorn api:app --host 127.0.0.1 --port 8000"

echo [2/2] Starting Frontend & Node Gateway (Vite + Node API)...
start "Frontend & Node Gateway" cmd /k "title Frontend & Node Server && cd /d "%~dp0frontend" && npm run dev"

echo.
echo ===================================================
echo  All services have been launched in separate windows!
echo  - Python Backend:  http://127.0.0.1:8000
echo  - Node API:        http://localhost:4179
echo  - Web Application: http://localhost:5182
echo ===================================================
echo.
echo You can close this window now. The servers will continue running.
timeout /t 5 >nul
exit /b 0
