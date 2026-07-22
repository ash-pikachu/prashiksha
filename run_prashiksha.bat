@echo off
cd /d "%~dp0"
echo Starting Prashiksha Flask app...
echo.
.venv\Scripts\python.exe run_server.py
pause
