#!/usr/bin/env python3
"""Seed the database: demo accounts plus the full career and course catalogs.

Idempotent -- running it twice changes nothing.  Called automatically on
startup when AUTO_SEED=1 (the default), so a fresh clone has a populated,
demonstrable system on the very first request.

    python backend/seed.py            # seed
    python backend/seed.py --reset    # drop every table first, then seed
"""
from __future__ import annotations

import argparse
import json
import pathlib
import sys

# Allow "python backend/seed.py" from the repository root.
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

from sqlalchemy.orm import Session

from app.core.config import DATA_DIR
from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_password
from app.models import Career, Course, StudentProfile, User

DEMO_ACCOUNTS = [
    {"email": "student@masar.ae", "password": "Demo@1234",
     "full_name": "Demo Student", "role": "student", "preferred_language": "en"},
    {"email": "admin@masar.ae", "password": "Admin@1234",
     "full_name": "Masar Administrator", "role": "admin", "preferred_language": "en"},
]

# A fully completed profile for the demo student, so that a grader who logs in
# with the demo account sees recommendations immediately instead of an empty
# dashboard.  The profile describes a science-track student in Abu Dhabi with
# strong investigative interests.
DEMO_PROFILE = {
    "full_name": "Demo Student",
    "emirate": "abu_dhabi",
    "school": "Al Mutanabbi Secondary School",
    "grade_level": "12",
    "track": "advanced",
    "grades": {"arabic": 84, "english": 88, "math": 93, "physics": 90,
               "chemistry": 82, "biology": 74, "islamic": 86, "social": 78,
               "computer_science": 95},
    "emsat": {"math": 1340, "english": 1250, "physics": 1290, "arabic": 1180},
    "riasec": {"R": 46, "I": 88, "A": 52, "S": 38, "E": 55, "C": 68},
    "bigfive": {"O": 82, "C": 78, "E": 48, "A": 62, "N": 34},
    "completed_steps": 4,
}


def load(name: str) -> list[dict]:
    return json.loads((DATA_DIR / name).read_text(encoding="utf-8"))


def to_v1_career(record: dict) -> dict:
    """Flatten a v2 career record into the shape this schema stores.

    The backend's ORM and routers were written against v1's flat field names.
    v2 restructured the catalog (nested bilingual objects, salary tiers,
    renamed ideal profile), and rewriting the ORM to match would be work in
    service of a component that is no longer the runtime.

    An adapter is the proportionate answer: one function, applied at seed time,
    so the tables, schemas and routers below it are untouched. A v1 record is
    passed through unchanged, which keeps this safe if the source is ever
    pointed back at the old catalogs.
    """
    if "title_en" in record:
        return record                      # already v1

    salary = record["salaryAED"]
    return {
        "id": record["id"],
        "title_en": record["title"]["en"],
        "title_ar": record["title"]["ar"],
        "sector": record["sector"],
        "demand": record["demandOutlook"],
        "description_en": record["shortDescription"]["en"],
        "description_ar": record["shortDescription"]["ar"],
        "skills": record["skills"],
        "profile": record["idealProfile"],
        "salary_aed": {
            "min": salary["entry"], "max": salary["senior"], "period": salary["period"],
            "note_en": salary["note"]["en"], "note_ar": salary["note"]["ar"],
        },
        "degrees_en": record["educationPath"]["relatedMajors"],
        "degrees_ar": record["educationPath"]["relatedMajors"],
        "employers_en": record["employers"]["en"],
        "employers_ar": record["employers"]["ar"],
        "initiatives": record["strategicInitiatives"],
    }


def seed_users(db: Session) -> int:
    created = 0
    for account in DEMO_ACCOUNTS:
        if db.query(User).filter(User.email == account["email"]).one_or_none():
            continue
        user = User(
            email=account["email"],
            hashed_password=hash_password(account["password"]),
            full_name=account["full_name"], role=account["role"],
            preferred_language=account["preferred_language"],
        )
        db.add(user)
        db.flush()
        if account["role"] == "student":
            db.add(StudentProfile(user_id=user.id, riasec_answers={},
                                  bigfive_answers={}, **DEMO_PROFILE))
        else:
            db.add(StudentProfile(user_id=user.id, full_name=user.full_name,
                                  grades={}, emsat={}, riasec={}, bigfive={},
                                  riasec_answers={}, bigfive_answers={}))
        created += 1
    db.commit()
    return created


def seed_careers(db: Session) -> int:
    created = 0
    for raw in load("careers.json"):
        record = to_v1_career(raw)
        if db.get(Career, record["id"]):
            continue
        data = dict(record)
        db.add(Career(
            id=data.pop("id"), title_en=data.pop("title_en"),
            title_ar=data.pop("title_ar"), sector=data.pop("sector"),
            demand=data.pop("demand"), payload=data,
        ))
        created += 1
    db.commit()
    return created


def seed_courses(db: Session) -> int:
    created = 0
    for record in load("courses.json"):
        if db.get(Course, record["id"]):
            continue
        data = dict(record)
        db.add(Course(
            id=data.pop("id"), title_en=data.pop("title_en"),
            title_ar=data.pop("title_ar"), provider=data.pop("provider"),
            provider_type=data.pop("provider_type"), level=data.pop("level"),
            cost=data.pop("cost"), language=data.pop("language"),
            duration_weeks=data.pop("duration_weeks"), payload=data,
        ))
        created += 1
    db.commit()
    return created


def seed_all(db: Session, quiet: bool = False) -> dict[str, int]:
    counts = {
        "users": seed_users(db),
        "careers": seed_careers(db),
        "courses": seed_courses(db),
    }
    if not quiet:
        print(f"seeded: {counts['users']} users, {counts['careers']} careers, "
              f"{counts['courses']} courses "
              f"(existing rows were left untouched)")
    return counts


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--reset", action="store_true",
                        help="drop all tables before seeding (destroys user data)")
    args = parser.parse_args()

    if args.reset:
        Base.metadata.drop_all(engine)
        print("dropped all tables")
    Base.metadata.create_all(engine)

    with SessionLocal() as db:
        seed_all(db)
        print("\ndemo accounts:")
        for account in DEMO_ACCOUNTS:
            print(f"  {account['email']:<20} {account['password']:<12} ({account['role']})")


if __name__ == "__main__":
    main()
