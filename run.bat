@echo off
setlocal

cd /d "%~dp0"

echo ========================================================
echo       STARTING CORPORATE RISK RADAR SERVERS AND UI
echo ========================================================
echo.

if not exist ".venv\Scripts\python.exe" (
    echo [ERROR] Python virtual environment was not found at: .venv\Scripts\python.exe
    echo Please create the virtual environment:
    echo   python -m venv .venv
    echo   .venv\Scripts\pip install -r requirements.txt
    echo.
    pause
    exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not found in PATH!
    echo Please ensure Node.js is installed.
    echo.
    pause
    exit /b 1
)

if not exist "frontend\node_modules" (
    echo [INFO] Installing frontend node dependencies...
    cd frontend
    call npm install
    cd ..
)

echo [1/2] Launching Python Risk Engine API on port 8000...
start "Python Risk Engine" cmd /k "title Python Risk Engine && cd /d "%~dp0" && .venv\Scripts\python.exe -m uvicorn api:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 2 /nobreak >nul

echo [2/2] Launching UI and Node Gateway...
start "Frontend UI Server" cmd /k "title Frontend and UI Server && cd /d "%~dp0frontend" && npm run dev"

timeout /t 3 /nobreak >nul

echo.
echo Opening Web UI in default browser...
start http://localhost:5182/dashboard

echo.
echo ========================================================
echo   Services are running!
echo   - Backend Server: http://127.0.0.1:8000
echo   - Web UI:         http://localhost:5182
echo ========================================================
echo.
echo Press any key to close this launcher window.
pause >nul
exit /b 0
