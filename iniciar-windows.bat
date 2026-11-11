@echo off
title Cartograph - Scientific Metasearch Hub
cd /d "%~dp0"
if not exist "node_modules" (
  echo [Cartograph] Installing dependencies on first run...
  call npm install
)
echo [Cartograph] Launching Cross-Platform Bridge + Web Interface...
call npm start
pause
