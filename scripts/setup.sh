#!/usr/bin/env bash
# One-command local setup for Linux and macOS.
#
#   ./scripts/setup.sh
#
# Creates the Python environment, installs both stacks, seeds the database and
# verifies the ML artifacts. Safe to re-run.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

say() { printf '\n\033[1;32m==>\033[0m %s\n' "$1"; }
die() { printf '\n\033[1;31mError:\033[0m %s\n' "$1" >&2; exit 1; }

command -v node >/dev/null || die "Node.js 20+ is required. See https://nodejs.org"

# --- Python 3.11 -------------------------------------------------------------
say "Setting up the Python environment"
if command -v uv >/dev/null 2>&1; then
  uv python install 3.11 >/dev/null
  uv venv --python 3.11 .venv
  uv pip install --python .venv/bin/python -r backend/requirements.txt
else
  PY=""
  for candidate in python3.11 python3.12 python3; do
    if command -v "$candidate" >/dev/null 2>&1; then PY="$candidate"; break; fi
  done
  [ -n "$PY" ] || die "Python 3.11+ not found."
  "$PY" -m venv .venv
  ./.venv/bin/pip install --quiet --upgrade pip
  ./.venv/bin/pip install --quiet -r backend/requirements.txt
fi

# --- ML artifacts ------------------------------------------------------------
if [ -f ml/artifacts/model.joblib ]; then
  say "Trained model already present (ml/artifacts/model.joblib)"
else
  say "Generating the dataset and training the model (about a minute)"
  ./.venv/bin/python ml/generate_dataset.py
  ./.venv/bin/python ml/train.py
fi

# --- Database ----------------------------------------------------------------
say "Seeding the database"
(cd backend && PYTHONPATH=. ../.venv/bin/python seed.py)

# --- Frontend ----------------------------------------------------------------
say "Installing frontend dependencies"
(cd frontend && npm install --no-fund --no-audit)

[ -f .env ] || cp .env.example .env

say "Setup complete. Start everything with:  ./scripts/run_dev.sh"
echo "   Demo accounts: student@masar.ae / Demo@1234    admin@masar.ae / Admin@1234"
