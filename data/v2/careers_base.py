"""Compact authoring format for v2 careers.

One call per career. Everything that can be derived -- salary tiers, growth
trend, long description, day-in-the-life, UAE relevance, media paths, related
careers, recommended courses -- is derived later in build.py, so a row here
carries only what is genuinely specific to the role.
"""

from v2.majors import MAJOR_IDS
from v2.mapping import SECTOR_DEFAULTS, SECTOR_LICENSING
from v2.sectors import SECTOR_IDS

SUBJECT_KEYS = ["math", "physics", "chemistry", "biology", "arabic",
                "english", "computer_science", "islamic", "social"]

NEW_CAREERS: list[dict] = []


def C2(cid, en, ar, sector, demand, sal, skills, riasec, bigfive, subj,
       majors, short_en, short_ar, emp_en, emp_ar, inits,
       years=None, envs=None, licensing=None, icon=None):
    """Expand a compact career row.

    skills  -- "skill_id:weight ..." weight 0-100 (how central the skill is)
    riasec  -- "R I A S E C" ideal profile 0-100
    bigfive -- "O C E A N"   ideal profile 0-100
    subj    -- subject -> 0-100 (unlisted subjects default to 55)
    majors  -- major ids this career is entered through
    """
    assert sector in SECTOR_IDS, f"{cid}: unknown sector {sector!r}"
    assert demand in ("very_high", "high", "moderate"), f"{cid}: demand {demand!r}"
    unknown = [m for m in majors if m not in MAJOR_IDS]
    assert not unknown, f"{cid}: unknown majors {unknown}"

    sk = {}
    for token in skills.split():
        name, _, weight = token.partition(":")
        sk[name] = int(weight)

    r = [int(x) for x in riasec.split()]
    b = [int(x) for x in bigfive.split()]
    assert len(r) == 6 and len(b) == 5, f"{cid}: profile length"

    subjects = {k: 55 for k in SUBJECT_KEYS}
    subjects.update(subj)

    defaults = SECTOR_DEFAULTS[sector]
    NEW_CAREERS.append({
        "id": cid,
        "title_en": en,
        "title_ar": ar,
        "sector": sector,
        "demand": demand,
        "salary_band": sal,
        "description_en": short_en,
        "description_ar": short_ar,
        "skills": sk,
        "profile": {
            "riasec": dict(zip(["R", "I", "A", "S", "E", "C"], r)),
            "bigfive": dict(zip(["O", "C", "E", "A", "N"], b)),
            "subjects": subjects,
        },
        "majors": majors,
        "employers_en": emp_en,
        "employers_ar": emp_ar,
        "initiatives": inits,
        "years": years if years is not None else defaults["years"],
        "envs": envs if envs is not None else defaults["envs"],
        "licensing": licensing if licensing is not None else SECTOR_LICENSING.get(sector, []),
        "icon": icon or defaults["icon"],
    })
