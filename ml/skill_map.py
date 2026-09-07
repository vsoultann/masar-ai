"""Documented mapping from the feature vector to 0-100 skill proficiency.

Skill gap analysis needs an estimate of what the student can do *now*.  We have
no direct skill test, so each skill is estimated as a weighted average of the
evidence we do have: subject grades, EmSAT scores, RIASEC interests and Big
Five traits.

The weights below are the whole model.  They were set by hand from the
following rules and are printed in docs/ML_METHODOLOGY.md as a table so a
reader can disagree with any single number:

1. Academic evidence dominates for technical and analytical skills (>= 0.55 of
   the weight comes from grades / EmSAT).
2. Interest (RIASEC) contributes to skills that are largely practised
   voluntarily -- creativity, public speaking, leadership.
3. Personality (Big Five) contributes where the trait *is* close to the skill:
   Conscientiousness -> attention to detail, Agreeableness -> teamwork.
4. Nothing is estimated from a single feature; every skill uses at least three.

Interpretation caveat, stated plainly for the committee: these are *proxies*,
not measurements.  A student who has never written a line of code can still
score highly on ``programming`` here because of a strong computer-science
grade.  The gap chart is a conversation starter, not an assessment.
"""
from __future__ import annotations

# skill_id -> {feature_name: weight}; weights sum to 1.0 for every skill.
SKILL_WEIGHTS: dict[str, dict[str, float]] = {
    "programming":          {"computer_science": .50, "math": .20, "riasec_I": .15, "big5_C": .15},
    "data_analysis":        {"math": .35, "computer_science": .25, "riasec_I": .20, "big5_C": .20},
    "machine_learning":     {"math": .35, "computer_science": .30, "riasec_I": .25, "big5_O": .10},
    "mathematics":          {"math": .55, "emsat_math": .20, "riasec_I": .15, "big5_C": .10},
    "statistics":           {"math": .45, "computer_science": .15, "riasec_I": .20, "big5_C": .20},
    "physics_reasoning":    {"physics": .50, "emsat_physics": .20, "math": .20, "riasec_I": .10},
    "chemistry_lab":        {"chemistry": .55, "biology": .15, "big5_C": .20, "riasec_I": .10},
    "life_sciences":        {"biology": .55, "chemistry": .20, "riasec_I": .15, "big5_O": .10},
    "cybersecurity":        {"computer_science": .45, "math": .20, "riasec_I": .20, "big5_C": .15},
    "networking":           {"computer_science": .45, "physics": .20, "riasec_R": .20, "big5_C": .15},
    "cloud_infrastructure": {"computer_science": .50, "math": .15, "riasec_C": .20, "big5_C": .15},
    "systems_design":       {"computer_science": .40, "math": .25, "riasec_I": .20, "big5_O": .15},
    "electronics":          {"physics": .45, "math": .20, "riasec_R": .25, "big5_C": .10},
    "mechanical_design":    {"physics": .45, "math": .25, "riasec_R": .20, "big5_C": .10},
    "civil_structures":     {"physics": .40, "math": .35, "riasec_R": .15, "big5_C": .10},
    "energy_systems":       {"physics": .40, "chemistry": .20, "math": .25, "riasec_R": .15},
    "sustainability":       {"biology": .30, "chemistry": .20, "social": .20, "big5_O": .30},
    "project_management":   {"social": .25, "big5_C": .35, "riasec_E": .25, "big5_E": .15},
    "business_strategy":    {"social": .30, "math": .20, "riasec_E": .35, "big5_O": .15},
    "finance_accounting":   {"math": .45, "social": .15, "riasec_C": .25, "big5_C": .15},
    "economics":            {"math": .35, "social": .35, "riasec_I": .15, "riasec_E": .15},
    "marketing_comm":       {"english": .25, "arabic": .20, "riasec_E": .30, "big5_E": .25},
    "writing_docs":         {"arabic": .30, "english": .30, "big5_C": .25, "riasec_A": .15},
    "public_speaking":      {"arabic": .20, "english": .20, "big5_E": .35, "riasec_E": .25},
    "arabic_language":      {"arabic": .55, "emsat_arabic": .20, "islamic": .15, "riasec_A": .10},
    "english_language":     {"english": .55, "emsat_english": .25, "riasec_A": .10, "big5_O": .10},
    "teamwork":             {"social": .20, "big5_A": .40, "big5_E": .20, "riasec_S": .20},
    "leadership":           {"social": .15, "big5_E": .30, "riasec_E": .35, "big5_C": .20},
    "creativity":           {"riasec_A": .40, "big5_O": .35, "english": .10, "arabic": .15},
    "visual_design":        {"riasec_A": .45, "big5_O": .30, "computer_science": .15, "math": .10},
    "teaching":             {"riasec_S": .35, "arabic": .20, "big5_A": .25, "big5_E": .20},
    "clinical_skills":      {"biology": .40, "chemistry": .20, "riasec_S": .25, "big5_A": .15},
    "customer_service":     {"riasec_S": .30, "big5_A": .30, "big5_E": .25, "english": .15},
    "logistics_ops":        {"math": .30, "riasec_C": .30, "big5_C": .25, "social": .15},
    "law_policy":           {"social": .35, "arabic": .25, "islamic": .15, "riasec_I": .25},
    "research_methods":     {"riasec_I": .35, "math": .20, "big5_O": .25, "big5_C": .20},
    "attention_detail":     {"big5_C": .45, "riasec_C": .30, "math": .15, "big5_N": .10},
    "problem_solving":      {"math": .35, "physics": .20, "riasec_I": .30, "big5_O": .15},
    "aviation_ops":         {"physics": .30, "english": .25, "riasec_R": .20, "big5_C": .25},
    "geospatial_gis":       {"social": .25, "computer_science": .30, "math": .25, "riasec_I": .20},
}

# Big Five Neuroticism is the one feature where a *low* score is the asset, so
# it is inverted before being used (see estimate_skills).
INVERTED_FEATURES = {"big5_N"}


def estimate_skills(row: dict[str, float]) -> dict[str, float]:
    """Estimate 0-100 proficiency for every skill from one feature row.

    ``row`` is the output of ``ml.pipeline.profile_to_row``.  Missing EmSAT
    values (NaN) are dropped and the remaining weights renormalised, so a
    student who skipped EmSAT is neither rewarded nor punished for it.
    """
    estimates: dict[str, float] = {}
    for skill, weights in SKILL_WEIGHTS.items():
        total_weight = 0.0
        total_value = 0.0
        for feature, weight in weights.items():
            value = row.get(feature)
            if value is None or value != value:          # NaN check
                continue
            value = float(value)
            if feature in INVERTED_FEATURES:
                value = 100.0 - value
            total_value += value * weight
            total_weight += weight
        estimates[skill] = round(total_value / total_weight, 1) if total_weight else 50.0
    return estimates


def validate() -> None:
    """Every skill uses >= 3 features and its weights sum to 1.0."""
    for skill, weights in SKILL_WEIGHTS.items():
        assert len(weights) >= 3, f"{skill} uses fewer than 3 features"
        total = round(sum(weights.values()), 6)
        assert total == 1.0, f"{skill} weights sum to {total}, expected 1.0"


validate()
