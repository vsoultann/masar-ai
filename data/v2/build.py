"""Builds the v2 catalogs.

Reads v1's authored content, upgrades it to the v2 schema, merges the v2
additions, derives everything that can be derived, validates the result, and
writes JSON to the app's public/data directory.

Run from the repository's data/ directory:

    python -m v2.build
"""

from __future__ import annotations

import importlib.util
import json
import math
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent.parent      # data/
ROOT = HERE.parent                                          # repo root
OUT = ROOT / "frontend" / "public" / "data"

sys.path.insert(0, str(HERE))

from v2 import compose                                      # noqa: E402
from v2.careers_base import NEW_CAREERS                     # noqa: E402
from v2.courses import NEW_COURSES                          # noqa: E402
from v2.initiatives import NEW_INITIATIVES                  # noqa: E402
from v2.majors import MAJORS                                # noqa: E402
from v2.mapping import (DEGREE_TO_MAJOR, SECTOR_DEFAULTS, SECTOR_LICENSING,  # noqa: E402
                        V1_EXTRA_MAJORS, V1_EXTRA_SKILLS)
from v2.sectors import SECTORS                              # noqa: E402
from v2.skills import NEW_SKILLS                            # noqa: E402
from v2.universities import UNIVERSITIES                    # noqa: E402

# Importing the career modules is what populates NEW_CAREERS.
import v2.careers_health      # noqa: E402,F401
import v2.careers_engineering  # noqa: E402,F401
import v2.careers_tech        # noqa: E402,F401
import v2.careers_business    # noqa: E402,F401
import v2.careers_public      # noqa: E402,F401
import v2.careers_media       # noqa: E402,F401


def _load_v1():
    """v1's builder is importable: its writes sit behind a __main__ guard."""
    spec = importlib.util.spec_from_file_location("v1", HERE / "_build_catalogs.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


V1 = _load_v1()


# --------------------------------------------------------------------------
# Lookups
# --------------------------------------------------------------------------
ALL_SKILLS = [{"id": i, "name_en": e, "name_ar": a, "family": f}
              for i, e, a, f in list(V1.SKILLS) + NEW_SKILLS]
SKILL_BY_ID = {s["id"]: s for s in ALL_SKILLS}

ALL_SECTORS = [{"id": i, "name_en": e, "name_ar": a, "color": c}
               for i, e, a, c in SECTORS]

ALL_INITIATIVES = list(V1.INITIATIVES) + NEW_INITIATIVES
INITIATIVE_BY_ID = {i["id"]: i for i in ALL_INITIATIVES}

ALL_MAJORS = [{"id": i, "name": {"en": e, "ar": a}, "family": f, "level": lv}
              for i, e, a, f, lv in MAJORS]
MAJOR_BY_ID = {m["id"]: m for m in ALL_MAJORS}

ALL_COURSES = list(V1.COURSES) + NEW_COURSES


# --------------------------------------------------------------------------
# Normalising the two career sources into one shape
# --------------------------------------------------------------------------
def _from_v1(career: dict) -> dict:
    """Upgrade a v1 career record to the v2 authoring shape."""
    sector = career["sector"]
    defaults = SECTOR_DEFAULTS[sector]
    majors, seen = [], set()
    for degree in career["degrees_en"]:
        major = DEGREE_TO_MAJOR.get(degree)
        if major and major not in seen:
            seen.add(major)
            majors.append(major)
    for major in V1_EXTRA_MAJORS.get(career["id"], []):
        if major not in seen:
            seen.add(major)
            majors.append(major)

    skills = dict(career["skills"])
    skills.update(V1_EXTRA_SKILLS.get(career["id"], {}))
    return {
        "id": career["id"],
        "title_en": career["title_en"],
        "title_ar": career["title_ar"],
        "sector": sector,
        "demand": career["demand"],
        "salary_band": (career["salary_aed"]["min"], career["salary_aed"]["max"]),
        "description_en": career["description_en"],
        "description_ar": career["description_ar"],
        "skills": skills,
        "profile": career["profile"],
        "majors": majors,
        "employers_en": career["employers_en"],
        "employers_ar": career["employers_ar"],
        "initiatives": career["initiatives"],
        "years": defaults["years"],
        "envs": defaults["envs"],
        "licensing": SECTOR_LICENSING.get(sector, []),
        "icon": defaults["icon"],
    }


AUTHORED = [_from_v1(c) for c in V1.CAREERS] + NEW_CAREERS


# --------------------------------------------------------------------------
# Derivations
# --------------------------------------------------------------------------
PROFILE_KEYS = (
    [("riasec", k) for k in "RIASEC"]
    + [("bigfive", k) for k in "OCEAN"]
    + [("subjects", k) for k in V1.SUBJECT_KEYS]
)


def _vector(career: dict) -> list[float]:
    return [career["profile"][group][key] for group, key in PROFILE_KEYS]


def _cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    return dot / (na * nb) if na and nb else 0.0


def _skill_idf(careers: list[dict]) -> dict[str, float]:
    """Inverse document frequency per skill.

    Without this, similarity is dominated by the skills almost every career
    lists -- teamwork, attention to detail, problem solving -- and the rare,
    genuinely defining ones count for almost nothing. The visible symptom was
    that a chef's nearest careers were a cinematographer and a video editor:
    nothing else in the catalog requires culinary practice, so the comparison
    fell back entirely on creativity and attention to detail, which those roles
    happen to share.

    Weighting each skill by log(N / df) makes a shared rare skill worth far more
    than a shared ubiquitous one, which is what "related" should mean here.
    """
    total = len(careers)
    frequency: dict[str, int] = {}
    for career in careers:
        for skill in career["skills"]:
            frequency[skill] = frequency.get(skill, 0) + 1
    return {skill: math.log(total / count) for skill, count in frequency.items()}


def _skill_overlap(a: dict, b: dict, idf: dict[str, float]) -> float:
    """IDF-weighted cosine similarity over the two careers' skill vectors."""
    keys = set(a["skills"]) | set(b["skills"])
    va = [a["skills"].get(k, 0) * idf.get(k, 1.0) for k in keys]
    vb = [b["skills"].get(k, 0) * idf.get(k, 1.0) for k in keys]
    return _cosine(va, vb)


def related_careers(target: dict, all_careers: list[dict],
                    idf: dict[str, float], limit: int = 5) -> list[str]:
    """Nearest careers, by what the work requires rather than who is drawn to it.

    The first implementation ranked on the ideal-profile vector alone (RIASEC,
    Big Five, school subjects). That measures which students suit a role, not
    which roles resemble each other, and it produced genuinely bad output: a
    radiologist's related careers included an environmental engineer, because
    both suit a conscientious, investigative student who was good at science.

    Skill overlap is the stronger signal for relatedness, so it carries most of
    the weight, with the personality/subject profile as a secondary term and a
    small same-sector bonus. No artificial cross-sector quota: for a specialised
    clinical role the honest answer really is five other clinical roles.
    """
    target_vector = _vector(target)
    scored = []
    for other in all_careers:
        if other["id"] == target["id"]:
            continue
        score = (
            0.65 * _skill_overlap(target, other, idf)
            + 0.35 * _cosine(target_vector, _vector(other))
        )
        if other["sector"] == target["sector"]:
            score += 0.03
        scored.append((score, other["id"]))
    scored.sort(reverse=True)
    return [cid for _score, cid in scored[:limit]]


def top_courses(career: dict, courses: list[dict], limit: int = 6) -> list[str]:
    """Courses that teach this career's most important skills.

    Ranked by the course's proficiency gain weighted by how much the career
    needs that skill, so a strong course in a marginal skill never outranks a
    decent course in a central one.
    """
    scored = []
    for course in courses:
        score = sum(
            gain * career["skills"].get(skill, 0)
            for skill, gain in course["skills"].items()
        )
        if score > 0:
            scored.append((score, course["id"]))
    scored.sort(reverse=True)
    return [cid for _score, cid in scored[:limit]]


def build_career(career: dict, all_careers: list[dict],
                 idf: dict[str, float]) -> dict:
    cid = career["id"]
    low, high = career["salary_band"]

    ranked_skills = sorted(career["skills"].items(), key=lambda kv: -kv[1])
    top_named = [
        (SKILL_BY_ID[s]["name_en"].lower(), SKILL_BY_ID[s]["name_ar"])
        for s, _w in ranked_skills[:3]
        if s in SKILL_BY_ID
    ]

    majors_en = [MAJOR_BY_ID[m]["name"]["en"] for m in career["majors"] if m in MAJOR_BY_ID]
    majors_ar = [MAJOR_BY_ID[m]["name"]["ar"] for m in career["majors"] if m in MAJOR_BY_ID]

    inits_en = [INITIATIVE_BY_ID[i]["name_en"] for i in career["initiatives"] if i in INITIATIVE_BY_ID]
    inits_ar = [INITIATIVE_BY_ID[i]["name_ar"] for i in career["initiatives"] if i in INITIATIVE_BY_ID]

    long_en, long_ar = compose.compose_long_description(
        career_id=cid, title_en=career["title_en"], title_ar=career["title_ar"],
        short_en=career["description_en"], short_ar=career["description_ar"],
        sector=career["sector"], top_skills=top_named,
        majors_en=majors_en[:3], majors_ar=majors_ar[:3],
        years=career["years"], licensing=career["licensing"],
        demand=career["demand"],
        employers_en=career["employers_en"], employers_ar=career["employers_ar"],
    )
    day_en, day_ar = compose.compose_day_in_the_life(
        career_id=cid, environments=career["envs"], top_skills=top_named,
        sector=career["sector"],
    )
    rel_en, rel_ar = compose.compose_uae_relevance(
        sector=career["sector"], initiatives_en=inits_en, initiatives_ar=inits_ar,
    )

    return {
        "id": cid,
        "title": {"en": career["title_en"], "ar": career["title_ar"]},
        "sector": career["sector"],
        "shortDescription": {"en": career["description_en"], "ar": career["description_ar"]},
        "longDescription": {"en": long_en, "ar": long_ar},
        "dayInTheLife": {"en": day_en, "ar": day_ar},
        "requiredSkills": [
            {"skill": s, "weight": round(w / 100, 2), "requiredLevel": w}
            for s, w in ranked_skills
        ],
        "idealProfile": career["profile"],
        "educationPath": {
            "minimumQualification": {
                "en": (f"{majors_en[0]} degree" if majors_en else "Relevant bachelor's degree"),
                "ar": (f"درجة جامعية في {majors_ar[0]}" if majors_ar else "درجة جامعية في تخصص ذي صلة"),
            },
            "typicalYears": career["years"],
            "relatedMajors": career["majors"],
            "licensingBodies": career["licensing"],
        },
        "salaryAED": compose.salary_tiers(low, high),
        "demandOutlook": career["demand"],
        "growthTrend": compose.growth_trend(cid, career["demand"]),
        "workEnvironment": career["envs"],
        "uaeRelevance": {"en": rel_en, "ar": rel_ar},
        "strategicInitiatives": career["initiatives"],
        "employers": {"en": career["employers_en"], "ar": career["employers_ar"]},
        "media": {
            "hero": f"/images/careers/{cid}.jpg",
            "thumbnail": f"/images/careers/{cid}-thumb.jpg",
            "icon": career["icon"],
            "video": None,
            "credit": None,
        },
        "relatedCareers": related_careers(career, all_careers, idf),
        "topCourses": top_courses(career, ALL_COURSES),
        # Kept flat for the ML pipeline, which expects v1's shape.
        "skills": career["skills"],
        "demand": career["demand"],
    }


def write(name: str, payload) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / name
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8")
    print(f"  {name:32} {len(payload):>5} entries  {path.stat().st_size:>9,} bytes")


def main() -> None:
    # The IDF table is a property of the whole catalog, so it is computed once
    # and shared rather than recomputed inside each of the 180 career builds.
    idf = _skill_idf(AUTHORED)
    careers = [build_career(c, AUTHORED, idf) for c in AUTHORED]

    assert len(careers) >= 140, f"need >= 140 careers, built {len(careers)}"
    assert len(ALL_COURSES) >= 150, f"need >= 150 courses, have {len(ALL_COURSES)}"
    assert len(ALL_MAJORS) >= 70, f"need >= 70 majors, have {len(ALL_MAJORS)}"
    assert len(UNIVERSITIES) >= 45, f"need >= 45 institutions, have {len(UNIVERSITIES)}"
    assert any(c["id"] == "radiologist" for c in careers), "radiologist is required"

    # The full catalog is ~1.4 MB. Card grids, filters and search need about a
    # fifteenth of that, and making /careers download every long description in
    # both languages to render a list would be indefensible on a phone. The
    # index carries what a card shows; the detail page fetches the full file.
    index = [
        {
            "id": c["id"],
            "title": c["title"],
            "sector": c["sector"],
            "shortDescription": c["shortDescription"],
            "demandOutlook": c["demandOutlook"],
            "salary": {"entry": c["salaryAED"]["entry"], "senior": c["salaryAED"]["senior"]},
            "growthTrend": c["growthTrend"],
            "icon": c["media"]["icon"],
            "thumbnail": c["media"]["thumbnail"],
            "majors": c["educationPath"]["relatedMajors"],
            "topSkills": [s["skill"] for s in c["requiredSkills"][:4]],
        }
        for c in careers
    ]

    print("writing catalogs to frontend/public/data/")
    write("careers-index.json", index)
    write("careers.json", careers)
    write("courses.json", ALL_COURSES)
    write("majors.json", ALL_MAJORS)
    write("universities.json", UNIVERSITIES)
    write("skills.json", ALL_SKILLS)
    write("sectors.json", ALL_SECTORS)
    write("initiatives.json", ALL_INITIATIVES)

    riasec, bigfive = V1.build_questionnaires()
    write("questionnaire_riasec.json", riasec)
    write("questionnaire_bigfive.json", bigfive)


if __name__ == "__main__":
    main()
