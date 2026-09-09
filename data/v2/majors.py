"""Academic majors.

These are the join table of the whole application: a career names the majors
that lead to it, and an institution names the majors it teaches. University
matching is the intersection of those two lists, so an id typo here silently
breaks a feature rather than raising -- which is why `validate.py` checks every
reference in both directions.

Fields: id, English, Arabic, family, typical first degree.
"""

# id, name_en, name_ar, family, level
MAJORS: list[tuple[str, str, str, str, str]] = [
    # --- Medicine and health ------------------------------------------------
    ("medicine", "Medicine and Surgery", "الطب والجراحة", "health", "bachelor_professional"),
    ("dentistry", "Dentistry", "طب الأسنان", "health", "bachelor_professional"),
    ("pharmacy", "Pharmacy", "الصيدلة", "health", "bachelor_professional"),
    ("nursing", "Nursing", "التمريض", "health", "bachelor"),
    ("midwifery", "Midwifery", "القبالة", "health", "bachelor"),
    ("radiography", "Medical Imaging and Radiography", "التصوير الطبي والأشعة", "health", "bachelor"),
    ("radiation_therapy", "Radiation Therapy", "العلاج الإشعاعي", "health", "bachelor"),
    ("medical_laboratory", "Medical Laboratory Sciences", "علوم المختبرات الطبية", "health", "bachelor"),
    ("physiotherapy", "Physiotherapy", "العلاج الطبيعي", "health", "bachelor"),
    ("occupational_therapy", "Occupational Therapy", "العلاج الوظيفي", "health", "bachelor"),
    ("speech_therapy", "Speech and Language Therapy", "علاج النطق واللغة", "health", "bachelor"),
    ("audiology", "Audiology", "علم السمعيات", "health", "bachelor"),
    ("optometry", "Optometry", "البصريات", "health", "bachelor"),
    ("nutrition", "Clinical Nutrition and Dietetics", "التغذية السريرية والحميات", "health", "bachelor"),
    ("public_health", "Public Health", "الصحة العامة", "health", "bachelor"),
    ("health_informatics", "Health Informatics", "المعلوماتية الصحية", "health", "bachelor"),
    ("biomedical_sciences", "Biomedical Sciences", "العلوم الطبية الحيوية", "health", "bachelor"),
    ("biomedical_engineering", "Biomedical Engineering", "الهندسة الطبية الحيوية", "health", "bachelor"),
    ("veterinary", "Veterinary Medicine", "الطب البيطري", "health", "bachelor_professional"),
    ("paramedic_science", "Paramedic Science", "علوم الإسعاف", "health", "bachelor"),
    ("psychology", "Psychology", "علم النفس", "health", "bachelor"),
    ("prosthetics_orthotics", "Prosthetics and Orthotics", "الأطراف الصناعية والتقويم", "health", "bachelor"),

    # --- Engineering and built environment ----------------------------------
    ("civil_engineering", "Civil Engineering", "الهندسة المدنية", "engineering", "bachelor"),
    ("structural_engineering", "Structural Engineering", "الهندسة الإنشائية", "engineering", "bachelor"),
    ("architecture", "Architecture", "الهندسة المعمارية", "engineering", "bachelor"),
    ("urban_planning", "Urban Planning", "التخطيط العمراني", "engineering", "bachelor"),
    ("quantity_surveying", "Quantity Surveying", "مسح الكميات", "engineering", "bachelor"),
    ("construction_management", "Construction Management", "إدارة التشييد", "engineering", "bachelor"),
    ("mechanical_engineering", "Mechanical Engineering", "الهندسة الميكانيكية", "engineering", "bachelor"),
    ("electrical_engineering", "Electrical Engineering", "الهندسة الكهربائية", "engineering", "bachelor"),
    ("mechatronics", "Mechatronics Engineering", "هندسة الميكاترونكس", "engineering", "bachelor"),
    ("chemical_engineering", "Chemical Engineering", "الهندسة الكيميائية", "engineering", "bachelor"),
    ("petroleum_engineering", "Petroleum Engineering", "هندسة البترول", "engineering", "bachelor"),
    ("nuclear_engineering", "Nuclear Engineering", "الهندسة النووية", "engineering", "bachelor"),
    ("environmental_engineering", "Environmental Engineering", "الهندسة البيئية", "engineering", "bachelor"),
    ("water_resources", "Water Resources Engineering", "هندسة الموارد المائية", "engineering", "bachelor"),
    ("industrial_engineering", "Industrial Engineering", "الهندسة الصناعية", "engineering", "bachelor"),
    ("marine_engineering", "Marine Engineering", "الهندسة البحرية", "engineering", "bachelor"),
    ("geomatics", "Surveying and Geomatics", "المساحة والجيوماتكس", "engineering", "bachelor"),
    ("materials_engineering", "Materials Engineering", "هندسة المواد", "engineering", "bachelor"),

    # --- Computing and AI ---------------------------------------------------
    ("computer_science", "Computer Science", "علوم الحاسوب", "computing", "bachelor"),
    ("software_engineering", "Software Engineering", "هندسة البرمجيات", "computing", "bachelor"),
    ("artificial_intelligence", "Artificial Intelligence", "الذكاء الاصطناعي", "computing", "bachelor"),
    ("data_science", "Data Science", "علم البيانات", "computing", "bachelor"),
    ("cybersecurity_major", "Cybersecurity", "الأمن السيبراني", "computing", "bachelor"),
    ("computer_engineering", "Computer Engineering", "هندسة الحاسوب", "computing", "bachelor"),
    ("information_systems", "Information Systems", "نظم المعلومات", "computing", "bachelor"),
    ("network_engineering", "Network Engineering", "هندسة الشبكات", "computing", "bachelor"),
    ("robotics", "Robotics", "الروبوتات", "computing", "bachelor"),
    ("game_development", "Game Development", "تطوير الألعاب", "computing", "bachelor"),
    ("interaction_design", "Interaction and UX Design", "تصميم التفاعل وتجربة المستخدم", "computing", "bachelor"),

    # --- Sciences -----------------------------------------------------------
    ("mathematics", "Mathematics", "الرياضيات", "science", "bachelor"),
    ("statistics", "Statistics", "الإحصاء", "science", "bachelor"),
    ("physics", "Physics", "الفيزياء", "science", "bachelor"),
    ("chemistry", "Chemistry", "الكيمياء", "science", "bachelor"),
    ("biology", "Biology", "الأحياء", "science", "bachelor"),
    ("biotechnology", "Biotechnology", "التقنية الحيوية", "science", "bachelor"),
    ("geology", "Geology and Earth Sciences", "الجيولوجيا وعلوم الأرض", "science", "bachelor"),
    ("environmental_science", "Environmental Science", "العلوم البيئية", "science", "bachelor"),
    ("astronomy", "Astronomy and Astrophysics", "علم الفلك والفيزياء الفلكية", "science", "bachelor"),
    ("meteorology", "Meteorology and Atmospheric Science", "الأرصاد وعلوم الغلاف الجوي", "science", "bachelor"),
    ("marine_science", "Marine Science", "علوم البحار", "science", "bachelor"),
    ("agriculture", "Agriculture and Food Science", "الزراعة وعلوم الأغذية", "science", "bachelor"),

    # --- Aviation and space -------------------------------------------------
    ("aerospace_engineering", "Aerospace Engineering", "هندسة الطيران والفضاء", "aerospace", "bachelor"),
    ("aircraft_maintenance", "Aircraft Maintenance Engineering", "هندسة صيانة الطائرات", "aerospace", "bachelor"),
    ("pilot_training", "Professional Pilot Studies", "دراسات الطيران المهني", "aerospace", "bachelor"),
    ("air_traffic_management", "Air Traffic Management", "إدارة الحركة الجوية", "aerospace", "bachelor"),
    ("aviation_management", "Aviation Management", "إدارة الطيران", "aerospace", "bachelor"),
    ("space_engineering", "Space Systems Engineering", "هندسة الأنظمة الفضائية", "aerospace", "bachelor"),

    # --- Business, finance, law --------------------------------------------
    ("accounting", "Accounting", "المحاسبة", "business", "bachelor"),
    ("finance", "Finance", "التمويل", "business", "bachelor"),
    ("economics", "Economics", "الاقتصاد", "business", "bachelor"),
    ("actuarial_science", "Actuarial Science", "العلوم الاكتوارية", "business", "bachelor"),
    ("business_administration", "Business Administration", "إدارة الأعمال", "business", "bachelor"),
    ("islamic_finance", "Islamic Banking and Finance", "المصرفية والتمويل الإسلامي", "business", "bachelor"),
    ("marketing", "Marketing", "التسويق", "business", "bachelor"),
    ("human_resources", "Human Resource Management", "إدارة الموارد البشرية", "business", "bachelor"),
    ("supply_chain", "Supply Chain and Logistics", "سلاسل الإمداد واللوجستيات", "business", "bachelor"),
    ("maritime_studies", "Maritime Studies", "الدراسات البحرية", "business", "bachelor"),
    ("entrepreneurship_major", "Entrepreneurship and Innovation", "ريادة الأعمال والابتكار", "business", "bachelor"),
    ("hospitality_management", "Hospitality Management", "إدارة الضيافة", "business", "bachelor"),
    ("tourism_management", "Tourism Management", "إدارة السياحة", "business", "bachelor"),
    ("event_management", "Event Management", "إدارة الفعاليات", "business", "bachelor"),
    ("law", "Law", "القانون", "law", "bachelor"),
    ("sharia_law", "Sharia and Law", "الشريعة والقانون", "law", "bachelor"),
    ("criminology", "Criminology and Criminal Justice", "علم الجريمة والعدالة الجنائية", "law", "bachelor"),

    # --- Government, education, social -------------------------------------
    ("public_administration", "Public Administration", "الإدارة العامة", "public", "bachelor"),
    ("public_policy", "Public Policy", "السياسات العامة", "public", "bachelor"),
    ("international_relations", "International Relations and Diplomacy", "العلاقات الدولية والدبلوماسية", "public", "bachelor"),
    ("political_science", "Political Science", "العلوم السياسية", "public", "bachelor"),
    ("homeland_security", "Homeland Security and Emergency Management", "الأمن الوطني وإدارة الطوارئ", "public", "bachelor"),
    ("military_science", "Military Science and Defence Studies", "العلوم العسكرية والدراسات الدفاعية", "public", "bachelor"),
    ("education_primary", "Primary Education", "التعليم الابتدائي", "education", "bachelor"),
    ("education_secondary", "Secondary Education", "التعليم الثانوي", "education", "bachelor"),
    ("special_education", "Special Education", "التربية الخاصة", "education", "bachelor"),
    ("curriculum_design", "Curriculum and Instruction", "المناهج وطرق التدريس", "education", "bachelor"),
    ("educational_counselling", "Educational Counselling", "الإرشاد التربوي", "education", "bachelor"),
    ("social_work", "Social Work", "الخدمة الاجتماعية", "public", "bachelor"),
    ("sociology", "Sociology", "علم الاجتماع", "public", "bachelor"),
    ("islamic_studies", "Islamic Studies", "الدراسات الإسلامية", "public", "bachelor"),
    ("library_science", "Library and Information Science", "علم المكتبات والمعلومات", "public", "bachelor"),
    ("translation", "Translation and Interpreting", "الترجمة والترجمة الفورية", "public", "bachelor"),

    # --- Media, design, culture --------------------------------------------
    ("journalism", "Journalism", "الصحافة", "media", "bachelor"),
    ("mass_communication", "Mass Communication", "الاتصال الجماهيري", "media", "bachelor"),
    ("film_production", "Film and Television Production", "إنتاج الأفلام والتلفزيون", "media", "bachelor"),
    ("photography", "Photography", "التصوير الفوتوغرافي", "media", "bachelor"),
    ("graphic_design", "Graphic Design", "التصميم الجرافيكي", "media", "bachelor"),
    ("animation", "Animation and Motion Graphics", "الرسوم المتحركة والموشن جرافيك", "media", "bachelor"),
    ("industrial_design", "Industrial and Product Design", "التصميم الصناعي وتصميم المنتجات", "media", "bachelor"),
    ("interior_design", "Interior Design", "التصميم الداخلي", "media", "bachelor"),
    ("fashion_design", "Fashion Design", "تصميم الأزياء", "media", "bachelor"),
    ("sound_engineering", "Sound Engineering", "هندسة الصوت", "media", "bachelor"),
    ("museum_studies", "Museum and Heritage Studies", "دراسات المتاحف والتراث", "media", "bachelor"),
    ("digital_media", "Digital Media", "الإعلام الرقمي", "media", "bachelor"),

    # --- Sport and wellbeing ------------------------------------------------
    ("sports_science", "Sports Science and Coaching", "علوم الرياضة والتدريب", "health", "bachelor"),
    ("culinary_arts", "Culinary Arts", "فنون الطهي", "business", "bachelor"),
]

MAJOR_IDS = {m[0] for m in MAJORS}
