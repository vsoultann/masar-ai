#!/usr/bin/env bash
# Runs the API and the web app together. Ctrl-C stops both.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

[ -d .venv ] || { echo "Run ./scripts/setup.sh first."; exit 1; }

cleanup() { trap - INT TERM EXIT; kill 0 2>/dev/null || true; }
trap cleanup INT TERM EXIT

echo "API  -> http://localhost:8000   (docs at /docs)"
echo "Web  -> http://localhost:3000"
echo

(cd backend && PYTHONPATH=. ../.venv/bin/python -m uvicorn app.main:app --reload --port 8000) &
(cd frontend && npm run dev) &

wait
