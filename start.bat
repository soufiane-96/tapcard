@echo off
title NFC Cards Platform
color 0A
echo.
echo  ================================
echo   NFC Cards Platform - Starting
echo  ================================
echo.
cd /d "%~dp0"
echo  [*] Starting server...
echo  [*] Open your browser at:
echo      http://localhost:3000/admin
echo.
echo  [!] Do NOT close this window
echo  ================================
echo.
start "" "http://localhost:3000/admin"
node server.js
pause
