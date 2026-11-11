#!/usr/bin/env bash
cd "$(dirname "$0")" || exit 1
if [ ! -d "node_modules" ]; then
  echo "[Cartograph] Installing dependencies on first run..."
  npm install
fi
echo "[Cartograph] Launching Cross-Platform Bridge + Web Interface..."
npm start
