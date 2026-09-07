"""The hybrid recommendation engine: classifier + content-based similarity.

Layer 1 -- a Random Forest predicts P(sector | student) over the 15 UAE
strategic sectors.  It is good at the coarse question ("is this a healthcare
person or a software person?") but it cannot rank the four careers inside a
sector, because the training labels only go down to sector level.

Layer 2 -- a content-based similarity between the student's 20-dimensional
profile vector (6 RIASEC + 5 Big Five + 9 subject grades) and each career's
*ideal profile* vector, authored in data/careers.json.  This ranks individual
careers, including across sectors.

Layer 3 -- a small demand term so that, between two otherwise equal matches,
the one the UAE labour market is actively hiring for ranks higher.

    final = 0.45 * sector_score + 0.45 * similarity + 0.10 * demand

Why 45/45/10 (justified in docs/ML_METHODOLOGY.md):
* The two substantive layers are weighted equally because neither dominates.
  The classifier is the only component trained on data; the similarity layer is
  the only component that can distinguish careers within a sector.  Favouring
  either one made the top-10 visibly worse in manual review -- classifier-heavy
  blends returned four near-identical software roles, similarity-heavy blends
  ignored the learned sector signal entirely.
* Demand is capped at 0.10 on purpose.  It is a tie-breaker, not a driver: a
  guidance system that pushes students towards whatever is fashionable would
  reproduce the very problem this project exists to solve.

A note on cosine similarity
---------------------------
Raw cosine between two all-positive profile vectors is close to 1 for every
pair, which makes it useless for ranking.  We therefore mean-centre both
vectors first (equivalent to a Pearson correlation) and then rescale from
[-1, 1] to [0, 1].  This measures "does this student's *shape* match the
career's shape", which is the question we actually want answered.
"""
from __future__ import annotations

import math
import pathlib
import sys
from typing import Any, Iterable

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from pipeline import BIGFIVE, RIASEC, SUBJECTS, profile_to_frame, profile_to_row  # noqa: E402
from skill_map import estimate_skills  # noqa: E402

# Order of the 20-dimensional profile vector.  Fixed: careers and students must
# be projected identically.
PROFILE_DIMS: list[str] = (
    [f"riasec_{k}" for k in "RIASEC"]
    + [f"big5_{k}" for k in "OCEAN"]
    + list(SUBJECTS)
)

WEIGHT_SECTOR = 0.45
WEIGHT_SIMILARITY = 0.45
WEIGHT_DEMAND = 0.10
DEMAND_SCORE = {"very_high": 1.0, "high": 0.7, "moderate": 0.4}

# Human-readable labels for the "why this career" explanation.
FEATURE_LABELS: dict[str, tuple[str, str]] = {
    "riasec_R": ("your practical, hands-on interests", "ميولك العملية والتطبيقية"),
    "riasec_I": ("your investigative and analytical interests", "ميولك البحثية والتحليلية"),
    "riasec_A": ("your creative and artistic interests", "ميولك الإبداعية والفنية"),
    "riasec_S": ("your interest in helping and working with people", "ميولك لمساعدة الناس والعمل معهم"),
    "riasec_E": ("your enterprising and leadership interests", "ميولك القيادية وروح المبادرة لديك"),
    "riasec_C": ("your preference for structure and organised work", "تفضيلك للعمل المنظّم والمرتّب"),
    "big5_O": ("your openness to new ideas", "انفتاحك على الأفكار الجديدة"),
    "big5_C": ("your conscientiousness and discipline", "يقظة ضميرك وانضباطك"),
    "big5_E": ("your extraversion", "انبساطك الاجتماعي"),
    "big5_A": ("your agreeableness and cooperativeness", "مقبوليتك وروح التعاون لديك"),
    "big5_N": ("your emotional steadiness", "اتّزانك الانفعالي"),
    "arabic": ("your Arabic grade", "درجتك في اللغة العربية"),
    "english": ("your English grade", "درجتك في اللغة الإنجليزية"),
    "math": ("your Mathematics grade", "درجتك في الرياضيات"),
    "physics": ("your Physics grade", "درجتك في الفيزياء"),
    "chemistry": ("your Chemistry grade", "درجتك في الكيمياء"),
    "biology": ("your Biology grade", "درجتك في الأحياء"),
    "islamic": ("your Islamic Studies grade", "درجتك في التربية الإسلامية"),
    "social": ("your Social Studies grade", "درجتك في الدراسات الاجتماعية"),
    "computer_science": ("your Computer Science grade", "درجتك في علوم الحاسوب"),
}

PHASES = [
    ("now", "Now - next 3 months", "الآن - الأشهر الثلاثة القادمة"),
    ("6_months", "By 6 months", "خلال ٦ أشهر"),
    ("12_months", "By 12 months", "خلال ١٢ شهراً"),
    ("24_months", "By 24 months", "خلال ٢٤ شهراً"),
]


def career_vector(career: dict) -> np.ndarray:
    profile = career["profile"]
    values = (
        [profile["riasec"][k] for k in "RIASEC"]
        + [profile["bigfive"][k] for k in "OCEAN"]
        + [profile["subjects"][s] for s in SUBJECTS]
    )
    return np.asarray(values, dtype=float)


def student_vector(row: dict[str, float]) -> np.ndarray:
    return np.asarray([float(row[dim]) for dim in PROFILE_DIMS], dtype=float)


def centered_cosine(a: np.ndarray, b: np.ndarray) -> float:
    """Cosine similarity on mean-centred vectors, rescaled to [0, 1]."""
    a_c = a - a.mean()
    b_c = b - b.mean()
    denominator = np.linalg.norm(a_c) * np.linalg.norm(b_c)
    if denominator == 0:
        return 0.5
    return float((np.dot(a_c, b_c) / denominator + 1.0) / 2.0)


class CareerRecommender:
    """Ranks careers, explains the ranking, and derives gaps and a roadmap."""

    def __init__(self, model_bundle: dict, careers: list[dict],
                 courses: list[dict], skills: list[dict]) -> None:
        self.model = model_bundle["model"]
        self.labels: list[str] = list(model_bundle["labels"])
        self.model_name: str = model_bundle.get("model_name", "unknown")
        self.trained_at: str = model_bundle.get("trained_at", "unknown")
        self.careers = careers
        self.courses = courses
        self.skills = {s["id"]: s for s in skills}
        self._vectors = {c["id"]: career_vector(c) for c in careers}
        self._by_id = {c["id"]: c for c in careers}

    # -- ranking -----------------------------------------------------------
    def sector_probabilities(self, profile: dict[str, Any]) -> dict[str, float]:
        frame = profile_to_frame(profile)
        probabilities = self.model.predict_proba(frame)[0]
        return {label: float(p) for label, p in zip(self.model.classes_, probabilities)}

    def recommend(self, profile: dict[str, Any], top_n: int = 10) -> dict[str, Any]:
        row = profile_to_row(profile)
        vector = student_vector(row)
        sector_probability = self.sector_probabilities(profile)
        max_probability = max(sector_probability.values()) or 1.0

        scored: list[dict[str, Any]] = []
        for career in self.careers:
            similarity = centered_cosine(vector, self._vectors[career["id"]])
            sector_score = sector_probability.get(career["sector"], 0.0) / max_probability
            demand = DEMAND_SCORE.get(career["demand"], 0.4)
            score = (WEIGHT_SECTOR * sector_score
                     + WEIGHT_SIMILARITY * similarity
                     + WEIGHT_DEMAND * demand)
            scored.append({
                "career_id": career["id"],
                "sector": career["sector"],
                "match": round(score * 100, 1),
                "components": {
                    "sector_probability": round(sector_probability.get(career["sector"], 0.0), 4),
                    "sector_score": round(sector_score, 4),
                    "similarity": round(similarity, 4),
                    "demand": demand,
                },
            })

        scored.sort(key=lambda item: item["match"], reverse=True)
        top = scored[:top_n]
        for rank, item in enumerate(top, start=1):
            career = self._by_id[item["career_id"]]
            item["rank"] = rank
            item["reasons"] = self.explain(vector, career, item["components"])
            item["confidence"] = self._confidence(item, scored)
        return {
            "recommendations": top,
            "sector_probabilities": {k: round(v, 4)
                                     for k, v in sorted(sector_probability.items(),
                                                        key=lambda kv: -kv[1])},
            "model": {"name": self.model_name, "trained_at": self.trained_at,
                      "weights": {"sector": WEIGHT_SECTOR,
                                  "similarity": WEIGHT_SIMILARITY,
                                  "demand": WEIGHT_DEMAND}},
        }

    def _confidence(self, item: dict, all_scored: list[dict]) -> str:
        """High / moderate / low, from how far ahead this match is."""
        top_probability = item["components"]["sector_probability"]
        tenth = all_scored[min(9, len(all_scored) - 1)]["match"]
        margin = item["match"] - tenth
        if top_probability >= 0.30 and margin >= 4.0:
            return "high"
        if top_probability >= 0.15 or margin >= 2.0:
            return "moderate"
        return "low"

    def explain(self, vector: np.ndarray, career: dict,
                components: dict, top_k: int = 3) -> list[dict[str, Any]]:
        """The top contributing factors behind one match.

        Contribution of a dimension = how much the career asks for it, times how
        much the student has of it, both measured as deviations from their own
        averages.  Note the asymmetry with the similarity score: two *negative*
        deviations also multiply to a positive contribution, and they genuinely
        do raise the similarity ("this career needs little social contact, and
        neither does this student").  But "you match because you both score low
        on helping people" is not an explanation a sixteen-year-old should be
        shown, so a dimension is only surfaced as a *reason* when both
        deviations are positive -- a shared strength, not a shared absence.
        """
        ideal = self._vectors[career["id"]]
        student_deviation = vector - vector.mean()
        career_deviation = ideal - ideal.mean()
        contributions = student_deviation * career_deviation

        order = np.argsort(contributions)[::-1]
        reasons: list[dict[str, Any]] = []
        for index in order:
            if len(reasons) >= top_k:
                break
            if contributions[index] <= 0:
                break
            if student_deviation[index] <= 0 or career_deviation[index] <= 0:
                continue                      # a shared absence, not a strength
            dimension = PROFILE_DIMS[index]
            label_en, label_ar = FEATURE_LABELS.get(dimension, (dimension, dimension))
            reasons.append({
                "factor": dimension,
                "label_en": label_en,
                "label_ar": label_ar,
                "student_value": round(float(vector[index]), 1),
                "career_ideal": round(float(ideal[index]), 1),
                "contribution": round(float(contributions[index]), 1),
            })
        return reasons

    # -- skill gap ---------------------------------------------------------
    def skill_gap(self, profile: dict[str, Any], career_id: str) -> dict[str, Any]:
        career = self._by_id[career_id]
        row = profile_to_row(profile)
        current = estimate_skills(row)

        entries: list[dict[str, Any]] = []
        for skill_id, required in career["skills"].items():
            have = current.get(skill_id, 50.0)
            gap = max(0.0, float(required) - have)
            # Priority weighs the size of the gap by how much the career needs
            # the skill, so a small gap in a critical skill can outrank a large
            # gap in a peripheral one.
            priority = round(gap * (required / 100.0), 2)
            skill = self.skills.get(skill_id, {})
            entries.append({
                "skill_id": skill_id,
                "name_en": skill.get("name_en", skill_id),
                "name_ar": skill.get("name_ar", skill_id),
                "current": round(have, 1),
                "required": int(required),
                "gap": round(gap, 1),
                "priority": priority,
            })

        entries.sort(key=lambda e: e["priority"], reverse=True)
        covered = [e for e in entries if e["gap"] <= 0]
        return {
            "career_id": career_id,
            "skills": entries,
            "readiness": round(
                100.0 * sum(min(e["current"], e["required"]) * e["required"] for e in entries)
                / max(1.0, sum(e["required"] * e["required"] for e in entries)), 1),
            "strengths": [e["skill_id"] for e in covered][:5],
            "top_gaps": [e["skill_id"] for e in entries if e["gap"] > 0][:5],
        }

    # -- learning pathway --------------------------------------------------
    def _course_score(self, course: dict, skill_id: str, gap: float,
                      current: float, career_skills: dict[str, int]) -> float:
        """Rank one course as a way of closing one skill gap.

        The ``relevance`` term is what stops the obviously wrong recommendation:
        many courses teach "attention to detail" as a secondary skill, so
        without it an aspiring teacher was being sent to an aviation-safety
        course.  Relevance asks how much of what the course *also* teaches is
        something this career actually needs.
        """
        gain = course["skills"].get(skill_id, 0)
        if not gain:
            return 0.0
        # Level fit: send a weak student to a beginner course, not an advanced one.
        target = {"beginner": 35.0, "intermediate": 60.0, "advanced": 80.0}[course["level"]]
        level_fit = 1.0 - min(1.0, abs(current - target) / 60.0)
        total_gain = sum(course["skills"].values()) or 1
        relevance = sum(value for key, value in course["skills"].items()
                        if key in career_skills) / total_gain
        cost_bonus = 0.10 if course["cost"] == "free" else 0.0
        local_bonus = 0.06 if course["provider_type"] == "uae" else 0.0
        return ((gain / 100.0) * 0.40
                + relevance * 0.30
                + level_fit * 0.15
                + min(gap, 60.0) / 60.0 * 0.10
                + cost_bonus + local_bonus)

    def learning_pathway(self, profile: dict[str, Any], career_id: str,
                         per_phase: int = 3) -> dict[str, Any]:
        wanted = per_phase * len(PHASES)
        gap_report = self.skill_gap(profile, career_id)
        gaps = [e for e in gap_report["skills"] if e["gap"] > 0]

        chosen: list[dict[str, Any]] = []
        used: set[str] = set()

        career_skills = self._by_id[career_id]["skills"]

        def take(entry: dict, limit: int, kind: str) -> None:
            candidates = [
                (self._course_score(c, entry["skill_id"], entry["gap"],
                                    entry["current"], career_skills), c)
                for c in self.courses
                if entry["skill_id"] in c["skills"] and c["id"] not in used
            ]
            candidates.sort(key=lambda pair: pair[0], reverse=True)
            for score, course in candidates[:limit]:
                if len(chosen) >= wanted:
                    return
                used.add(course["id"])
                chosen.append({
                    "course": course,
                    "for_skill": entry["skill_id"],
                    "skill_name_en": entry["name_en"],
                    "skill_name_ar": entry["name_ar"],
                    "kind": kind,
                    "score": round(score, 3),
                    "priority": entry["priority"],
                })

        for entry in gaps:
            take(entry, 2, "close_gap")
            if len(chosen) >= wanted:
                break

        # A strong student can have almost no gaps for their top career.  An
        # empty roadmap would be the technically correct and least useful
        # possible answer, so the remaining slots are filled with courses that
        # deepen the skills the career weights most heavily.  These are tagged
        # "strengthen" so the UI never presents them as gaps the student has.
        if len(chosen) < wanted:
            deepen = sorted(gap_report["skills"],
                            key=lambda e: (-e["required"], -e["priority"]))
            for entry in deepen:
                if len(chosen) >= wanted:
                    break
                take(entry, 1, "strengthen")

        # Order: highest-priority gap first, and within that, easier and shorter
        # courses first -- a roadmap that starts with a 24-week advanced course
        # is a roadmap nobody starts.
        level_rank = {"beginner": 0, "intermediate": 1, "advanced": 2}
        chosen.sort(key=lambda item: (-item["priority"],
                                      level_rank[item["course"]["level"]],
                                      item["course"]["duration_weeks"]))

        # Deal the courses across the four phases in order.  When there are
        # fewer courses than slots, deal round-robin instead of front-loading,
        # so every phase still carries something concrete.
        buckets: list[list[dict[str, Any]]] = [[] for _ in PHASES]
        if len(chosen) >= per_phase * len(PHASES):
            for index in range(len(PHASES)):
                buckets[index] = chosen[index * per_phase:(index + 1) * per_phase]
        else:
            for position, item in enumerate(chosen):
                buckets[position % len(PHASES)].append(item)

        phases: list[dict[str, Any]] = []
        for index, (key, label_en, label_ar) in enumerate(PHASES):
            slice_ = buckets[index]
            phases.append({
                "id": key,
                "label_en": label_en,
                "label_ar": label_ar,
                "focus_skills": sorted({item["for_skill"] for item in slice_}),
                "courses": [
                    {
                        "id": item["course"]["id"],
                        "title_en": item["course"]["title_en"],
                        "title_ar": item["course"]["title_ar"],
                        "provider": item["course"]["provider"],
                        "provider_type": item["course"]["provider_type"],
                        "level": item["course"]["level"],
                        "duration_weeks": item["course"]["duration_weeks"],
                        "cost": item["course"]["cost"],
                        "language": item["course"]["language"],
                        "description_en": item["course"]["description_en"],
                        "description_ar": item["course"]["description_ar"],
                        "search_query": item["course"]["search_query"],
                        "for_skill": item["for_skill"],
                        "skill_name_en": item["skill_name_en"],
                        "skill_name_ar": item["skill_name_ar"],
                        "kind": item["kind"],
                    }
                    for item in slice_
                ],
            })

        total_weeks = sum(item["course"]["duration_weeks"] for item in chosen)
        return {
            "career_id": career_id,
            "readiness": gap_report["readiness"],
            "phases": phases,
            "total_courses": len(chosen),
            "total_weeks": total_weeks,
            "free_courses": sum(1 for item in chosen if item["course"]["cost"] == "free"),
        }

    # -- helpers -----------------------------------------------------------
    def current_skills(self, profile: dict[str, Any]) -> dict[str, float]:
        return estimate_skills(profile_to_row(profile))

    def career(self, career_id: str) -> dict | None:
        return self._by_id.get(career_id)

    def career_ids(self) -> Iterable[str]:
        return self._by_id.keys()


def score_questionnaire(answers: dict[str, int], items: list[dict]) -> dict[str, float]:
    """Score a Likert questionnaire onto 0-100 per dimension.

    Reverse-keyed items are flipped (6 - x on a 1-5 scale) before averaging, and
    each dimension is rescaled from the 1-5 mean onto 0-100.  Unanswered items
    are ignored rather than treated as neutral.
    """
    buckets: dict[str, list[float]] = {}
    for item in items:
        raw = answers.get(item["id"])
        if raw is None:
            continue
        value = float(raw)
        if item.get("reverse"):
            value = 6.0 - value
        buckets.setdefault(item["dimension"], []).append(value)

    scores: dict[str, float] = {}
    dimensions = {item["dimension"] for item in items}
    for dimension in dimensions:
        values = buckets.get(dimension)
        if not values:
            scores[dimension] = 50.0
            continue
        mean = sum(values) / len(values)
        scores[dimension] = round((mean - 1.0) / 4.0 * 100.0, 1)
    return scores


def completeness(answers: dict[str, int], items: list[dict]) -> float:
    """Fraction of the questionnaire that has been answered."""
    if not items:
        return 1.0
    answered = sum(1 for item in items if answers.get(item["id"]) is not None)
    return round(answered / len(items), 3)


__all__ = [
    "CareerRecommender", "PHASES", "PROFILE_DIMS", "career_vector",
    "centered_cosine", "completeness", "score_questionnaire", "student_vector",
    "WEIGHT_DEMAND", "WEIGHT_SECTOR", "WEIGHT_SIMILARITY",
]
