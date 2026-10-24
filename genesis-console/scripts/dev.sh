#!/usr/bin/env bash
# Dev mode: backend (watch) + Angular dev server with /api proxy.
set -euo pipefail
cd "$(dirname "$0")/.."
[ -d backend/node_modules ] || npm --prefix backend install --no-audit --no-fund
[ -d frontend/node_modules ] || npm --prefix frontend install --no-audit --no-fund
[ -f backend/.env ] || cp .env.example backend/.env || true
PORT="${PORT:-8787}" npm --prefix backend run dev &
BACK_PID=$!
trap 'kill $BACK_PID 2>/dev/null || true' EXIT
npm --prefix frontend start
