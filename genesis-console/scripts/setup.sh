#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
echo "Installing backend + frontend dependencies in parallel…"
(npm --prefix backend install --no-audit --no-fund & npm --prefix frontend install --no-audit --no-fund & wait)
[ -f backend/.env ] || cp .env.example backend/.env || true
echo "Done. Next: ./run.sh  or  npm run dev"
