#!/usr/bin/env bash
# GENESIS Console — automated execution, smartest order, time used importantly.
# One command: ./run.sh   (installs → builds → starts → smoke-tests)
set -euo pipefail
cd "$(dirname "$0")"

echo "❄️  GENESIS — Angular Force 1 — automated execution"
echo "── 1/4 Installing rich dependencies (backend + frontend in parallel)…"
(npm --prefix backend install --no-audit --no-fund & npm --prefix frontend install --no-audit --no-fund & wait)

[ -f backend/.env ] || cp .env.example backend/.env || true

echo "── 2/4 Building Angular frontend…"
npm --prefix frontend run build

echo "── 3/4 Starting backend on :8787 (serves API; Angular dev server is separate for hot reload)…"
PORT="${PORT:-8787}" npm --prefix backend start &
BACK_PID=$!
trap 'kill $BACK_PID 2>/dev/null || true' EXIT

echo "── 4/4 Smoke-testing…"
node scripts/smoke.mjs

echo ""
echo "✅ GENESIS backend is live on http://127.0.0.1:8787"
echo "   Frontend (hot reload):  npm run dev:frontend   → http://127.0.0.1:4200"
echo "   Frontend (built):       genesis-console/frontend/dist/genesis/"
echo "   Press Ctrl+C to stop."
wait $BACK_PID
