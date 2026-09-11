<div align="center">

<img src="docs/banner.svg" alt="Masar AI" width="100%">

# Masar AI · مسار

**Your path, guided by data.** · *مسارك، بإرشاد البيانات.*

An AI career-guidance system for students in the United Arab Emirates.
Graduation project, 2026.

[![CI](https://github.com/vsoultann/masar-ai/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/vsoultann/masar-ai/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-00732F.svg)](LICENSE)
[![Python 3.11](https://img.shields.io/badge/Python-3.11-0B3D5C.svg)](https://www.python.org/)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-000000.svg)](https://nextjs.org/)
[![Tests](https://img.shields.io/badge/tests-89%20backend%20%2B%2024%20frontend-00732F.svg)](#testing)

</div>

---

Masar analyses a student's school grades, EmSAT scores, Holland RIASEC interests and
Big Five personality traits, and returns ten ranked careers from the UAE job market —
each with a plain-language explanation of *why*, a skill-gap analysis, and a four-phase
learning roadmap. Everything works in English and Modern Standard Arabic, with full
right-to-left layout.

## Problem statement

The core problem is that traditional career counseling is often inaccessible, expensive,
and non-personalized, leading many individuals to make uninformed decisions that result in
career dissatisfaction and skill mismatches. Conventional methods rely on static aptitude
tests and limited human resources, which fail to keep pace with a rapidly evolving job
market and the emergence of new technical roles. Consequently, there is a critical need
for a scalable, data-driven AI system that can analyze vast amounts of real-time industry
data and individual user profiles to provide objective, personalized, and actionable
career pathways.

## Abstract

Many students face difficulty in selecting appropriate career paths due to limited access
to personalized and reliable guidance. Traditional career counseling methods are often
generalized, inconsistent, or unavailable to all learners, resulting in decisions based on
uncertainty rather than informed self-assessment. Consequently, students may choose
academic subjects or career directions that do not align with their abilities, interests,
or personality traits, leading to long-term academic dissatisfaction and professional
challenges.

The proposed AI Career Guidance System addresses this issue by providing a data-driven,
accessible, and personalized platform for career planning. The system leverages machine
learning techniques to analyze key student data, including academic performance, personal
interests, and personality profiles. Based on this analysis, it generates tailored career
recommendations that align with each student's unique strengths and preferences.
Additionally, the system identifies skill gaps and suggests relevant courses and learning
pathways to support students in achieving their career goals.

By offering continuous, individualized support, the AI Career Guidance System enhances
decision-making and reduces reliance on guesswork. It ensures that students receive
accurate and timely guidance, empowering them to make informed academic and professional
choices. Ultimately, this approach contributes to improved educational outcomes and better
alignment between students' potential and their future careers.

## Quick start

```bash
git clone https://github.com/vsoultann/masar-ai.git && cd masar-ai
./scripts/setup.sh        # Python env, deps, model check, seed, npm install
./scripts/run_dev.sh      # API on :8000, web on :3000
```

Windows: `./scripts/setup.ps1`. Everything else: `docker compose up`.

| Demo account | Password | Role |
|---|---|---|
| `student@masar.ae` | `Demo@1234` | Student, profile pre-completed so the dashboard is populated |
| `admin@masar.ae` | `Admin@1234` | Administrator |

No API keys are needed. Nothing in this project requires a paid service to run.

## Features

- **Onboarding wizard** — four steps (personal, grades + optional EmSAT, 30 RIASEC items,
  25 Big Five items), saved per step so a student can stop and resume.
- **Explained recommendations** — top ten careers with a match percentage, a confidence
  label, and the three profile dimensions that produced the match.
- **Skill-gap analysis** — estimated current proficiency against each career's requirement,
  across a 40-skill taxonomy, as a radar chart and a prioritised list.
- **Learning roadmap** — specific courses from a 120-course catalog across Now → 6 → 12 →
  24 months, mixing free and paid, Arabic and English, global and UAE providers.
- **AI virtual mentor** — answers career questions in either language. Uses the Anthropic
  API when `ANTHROPIC_API_KEY` is set and a local retrieval engine otherwise, so a demo
  never depends on a network call.
- **Bilingual PDF report** — the full profile, recommendations, gaps and roadmap, with
  correct Arabic shaping and RTL layout.
- **Admin panel** — statistics, anonymised student list, catalog CRUD, model metrics and a
  retrain button.
- **Public careers explorer** — browse, search and filter all 60 careers without an account.

## How the recommendation works

Two models, because neither answers the whole question alone:

| Layer | What it does | Why |
|---|---|---|
| Random Forest classifier | predicts P(sector \| student) over 15 sectors | trained on data; good at the coarse question |
| Content-based similarity | mean-centred cosine between the student's 20-dim profile and each career's ideal profile | the only layer that can rank careers *within* a sector |
| Demand term | small bonus for high-demand careers | tie-breaker only |

```
final score = 0.45 × sector + 0.45 × similarity + 0.10 × demand
```

Demand is capped at 0.10 deliberately: a guidance system that chases whatever is
fashionable would recreate the problem it exists to solve.

**On the data, stated plainly:** no public dataset links UAE school grades, RIASEC
interests and Big Five traits to career outcomes. Rather than claim one, the project ships
a deterministic synthetic generator (`ml/generate_dataset.py`, fixed seed) with a
documented causal story. High accuracy here shows the *pipeline* works; it is not evidence
that the recommendations are externally validated.

### Reported metrics

Reproduce with `python ml/train.py` — same seed, same numbers.

| Model | CV accuracy | CV macro-F1 | Test accuracy |
|---|---|---|---|
| **Random Forest** (served) | 0.695 | 0.673 | **0.690** |
| Logistic Regression | 0.688 | 0.662 | 0.683 |
| K-Nearest Neighbours | 0.662 | 0.593 | 0.656 |

15 classes, 5,000 profiles, 8% injected label noise. Chance is 0.067; the achievable
ceiling given the noise is about 0.92.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 15 (App Router), TypeScript (strict), Tailwind CSS 4, Recharts |
| i18n | locale-segment routing + JSON dictionaries, full RTL |
| Backend | Python 3.11, FastAPI, SQLAlchemy 2, Pydantic v2, JWT |
| ML | scikit-learn, pandas, numpy, joblib, matplotlib |
| PDF | ReportLab + arabic-reshaper + python-bidi, bundled Noto Naskh Arabic |
| Database | SQLite by default, PostgreSQL via `DATABASE_URL`, Alembic migrations |
| Deploy | Docker, docker-compose, Vercel (web), Render (API), GitHub Actions |

Two documented substitutions from the original brief: `bcrypt` is called directly instead
of through `passlib` (passlib 1.7.4 reads `bcrypt.__about__`, removed in bcrypt 4.x), and
i18n is a locale-segment implementation rather than `next-intl`.

## Project structure

```
masar-ai/
├── backend/          FastAPI app, tests, alembic migrations, seed script
│   └── app/          routers · models · schemas · services · core · ml_loader
├── frontend/         Next.js app, dictionaries, components, vitest tests
├── ml/               feature schema · dataset generator · train · evaluate · recommender
│   ├── data/         students.csv (committed, reproducible)
│   └── artifacts/    model.joblib · metrics.json · figures
├── data/             careers.json · courses.json · skills.json · questionnaires
├── scripts/          setup.sh · setup.ps1 · run_dev.sh
└── .github/workflows CI and deploy
```

## Testing

```bash
cd backend && PYTHONPATH=.:../ml ../.venv/bin/python -m pytest    # 89 tests
cd frontend && npm test                                           # 24 tests
```

Backend coverage includes auth and role enforcement, the wizard and its validation, the
recommendation endpoint, skill-gap arithmetic, roadmap construction, PDF generation
(including that the Arabic font is embedded), catalog CRUD, dataset determinism and model
loading. Frontend coverage includes dictionary key parity, the language toggle and the
onboarding wizard.

## Deployment

The repository carries `render.yaml` (API) and `frontend/vercel.json` (web).

1. **Backend** — Render → New → Blueprint → select this repo. It reads `render.yaml` and
   builds `backend/Dockerfile`. Free tier sleeps after ~15 minutes idle, so the first
   request afterwards takes 30–60 seconds; open `/health` before a live demo.
2. **Frontend** — Vercel → Import Project → set root directory to `frontend` and
   `NEXT_PUBLIC_API_URL` to the Render URL.
3. Set `CORS_ORIGINS` on the Render service to the Vercel URL, then redeploy the API.

Single-host alternative: `docker compose up` behind Caddy or Nginx on any VPS.

## Team

| Member | Role |
|---|---|
| **Saif Qais Ahmed** | **Group Leader** · Frontend |
| Khaled Mohammed AlMemari | Database & DevOps |
| Mansour Buti ALShmasi | QA & Documentation |
| Mubarak Awad AlAmro | Backend & API |
| Zayed Saif AlBlooshi | ML Engineer |

**Supervisor:** Hamdy Hersi · **Institution:** Applied Technology School — Al Ain ·
**Academic year:** 2026

## License

MIT — see [LICENSE](LICENSE).
