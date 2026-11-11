@echo off
cd /d "%~dp0"
if not exist "node_modules" (
  echo [Cartograph] Instalando dependencias...
  call npm install
)
echo [Cartograph] Iniciando janela nativa desktop (Tauri v2)...
call npm run desktop

