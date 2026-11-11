@echo off
cd /d "%~dp0"
if not exist "node_modules" (
  echo [Nexus Academico] Instalando dependencias...
  call npm install
)
echo [Nexus Academico] Iniciando janela nativa desktop (Tauri v2)...
call npm run desktop

