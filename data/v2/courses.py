"""Courses added in v2, covering the skills the new careers introduced.

v1's 120 courses mapped onto a technology-weighted skill set. The healthcare,
legal, creative and hospitality careers added in v2 would otherwise recommend
nothing, because the learning-pathway engine can only suggest a course that
teaches a skill in the gap -- so every new skill needs at least two courses at
different levels, or the feature silently returns an empty list for whole
sectors.

Providers are named generically where the offering is institutional; no
provider is described in words taken from its own marketing.
"""

NEW_COURSES: list[dict] = []


def CO2(cid, en, ar, provider, ptype, skills, level, weeks, cost, lang, d_en, d_ar):
    sk = {}
    for token in skills.split():
        name, _, gain = token.partition(":")
        sk[name] = int(gain)
    assert level in {"beginner", "intermediate", "advanced"}, cid
    assert cost in {"free", "paid"}, cid
    assert lang in {"en", "ar", "both"}, cid
    NEW_COURSES.append({
        "id": cid, "title_en": en, "title_ar": ar, "provider": provider,
        "provider_type": ptype, "skills": sk, "level": level,
        "duration_weeks": weeks, "cost": cost, "language": lang,
        "description_en": d_en, "description_ar": d_ar,
        "search_query": f"{en} {provider}",
    })


# ---- clinical foundations ------------------------------------------------
CO2("anatomy_physiology", "Human Anatomy and Physiology", "التشريح ووظائف الأعضاء",
    "edX", "global", "life_sciences:45 patient_care:20", "beginner", 10, "free", "en",
    "The body's structure and how its systems work — the prerequisite for every clinical programme.",
    "بنية الجسم وكيفية عمل أجهزته، وهو المتطلب الأساسي لكل برنامج سريري.")
CO2("intro_patient_care", "Foundations of Patient Care", "أساسيات رعاية المرضى",
    "Coursera", "global", "patient_care:45 clinical_skills:20 counselling:15",
    "beginner", 6, "free", "both",
    "Communication, dignity, infection control and the basics of caring for a patient safely.",
    "التواصل والحفاظ على الكرامة ومكافحة العدوى وأساسيات رعاية المريض بأمان.")
CO2("medical_terminology", "Medical Terminology", "المصطلحات الطبية",
    "Coursera", "global", "clinical_skills:30 attention_detail:20 english_language:25",
    "beginner", 4, "free", "both",
    "The vocabulary clinical work is documented in, including the Latin and Greek roots behind it.",
    "المفردات التي يُوثَّق بها العمل السريري، بما في ذلك جذورها اللاتينية واليونانية.")
CO2("radiography_physics", "Radiographic Physics and Imaging", "فيزياء الأشعة والتصوير",
    "edX", "global", "diagnostic_imaging:50 physics_reasoning:30 attention_detail:20",
    "intermediate", 10, "paid", "en",
    "How X-ray, CT, MRI and ultrasound images are formed, and what makes one diagnostic and another useless.",
    "كيفية تكوّن صور الأشعة السينية والمقطعية والرنين والموجات فوق الصوتية، وما يجعل صورة تشخيصية وأخرى عديمة الفائدة.")
CO2("ultrasound_fundamentals", "Ultrasound Fundamentals", "أساسيات التصوير بالموجات فوق الصوتية",
    "Coursera", "global", "diagnostic_imaging:45 patient_care:20 attention_detail:25",
    "intermediate", 8, "paid", "en",
    "Probe handling, standard views and the real-time judgement that scanning requires.",
    "التعامل مع المسبار والمقاطع القياسية والحكم الآني الذي يتطلبه الفحص.")
CO2("radiation_safety", "Radiation Protection and Safety", "الوقاية من الإشعاع والسلامة",
    "IAEA open learning", "global", "quality_control:40 attention_detail:35 diagnostic_imaging:25",
    "intermediate", 5, "free", "en",
    "Dose limits, shielding and the justification principle behind every imaging request.",
    "حدود الجرعات والتدريع ومبدأ التبرير الذي يقوم عليه كل طلب تصوير.")
CO2("pharmacology_basics", "Principles of Pharmacology", "مبادئ علم الأدوية",
    "edX", "global", "pharmacology:50 life_sciences:25 attention_detail:20",
    "intermediate", 8, "free", "en",
    "How drugs act, interact and are cleared — and where the dangerous interactions are.",
    "كيف تعمل الأدوية وتتفاعل وتُطرح من الجسم، وأين تكمن التداخلات الخطرة.")
CO2("clinical_lab_methods", "Clinical Laboratory Methods", "طرق المختبرات السريرية",
    "Coursera", "global", "lab_diagnostics:50 chemistry_lab:30 quality_control:30",
    "intermediate", 9, "paid", "en",
    "Sample handling, assay principles and the quality control that decides whether a result can be released.",
    "التعامل مع العينات ومبادئ الفحوصات وضبط الجودة الذي يحدّد إمكانية اعتماد النتيجة.")
CO2("emergency_first_response", "Emergency Response and Life Support", "الاستجابة للطوارئ ودعم الحياة",
    "Red Crescent training", "uae", "emergency_response:50 patient_care:25 teamwork:20",
    "beginner", 3, "paid", "both",
    "Basic and advanced life support, trauma assessment and working as part of a response team.",
    "دعم الحياة الأساسي والمتقدم وتقييم الإصابات والعمل ضمن فريق استجابة.")
CO2("rehab_principles", "Principles of Rehabilitation", "مبادئ إعادة التأهيل",
    "edX", "global", "rehabilitation:50 patient_care:25 life_sciences:20",
    "intermediate", 8, "paid", "en",
    "Assessment, goal setting and exercise prescription for recovery after injury or illness.",
    "التقييم وتحديد الأهداف ووصف التمارين للتعافي بعد الإصابة أو المرض.")
CO2("nutrition_science", "Nutrition Science and Dietetics", "علوم التغذية والحميات",
    "Coursera", "global", "nutrition_diet:50 life_sciences:25 counselling:20",
    "beginner", 7, "free", "both",
    "Macronutrients, metabolic disease and how to build a diet plan a person will actually follow.",
    "المغذيات الكبرى وأمراض الأيض وكيفية بناء خطة غذائية يمكن للشخص الالتزام بها فعلًا.")
CO2("counselling_skills", "Counselling Skills and Practice", "مهارات الإرشاد والممارسة",
    "FutureLearn", "global", "counselling:50 patient_care:20 arabic_language:15",
    "intermediate", 8, "paid", "both",
    "Active listening, boundaries and structured therapeutic conversation.",
    "الإصغاء الفعّال وحدود العلاقة المهنية والمحادثة العلاجية المنظمة.")
CO2("child_development_course", "Child Development", "نمو الطفل",
    "Coursera", "global", "child_development:50 counselling:20 teaching:25",
    "beginner", 6, "free", "both",
    "Physical, cognitive and social development, and how to spot when it is not following the expected path.",
    "النمو الجسدي والمعرفي والاجتماعي، وكيفية ملاحظة خروجه عن المسار المتوقع.")
CO2("dental_assisting", "Dental Assisting Fundamentals", "أساسيات مساعدة طب الأسنان",
    "Alison", "global", "dental_skills:45 patient_care:25 attention_detail:25",
    "beginner", 5, "free", "en",
    "Chairside procedure, instrument handling and oral-health education for patients.",
    "الإجراءات بجانب الكرسي والتعامل مع الأدوات وتثقيف المرضى بصحة الفم.")
CO2("veterinary_intro", "Introduction to Veterinary Practice", "مدخل إلى الممارسة البيطرية",
    "edX", "global", "veterinary_care:45 life_sciences:30 clinical_skills:20",
    "beginner", 7, "paid", "en",
    "Animal handling, common conditions and the differences between species in clinical work.",
    "التعامل مع الحيوان والحالات الشائعة والفروق بين الأنواع في العمل السريري.")

# ---- law, policy, business ----------------------------------------------
CO2("uae_legal_system", "The UAE Legal System", "النظام القانوني الإماراتي",
    "UAE university open programme", "uae",
    "law_policy:50 arabic_language:25 writing_docs:20", "beginner", 6, "paid", "both",
    "Federal law, emirate law and free-zone regimes, and how they interact in practice.",
    "القوانين الاتحادية وقوانين الإمارات وأنظمة المناطق الحرة، وكيفية تفاعلها عمليًا.")
CO2("contract_drafting", "Contract Drafting and Negotiation", "صياغة العقود والتفاوض",
    "Coursera", "global", "law_policy:40 writing_docs:40 sales_negotiation:30",
    "intermediate", 6, "paid", "en",
    "Writing terms that survive a dispute, and negotiating the ones that matter.",
    "صياغة بنود تصمد أمام النزاع، والتفاوض على ما يهم منها فعلًا.")
CO2("islamic_finance_course", "Islamic Banking and Finance", "المصرفية والتمويل الإسلامي",
    "Emirates Institute of Finance", "uae",
    "finance_accounting:40 islamic_studies_skill:45 law_policy:25", "intermediate", 8, "paid", "both",
    "Sharia-compliant structures — murabaha, ijara, sukuk — and the governance around them.",
    "الهياكل المتوافقة مع الشريعة من مرابحة وإجارة وصكوك، والحوكمة المحيطة بها.")
CO2("audit_fundamentals", "Audit and Assurance Fundamentals", "أساسيات التدقيق والتأكيد",
    "ACCA open resources", "global", "finance_accounting:45 attention_detail:35 law_policy:20",
    "intermediate", 8, "free", "en",
    "Audit planning, evidence and the professional scepticism the role depends on.",
    "تخطيط التدقيق والأدلة والشك المهني الذي يقوم عليه هذا الدور.")
CO2("hr_management", "Human Resource Management", "إدارة الموارد البشرية",
    "Coursera", "global", "hr_people:50 leadership:25 law_policy:25", "beginner", 6, "free", "both",
    "Recruitment, performance management and the employment-law basics an HR role needs.",
    "التوظيف وإدارة الأداء وأساسيات قانون العمل التي يحتاجها دور الموارد البشرية.")
CO2("negotiation_skills", "Negotiation and Persuasion", "مهارات التفاوض والإقناع",
    "edX", "global", "sales_negotiation:50 public_speaking:25 business_strategy:20",
    "beginner", 5, "free", "en",
    "Preparation, anchoring and closing — negotiation as a process rather than a personality trait.",
    "التحضير والتثبيت والإغلاق، بوصف التفاوض عملية منظمة لا سمة شخصية.")

# ---- media and design ----------------------------------------------------
CO2("photography_fundamentals", "Photography Fundamentals", "أساسيات التصوير الفوتوغرافي",
    "Coursera", "global", "photography_video:50 creativity:25 visual_design:20",
    "beginner", 6, "free", "both",
    "Exposure, composition and light — the three things every other technique rests on.",
    "التعريض والتكوين والضوء، وهي الأسس التي تقوم عليها بقية التقنيات.")
CO2("video_editing_pro", "Video Editing and Post-Production", "المونتاج والإنتاج اللاحق",
    "Udemy", "global", "photography_video:45 creativity:30 attention_detail:30",
    "intermediate", 7, "paid", "en",
    "Cutting for pace and story, colour grading and delivering to broadcast specification.",
    "المونتاج لضبط الإيقاع والسرد، وتصحيح الألوان، والتسليم وفق مواصفات البث.")
CO2("motion_graphics_course", "Motion Graphics and Animation", "الموشن جرافيك والتحريك",
    "Udemy", "global", "animation_3d:45 visual_design:35 creativity:30",
    "intermediate", 8, "paid", "en",
    "Keyframing, easing and type in motion for broadcast and advertising work.",
    "الإطارات المفتاحية والتنعيم وتحريك النصوص لأعمال البث والإعلان.")
CO2("blender_3d", "3D Modelling and Rendering", "النمذجة والإخراج ثلاثي الأبعاد",
    "Blender open courseware", "global", "animation_3d:50 visual_design:30 creativity:25",
    "beginner", 9, "free", "en",
    "Modelling, texturing, lighting and rendering, using entirely free software.",
    "النمذجة والكساء والإضاءة والإخراج، باستخدام برمجيات مجانية بالكامل.")
CO2("arabic_bilingual_layout", "Arabic Typography and Bilingual Layout", "الطباعة العربية والتصميم ثنائي اللغة",
    "Regional design school programme", "uae",
    "visual_design:45 arabic_language:35 creativity:25", "intermediate", 5, "paid", "both",
    "Setting Arabic type well, and making it sit correctly alongside Latin in one layout.",
    "إتقان تنضيد الخط العربي وجعله ينسجم مع اللاتيني في تصميم واحد.")
CO2("sound_production", "Sound Recording and Mixing", "تسجيل الصوت والمزج",
    "Coursera", "global", "sound_audio:50 attention_detail:30 creativity:20",
    "intermediate", 7, "paid", "en",
    "Microphone technique, signal flow and mixing for music, film and live sound.",
    "تقنيات الميكروفون ومسار الإشارة والمزج للموسيقى والأفلام والصوت المباشر.")
CO2("interior_design_intro", "Interior Design Principles", "مبادئ التصميم الداخلي",
    "Alison", "global", "spatial_design:50 visual_design:30 creativity:25",
    "beginner", 6, "free", "en",
    "Space planning, materials and lighting, and how a drawing becomes a buildable scheme.",
    "تخطيط الفراغ والمواد والإضاءة، وكيف يتحول الرسم إلى تصميم قابل للتنفيذ.")
CO2("fashion_design_intro", "Fashion Design and Pattern Making", "تصميم الأزياء وإعداد الباترون",
    "FutureLearn", "global", "fashion_textiles:50 creativity:30 visual_design:25",
    "beginner", 7, "paid", "en",
    "From sketch to pattern to toile, including fabric behaviour and fit.",
    "من الرسم إلى الباترون إلى النموذج الأولي، بما يشمل سلوك الأقمشة والقَصّة.")
CO2("museum_curation", "Curating and Collections Management", "التنسيق المتحفي وإدارة المقتنيات",
    "FutureLearn", "global", "curation_heritage:50 research_methods:30 writing_docs:25",
    "intermediate", 6, "paid", "en",
    "Cataloguing, interpretation and the ethics of display and acquisition.",
    "الفهرسة والتفسير وأخلاقيات العرض والاقتناء.")
CO2("investigative_reporting", "Investigative Reporting", "التحقيق الصحفي",
    "Coursera", "global", "journalism_reporting:50 research_methods:30 writing_docs:30",
    "intermediate", 6, "free", "both",
    "Sourcing, verification and structuring a story that will survive scrutiny.",
    "المصادر والتحقق وبناء قصة تصمد أمام التدقيق.")

# ---- industry, services, environment -------------------------------------
CO2("lean_manufacturing", "Lean Manufacturing and Operations", "التصنيع الرشيق والعمليات",
    "edX", "global", "manufacturing_ops:50 quality_control:35 logistics_ops:20",
    "intermediate", 6, "free", "en",
    "Flow, waste elimination and the measurement discipline that keeps improvement real.",
    "انسياب العمل وإزالة الهدر وانضباط القياس الذي يجعل التحسين حقيقيًا.")
CO2("quality_six_sigma", "Quality Management and Six Sigma", "إدارة الجودة وستة سيجما",
    "Coursera", "global", "quality_control:50 statistics:30 data_analysis:25",
    "intermediate", 8, "paid", "en",
    "Process capability, control charts and structured problem solving.",
    "قدرة العملية وخرائط الضبط وحل المشكلات بمنهجية.")
CO2("culinary_foundations", "Culinary Foundations", "أساسيات فنون الطهي",
    "Regional hospitality academy", "uae", "culinary:50 quality_control:25 teamwork:25",
    "beginner", 8, "paid", "both",
    "Knife skills, stocks and sauces, food safety and working a station under service pressure.",
    "مهارات السكين والمرق والصلصات وسلامة الغذاء والعمل في محطة تحت ضغط الخدمة.")
CO2("hospitality_operations", "Hotel and Hospitality Operations", "عمليات الفنادق والضيافة",
    "Regional hospitality academy", "uae",
    "hospitality_ops:50 customer_service:35 leadership:20", "beginner", 6, "paid", "both",
    "Front office, housekeeping and food-and-beverage operations, and how they interlock.",
    "المكتب الأمامي والإشراف الداخلي وعمليات الأغذية والمشروبات، وكيفية ترابطها.")
CO2("sports_coaching_course", "Coaching Science and Practice", "علوم التدريب الرياضي وممارسته",
    "Coursera", "global", "sports_coaching:50 teaching:30 rehabilitation:20",
    "beginner", 6, "free", "both",
    "Training design, load management and coaching communication with athletes.",
    "تصميم التدريب وإدارة الأحمال والتواصل التدريبي مع الرياضيين.")
CO2("controlled_ag", "Controlled Environment Agriculture", "الزراعة في البيئات المحكومة",
    "edX", "global", "agriculture_food:50 sustainability:30 life_sciences:25",
    "intermediate", 7, "paid", "en",
    "Hydroponics, greenhouse control and growing food where the outdoor climate will not allow it.",
    "الزراعة المائية والتحكم في البيوت المحمية وإنتاج الغذاء حيث لا يسمح المناخ الخارجي بذلك.")
CO2("aquaculture_course", "Aquaculture Systems", "أنظمة الاستزراع المائي",
    "FAO open learning", "global", "agriculture_food:45 life_sciences:35 quality_control:25",
    "intermediate", 6, "free", "en",
    "Recirculating systems, water quality and stock health management.",
    "أنظمة إعادة التدوير وجودة المياه وإدارة صحة المخزون.")
CO2("maritime_operations", "Maritime and Port Operations", "العمليات البحرية وعمليات الموانئ",
    "Abu Dhabi maritime training", "uae",
    "maritime_ops:50 logistics_ops:35 emergency_response:20", "intermediate", 7, "paid", "both",
    "Vessel handling, port procedure and the safety regime that governs both.",
    "إدارة السفن وإجراءات الموانئ ونظام السلامة الذي يحكمهما.")
CO2("arabic_translation_prof", "Professional Arabic-English Translation", "الترجمة الاحترافية بين العربية والإنجليزية",
    "Regional translation institute", "uae",
    "translation_skill:50 arabic_language:40 english_language:35", "advanced", 10, "paid", "both",
    "Legal, medical and official translation, including the conventions each field expects.",
    "الترجمة القانونية والطبية والرسمية، بما يشمل الأعراف التي يتوقعها كل مجال.")
CO2("emergency_management", "Emergency and Disaster Management", "إدارة الطوارئ والكوارث",
    "Rabdan open programme", "uae",
    "emergency_response:45 project_management:30 law_policy:25", "intermediate", 6, "paid", "both",
    "Preparedness planning, incident command and multi-agency coordination.",
    "التخطيط للتأهب وقيادة الحوادث والتنسيق بين الجهات المتعددة.")
