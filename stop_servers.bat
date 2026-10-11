@echo off
title Stop Corporate Risk Radar Servers
echo Stopping all running instances of Python Risk Engine and Frontend...

taskkill /f /im uvicorn.exe 2>nul
taskkill /f /im node.exe 2>nul

echo All servers stopped successfully.
timeout /t 3 >nul
exit /b 0
