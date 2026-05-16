@echo off
title Chani Launcher

echo  _________ .__               .__ 
echo  \_   ___ \|  |__ _____    ____ |__|
echo  /    \  \/|  |  \\__  \  /    \|  |
echo  \     \___|   Y  \/ __ \|   |  \  |
echo   \______  /___|  (____  /___|  /__|
echo          \/     \/     \/     \/    
echo.
echo  Starting Chani...
echo.

:: ── Backend ─────────────────────────────────────────────────────────────
echo  [1/2] Launching Chani Backend  (uvicorn @ localhost:8000)
start "Chani — Backend" cmd /k "cd /d "%~dp0backend" && echo  Chani Backend && echo  http://localhost:8000 && echo  http://localhost:8000/docs && echo. && uvicorn main:app --reload"

:: Brief pause so the two windows don't race to open at the same instant
timeout /t 1 /nobreak >nul

:: ── Frontend ─────────────────────────────────────────────────────────────
echo  [2/2] Launching Chani Frontend (Vite    @ localhost:5173)
start "Chani — Frontend" cmd /k "cd /d "%~dp0frontend" && echo  Chani Frontend && echo  http://localhost:5173 && echo. && npm run dev"

echo.
echo  Both servers are starting.
echo  Backend  →  http://localhost:8000
echo  Frontend →  http://localhost:5173
echo  API Docs →  http://localhost:8000/docs
echo.
echo  Close the backend and frontend windows to stop Chani.
echo.
pause
