"""Sectors.

The v1 taxonomy is kept intact rather than reorganised, because every v1 career
is labelled with it and the trained classifier predicts it. Three sectors are
added to give the new v2 careers an honest home: `engineering` for the
mechanical/electrical/chemical family that "construction" never covered, `law` for the
legal and compliance roles, and `social` for community and welfare work.

The label space therefore grows from 15 to 18, which is the "larger label space"
the v2 brief anticipates for retraining.
"""

# id, English, Arabic, hex colour
SECTORS: list[tuple[str, str, str, str]] = [
    ("ai_data", "Artificial Intelligence & Data", "الذكاء الاصطناعي والبيانات", "#00732F"),
    ("cybersecurity", "Cybersecurity", "الأمن السيبراني", "#0B3D5C"),
    ("software", "Software Engineering", "هندسة البرمجيات", "#1B7F5A"),
    ("energy", "Energy & Sustainability", "الطاقة والاستدامة", "#2E7D32"),
    ("aviation", "Aviation & Aerospace", "الطيران والفضاء الجوي", "#155E75"),
    ("space", "Space Technology", "تقنيات الفضاء", "#3F3D8F"),
    ("healthcare", "Healthcare & Medicine", "الرعاية الصحية والطب", "#0E7490"),
    ("finance", "Finance & Fintech", "المالية والتقنية المالية", "#8A6D1F"),
    ("tourism", "Tourism & Hospitality", "السياحة والضيافة", "#B45309"),
    ("construction", "Civil & Built Environment", "الهندسة المدنية والبيئة العمرانية", "#7C5E10"),
    ("logistics", "Logistics & Maritime", "الخدمات اللوجستية والبحرية", "#1D4E6F"),
    ("government", "Government & Public Policy", "الحكومة والسياسات العامة", "#0F5132"),
    ("education", "Education", "التعليم", "#6D28D9"),
    ("media", "Media & Creative Industries", "الإعلام والصناعات الإبداعية", "#9D174D"),
    ("entrepreneurship", "Entrepreneurship", "ريادة الأعمال", "#B91C1C"),
    # --- added in v2 ---
    ("engineering", "Engineering & Industry", "الهندسة والصناعة", "#374151"),
    ("law", "Law & Compliance", "القانون والامتثال", "#4C1D95"),
    ("social", "Social & Community", "الخدمة الاجتماعية والمجتمع", "#065F46"),
]

SECTOR_IDS = {s[0] for s in SECTORS}
