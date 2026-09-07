# Build status

Phases A–D are complete, verified and committed. Phases E–F are not started.

## Done and verified

| Area | State | How it was verified |
|---|---|---|
| Data catalogs | 60 careers, 120 courses, 40 skills, 15 sectors, 7 initiatives, RIASEC-30, BigFive-25 — all EN/AR | key-parity + content assertions in the test suite |
| ML pipeline | deterministic 5,000-row generator, 3 compared models, RF selected | `python ml/train.py` reproduces `metrics.json`: test accuracy 0.690, macro-F1 0.652 |
| Backend | FastAPI: auth, wizard, recommender, skill gap, roadmap, mentor, PDF, admin, alembic | **89 pytest tests pass**; migration applies and reverts |
| Frontend | Next.js App Router, full EN/AR + RTL, all pages, charts | **24 vitest tests pass**; `next build` clean; typecheck clean; screenshots reviewed in both languages |

Run it:

```bash
uv venv --python 3.11 .venv && uv pip install --python .venv/bin/python -r backend/requirements.txt
python ml/generate_dataset.py && python ml/train.py        # artifacts are committed; this reproduces them
cd backend && PYTHONPATH=. ../.venv/bin/python seed.py
PYTHONPATH=. ../.venv/bin/python -m uvicorn app.main:app --port 8000
cd ../frontend && npm install && npm run dev
```

Demo accounts: `student@masar.ae / Demo@1234`, `admin@masar.ae / Admin@1234`.

## Not started

- **Phase E** — `Dockerfile` ×2, `docker-compose.yml`, `.github/workflows/{ci,deploy}.yml`,
  `render.yaml`, `vercel.json`, `scripts/{setup.sh,setup.ps1,run_dev.sh}`.
- **Phase F** — `README.md`, `docs/` (ARCHITECTURE, ML_METHODOLOGY, API, USER_MANUAL,
  DEPLOYMENT, TESTING, DEMO_SCRIPT, DECISIONS), `CHANGELOG.md`, `CONTRIBUTING.md`,
  `docs/screenshots/`.

Everything those phases need to document already exists and is commented in place;
the ML weighting rationale, the Arabic-shaping approach and the catalog design
decisions are written up as module docstrings in `ml/recommender.py`,
`ml/skill_map.py`, `backend/app/services/pdf_report.py` and `data/_build_catalogs.py`.

## Decisions worth carrying into the docs

- `passlib` was dropped for direct `bcrypt` (passlib 1.7.4 reads `bcrypt.__about__`,
  removed in bcrypt 4.x).
- ReportLab over WeasyPrint, with `arabic-reshaper` + `python-bidi` and a bundled
  Noto Naskh face — the face has **no Latin glyphs**, so mixed-script runs are
  tagged to Helvetica explicitly.
- i18n is a locale-segment + JSON-dictionary implementation rather than `next-intl`
  (permitted by the brief as "an equivalent with RTL support").
- Random Forest is capped at `max_depth=22, min_samples_leaf=10`: an unconstrained
  forest scored ~0.004 higher macro-F1 but serialised to 31 MB instead of 9.6 MB.
