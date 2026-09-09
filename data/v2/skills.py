"""Additional skills introduced in v2.

v1's 40 skills were adequate for a catalog weighted towards technology and
engineering. v2 adds healthcare, law, media, hospitality and the trades, and
those families were previously being described with borrowed vocabulary --
a radiographer scored on "attention_detail" and nothing else clinical.

Skill-gap analysis is only as good as the vocabulary it can express a gap in,
so the taxonomy grows with the catalog. These are appended to v1's list; no
existing skill id changes, so every v1 career keeps its weights.
"""

# id, name_en, name_ar, family
NEW_SKILLS: list[tuple[str, str, str, str]] = [
    ("patient_care", "Patient Care", "رعاية المرضى", "domain"),
    ("diagnostic_imaging", "Diagnostic Imaging", "التصوير التشخيصي", "technical"),
    ("surgical_skills", "Surgical Technique", "التقنية الجراحية", "domain"),
    ("pharmacology", "Pharmacology", "علم الأدوية", "domain"),
    ("dental_skills", "Dental Practice", "ممارسة طب الأسنان", "domain"),
    ("lab_diagnostics", "Laboratory Diagnostics", "التشخيص المخبري", "technical"),
    ("rehabilitation", "Rehabilitation Therapy", "العلاج التأهيلي", "domain"),
    ("counselling", "Counselling & Psychological Support", "الإرشاد والدعم النفسي", "professional"),
    ("nutrition_diet", "Nutrition & Dietetics", "التغذية والحميات", "domain"),
    ("veterinary_care", "Veterinary Care", "الرعاية البيطرية", "domain"),
    ("emergency_response", "Emergency Response", "الاستجابة للطوارئ", "domain"),
    ("child_development", "Child Development", "نمو الطفل", "domain"),
    ("manufacturing_ops", "Manufacturing Operations", "عمليات التصنيع", "domain"),
    ("quality_control", "Quality Control", "ضبط الجودة", "technical"),
    ("hr_people", "People & HR Management", "إدارة الأفراد والموارد البشرية", "professional"),
    ("sales_negotiation", "Sales & Negotiation", "المبيعات والتفاوض", "professional"),
    ("journalism_reporting", "Reporting & Investigation", "التحرير والتحقيق الصحفي", "professional"),
    ("photography_video", "Photography & Videography", "التصوير الفوتوغرافي والفيديو", "technical"),
    ("animation_3d", "Animation & 3D", "الرسوم المتحركة والتصميم ثلاثي الأبعاد", "technical"),
    ("sound_audio", "Sound & Audio", "الصوت والهندسة الصوتية", "technical"),
    ("translation_skill", "Translation & Interpreting", "الترجمة والترجمة الفورية", "language"),
    ("hospitality_ops", "Hospitality Operations", "عمليات الضيافة", "domain"),
    ("culinary", "Culinary Practice", "الممارسة الطهوية", "domain"),
    ("sports_coaching", "Sports Coaching", "التدريب الرياضي", "domain"),
    ("curation_heritage", "Curation & Heritage", "التنسيق المتحفي والتراث", "domain"),
    ("islamic_studies_skill", "Islamic Studies", "الدراسات الإسلامية", "domain"),
    ("fashion_textiles", "Fashion & Textiles", "الأزياء والمنسوجات", "technical"),
    ("spatial_design", "Spatial & Interior Design", "التصميم المكاني والداخلي", "technical"),
    ("maritime_ops", "Maritime Operations", "العمليات البحرية", "domain"),
    ("agriculture_food", "Agriculture & Food Systems", "الزراعة والنظم الغذائية", "domain"),
]
