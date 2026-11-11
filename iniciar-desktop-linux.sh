#!/usr/bin/env bash
cd "$(dirname "$0")" || exit 1
if [ ! -d "node_modules" ]; then
  echo "[Cartograph] Instalando dependências..."
  npm install
fi
echo "[Cartograph] Iniciando janela nativa desktop (Tauri v2)..."
npm run desktop

