# One-command local setup for Windows (PowerShell).
#
#   ./scripts/setup.ps1
#
# Creates the Python environment, installs both stacks and seeds the database.
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Say($message) { Write-Host "`n==> $message" -ForegroundColor Green }

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js 20+ is required. See https://nodejs.org"
}

Say "Setting up the Python environment"
if (Get-Command uv -ErrorAction SilentlyContinue) {
    uv python install 3.11
    uv venv --python 3.11 .venv
    uv pip install --python .venv/Scripts/python.exe -r backend/requirements.txt
} else {
    $py = Get-Command py -ErrorAction SilentlyContinue
    if ($py) { py -3.11 -m venv .venv } else { python -m venv .venv }
    ./.venv/Scripts/python.exe -m pip install --upgrade pip
    ./.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
}

if (Test-Path ml/artifacts/model.joblib) {
    Say "Trained model already present"
} else {
    Say "Generating the dataset and training the model (about a minute)"
    ./.venv/Scripts/python.exe ml/generate_dataset.py
    ./.venv/Scripts/python.exe ml/train.py
}

Say "Seeding the database"
Push-Location backend
$env:PYTHONPATH = "."
../.venv/Scripts/python.exe seed.py
Pop-Location

Say "Installing frontend dependencies"
Push-Location frontend
npm install --no-fund --no-audit
Pop-Location

if (-not (Test-Path .env)) { Copy-Item .env.example .env }

Say "Setup complete."
Write-Host "  Terminal 1:  cd backend; `$env:PYTHONPATH='.'; ../.venv/Scripts/python.exe -m uvicorn app.main:app --reload --port 8000"
Write-Host "  Terminal 2:  cd frontend; npm run dev"
Write-Host "  Demo accounts: student@masar.ae / Demo@1234   admin@masar.ae / Admin@1234"
