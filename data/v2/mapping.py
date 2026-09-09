"""Bridges between v1's free-text fields and v2's id-based references.

v1 recorded the route into a career as display strings ("Medicine (MBBS/MD)").
v2 needs ids that join to majors.json, because university matching is an
intersection of a career's majors and an institution's majors. This module is
that translation, plus the sector-level defaults that let 170 careers be
authored without restating the obvious for each one.
"""

from v2.majors import MAJOR_IDS

# --------------------------------------------------------------------------
# v1 degree string -> major id
# --------------------------------------------------------------------------
DEGREE_TO_MAJOR: dict[str, str] = {
    "Accounting": "accounting",
    "Actuarial Science": "actuarial_science",
    "Aeronautical Engineering": "aerospace_engineering",
    "Aerospace Engineering": "aerospace_engineering",
    "Air Traffic Management": "air_traffic_management",
    "Aircraft Maintenance Technology": "aircraft_maintenance",
    "Applied Mathematics": "mathematics",
    "Arabic Language & Literature": "translation",
    "Architecture": "architecture",
    "Architecture (B.Arch)": "architecture",
    "Artificial Intelligence": "artificial_intelligence",
    "Astrophysics": "astronomy",
    "Aviation / Professional Pilot Programme": "pilot_training",
    "Aviation Management": "aviation_management",
    "Aviation Studies": "aviation_management",
    "Avionics Engineering": "aerospace_engineering",
    "Biomedical Sciences (pre-medicine)": "biomedical_sciences",
    "Business Administration": "business_administration",
    "Business Analytics": "data_science",
    "Chemical Engineering": "chemical_engineering",
    "Civil Engineering": "civil_engineering",
    "Communication": "mass_communication",
    "Computer Engineering": "computer_engineering",
    "Computer Science": "computer_science",
    "Construction Engineering": "construction_management",
    "Construction Management": "construction_management",
    "Counselling Psychology": "psychology",
    "Criminal Justice & Technology": "criminology",
    "Criminology & Financial Crime": "criminology",
    "Cultural Heritage Studies": "museum_studies",
    "Cybersecurity": "cybersecurity_major",
    "Data Science": "data_science",
    "Digital Forensics": "cybersecurity_major",
    "Digital Media": "digital_media",
    "Economics": "economics",
    "Education": "education_secondary",
    "Education (Mathematics/Science)": "education_secondary",
    "Electrical Engineering": "electrical_engineering",
    "Entrepreneurship": "entrepreneurship_major",
    "Environmental Engineering": "environmental_engineering",
    "Environmental Science": "environmental_science",
    "Event Management": "event_management",
    "Finance": "finance",
    "Game Development": "game_development",
    "Geography & GIS": "geomatics",
    "Geomatics / GIS": "geomatics",
    "Graphic Design": "graphic_design",
    "Health Informatics": "health_informatics",
    "Health Sciences": "public_health",
    "Hospitality Management": "hospitality_management",
    "Industrial Engineering": "industrial_engineering",
    "Information Security": "cybersecurity_major",
    "Information Systems": "information_systems",
    "Information Technology": "information_systems",
    "Instructional Design / Educational Technology": "curriculum_design",
    "Interaction / UX Design": "interaction_design",
    "Interactive Media": "digital_media",
    "Interior Architecture": "interior_design",
    "International Relations": "international_relations",
    "International Trade": "economics",
    "Journalism": "journalism",
    "Law": "law",
    "Logistics Management": "supply_chain",
    "Marine Engineering": "marine_engineering",
    "Maritime Studies": "maritime_studies",
    "Marketing": "marketing",
    "Mass Communication": "mass_communication",
    "Mathematics": "mathematics",
    "Mechanical Engineering": "mechanical_engineering",
    "Mechatronics": "mechatronics",
    "Media Production": "film_production",
    "Media Studies": "mass_communication",
    "Medicine (MBBS/MD)": "medicine",
    "Naval Architecture": "marine_engineering",
    "Network Engineering": "network_engineering",
    "Nuclear Engineering": "nuclear_engineering",
    "Nursing (BSN)": "nursing",
    "Petroleum Engineering": "petroleum_engineering",
    "Pharmaceutical Sciences": "pharmacy",
    "Pharmacy (PharmD/BPharm)": "pharmacy",
    "Philosophy & Technology": "political_science",
    "Physics": "physics",
    "Political Science": "political_science",
    "Psychology": "psychology",
    "Public Administration": "public_administration",
    "Public Health": "public_health",
    "Public Policy": "public_policy",
    "Quantity Surveying": "quantity_surveying",
    "Renewable Energy Engineering": "environmental_engineering",
    "Robotics Engineering": "robotics",
    "Sociology": "sociology",
    "Software Engineering": "software_engineering",
    "Special Education": "special_education",
    "Statistics": "statistics",
    "Structural Engineering": "structural_engineering",
    "Supply Chain Management": "supply_chain",
    "Sustainability Management": "environmental_science",
    "Tourism Management": "tourism_management",
    "Urban Design": "urban_planning",
    "Urban Planning": "urban_planning",
    "any technical degree plus business training": "entrepreneurship_major",
}

_unknown = {v for v in DEGREE_TO_MAJOR.values() if v not in MAJOR_IDS}
assert not _unknown, f"DEGREE_TO_MAJOR points at unknown majors: {_unknown}"


# --------------------------------------------------------------------------
# Sector defaults
# --------------------------------------------------------------------------
# Used when a career does not override them. Keeping these per sector rather
# than per career is what makes 170 entries tractable; anything genuinely
# distinctive is overridden in the career row itself.

SECTOR_DEFAULTS: dict[str, dict] = {
    "ai_data":          {"envs": ["office", "remote"],            "years": 4, "icon": "brain-circuit"},
    "cybersecurity":    {"envs": ["office", "control_room"],      "years": 4, "icon": "shield-check"},
    "software":         {"envs": ["office", "remote"],            "years": 4, "icon": "code"},
    "energy":           {"envs": ["plant", "office"],             "years": 4, "icon": "zap"},
    "aviation":         {"envs": ["aircraft", "control_room"],    "years": 4, "icon": "plane"},
    "space":            {"envs": ["laboratory", "control_room"],  "years": 5, "icon": "rocket"},
    "healthcare":       {"envs": ["hospital", "clinic"],          "years": 6, "icon": "stethoscope"},
    "finance":          {"envs": ["office"],                      "years": 4, "icon": "line-chart"},
    "tourism":          {"envs": ["hotel", "office"],             "years": 4, "icon": "palmtree"},
    "construction":     {"envs": ["site", "office"],              "years": 5, "icon": "hard-hat"},
    "logistics":        {"envs": ["vessel", "office"],            "years": 4, "icon": "ship"},
    "government":       {"envs": ["office"],                      "years": 4, "icon": "landmark"},
    "education":        {"envs": ["classroom"],                   "years": 4, "icon": "graduation-cap"},
    "media":            {"envs": ["studio", "field"],             "years": 4, "icon": "clapperboard"},
    "entrepreneurship": {"envs": ["office", "remote"],            "years": 4, "icon": "lightbulb"},
    "engineering":      {"envs": ["plant", "office"],             "years": 5, "icon": "cog"},
    "law":              {"envs": ["court", "office"],             "years": 4, "icon": "scale"},
    "social":           {"envs": ["office", "field"],             "years": 4, "icon": "heart-handshake"},
}

# Licensing bodies by sector, described generically. Health and law are the two
# families where practice is genuinely gated in the UAE.
SECTOR_LICENSING: dict[str, list[dict]] = {
    "healthcare": [
        {"en": "DOH Abu Dhabi", "ar": "دائرة الصحة – أبوظبي"},
        {"en": "DHA Dubai", "ar": "هيئة الصحة بدبي"},
        {"en": "MOHAP", "ar": "وزارة الصحة ووقاية المجتمع"},
    ],
    "law": [
        {"en": "the relevant emirate's legal affairs department",
         "ar": "دائرة الشؤون القانونية في الإمارة المعنية"},
    ],
}


# --------------------------------------------------------------------------
# Per-career additions for v1 records
# --------------------------------------------------------------------------
# DEGREE_TO_MAJOR is one-to-one, so a v1 career can only reach the majors its
# degree strings name. These append the ones that mapping alone cannot reach --
# without them those majors sit in the catalog unreferenced, and a student
# looking at, say, geology never finds the career that leads to it.

V1_EXTRA_MAJORS: dict[str, list[str]] = {
    "petroleum_engineer": ["geology"],
    "satellite_systems_engineer": ["space_engineering"],
    "space_robotics_engineer": ["space_engineering"],
    "academic_career_counsellor": ["educational_counselling"],
    "special_education_specialist": ["educational_counselling"],
    "marine_engineer": ["maritime_studies"],
    "port_operations_manager": ["maritime_studies"],
}

# Likewise for skills: v2 introduced maritime operations, but the careers that
# obviously need it were authored in v1 and cannot be edited without touching
# the v1 module. The weight is the skill's importance to that role, 0-100.
V1_EXTRA_SKILLS: dict[str, dict[str, int]] = {
    "port_operations_manager": {"maritime_ops": 90},
    "marine_engineer": {"maritime_ops": 85},
    "customs_trade_specialist": {"maritime_ops": 55},
}
