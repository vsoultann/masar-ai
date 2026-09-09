"""Engineering, industry and the built environment.

v1 covered civil, architecture, surveying and planning. This adds the
mechanical/electrical/chemical family that had no home in the old taxonomy,
plus the water and environmental roles that matter disproportionately here.
"""

from v2.careers_base import C2

ENG_EN = ["engineering consultancies", "contracting groups", "government infrastructure authorities"]
ENG_AR = ["المكاتب الاستشارية الهندسية", "شركات المقاولات", "هيئات البنية التحتية الحكومية"]
IND_EN = ["manufacturing groups", "national industrial companies", "energy operators"]
IND_AR = ["المجموعات الصناعية", "الشركات الصناعية الوطنية", "مشغّلو قطاع الطاقة"]
ENG_SUBJ = {"math": 90, "physics": 92, "chemistry": 70, "english": 76, "computer_science": 70}
INITS = ["centennial_2071", "industrial_strategy", "nafis"]

C2("structural_engineer", "Structural Engineer", "المهندس الإنشائي", "construction",
   "high", (14000, 38000),
   "civil_structures:95 physics_reasoning:88 mathematics:85 attention_detail:90 "
   "problem_solving:85 project_management:65",
   "88 90 40 45 45 85", "70 92 35 58 20", ENG_SUBJ,
   ["structural_engineering", "civil_engineering"],
   "Calculates whether a building will stand up, and designs the frame that makes "
   "sure it does under wind, load and time.",
   "يحسب ما إذا كان المبنى سيصمد، ويصمّم الهيكل الذي يضمن ذلك تحت تأثير الرياح والأحمال والزمن.",
   ENG_EN, ENG_AR, INITS, years=5, icon="frame")

C2("construction_project_manager", "Construction Project Manager", "مدير مشاريع الإنشاءات",
   "construction", "very_high", (18000, 48000),
   "project_management:95 leadership:88 civil_structures:70 problem_solving:82 "
   "teamwork:85 finance_accounting:65",
   "72 68 35 72 88 82", "62 90 72 62 22", ENG_SUBJ,
   ["construction_management", "civil_engineering"],
   "Holds a build together across budget, schedule, subcontractors and safety, "
   "and is the person answerable when any one of them slips.",
   "يمسك بخيوط المشروع من ميزانية وجدول زمني ومقاولين من الباطن وسلامة، وهو المسؤول "
   "عن الإجابة حين يتعثّر أي منها.",
   ENG_EN, ENG_AR, INITS, years=5, icon="clipboard-list")

C2("mechanical_engineer", "Mechanical Engineer", "المهندس الميكانيكي", "engineering",
   "very_high", (13000, 35000),
   "mechanical_design:95 physics_reasoning:88 mathematics:82 problem_solving:85 "
   "quality_control:72 project_management:62",
   "92 88 45 45 45 78", "74 88 40 58 22", ENG_SUBJ,
   ["mechanical_engineering", "materials_engineering"],
   "Designs and tests machines and moving systems, from building services to "
   "manufacturing lines.",
   "يصمّم الآلات والأنظمة المتحركة ويختبرها، من الأنظمة الميكانيكية للمباني إلى خطوط التصنيع.",
   IND_EN, IND_AR, INITS, years=4, icon="cog")

C2("electrical_engineer", "Electrical Engineer", "المهندس الكهربائي", "engineering",
   "very_high", (13000, 36000),
   "electronics:95 physics_reasoning:88 mathematics:85 energy_systems:75 "
   "attention_detail:85 problem_solving:82",
   "88 90 38 45 45 82", "72 90 38 58 22", ENG_SUBJ,
   ["electrical_engineering"],
   "Designs power and control systems and is responsible for the distribution "
   "that everything else silently assumes will work.",
   "يصمّم أنظمة الطاقة والتحكم، ويتحمّل مسؤولية التوزيع الذي تفترض بقية الأنظمة "
   "ضمنًا أنه سيعمل دائمًا.",
   IND_EN, IND_AR, INITS, years=4, icon="zap")

C2("mechatronics_engineer", "Mechatronics Engineer", "مهندس الميكاترونكس", "engineering",
   "high", (14000, 36000),
   "electronics:88 mechanical_design:88 programming:78 systems_design:82 "
   "problem_solving:85 quality_control:70",
   "92 88 48 45 45 78", "78 88 40 58 22",
   {"math": 88, "physics": 90, "computer_science": 82, "english": 76, "chemistry": 65},
   ["mechatronics", "robotics"],
   "Works where mechanical, electrical and software systems meet — the discipline "
   "behind automated production and robotics.",
   "يعمل عند تقاطع الأنظمة الميكانيكية والكهربائية والبرمجية، وهو التخصص الذي يقف "
   "خلف الإنتاج المؤتمت والروبوتات.",
   IND_EN, IND_AR, INITS, years=4, icon="bot")

C2("chemical_engineer", "Chemical Engineer", "المهندس الكيميائي", "engineering",
   "high", (15000, 40000),
   "chemistry_lab:92 physics_reasoning:82 mathematics:82 quality_control:80 "
   "problem_solving:85 sustainability:65",
   "82 92 32 45 48 82", "74 90 35 58 20",
   {"chemistry": 95, "math": 88, "physics": 85, "biology": 65, "english": 76},
   ["chemical_engineering", "chemistry", "materials_engineering"],
   "Scales chemical processes from a laboratory result to a plant that runs "
   "safely and economically at industrial volume.",
   "ينقل العمليات الكيميائية من نتيجة مخبرية إلى منشأة تعمل بأمان واقتصادية على "
   "نطاق صناعي.",
   IND_EN, IND_AR, INITS, years=4, envs=["plant", "laboratory"], icon="flask-conical")

C2("industrial_engineer", "Industrial Engineer", "المهندس الصناعي", "engineering",
   "high", (13000, 34000),
   "manufacturing_ops:88 quality_control:88 data_analysis:78 project_management:78 "
   "problem_solving:85 logistics_ops:72",
   "72 88 35 55 62 88", "70 90 45 62 22", ENG_SUBJ,
   ["industrial_engineering"],
   "Makes production systems faster, cheaper and less wasteful by studying how "
   "work actually flows rather than how it is supposed to.",
   "يجعل أنظمة الإنتاج أسرع وأقل كلفة وهدرًا، بدراسة كيفية سير العمل فعليًا لا كما "
   "يُفترض أن يسير.",
   IND_EN, IND_AR, INITS, years=4, icon="factory")

C2("environmental_engineer", "Environmental Engineer", "المهندس البيئي", "engineering",
   "high", (13000, 33000),
   "sustainability:92 chemistry_lab:75 civil_structures:65 data_analysis:75 "
   "law_policy:65 problem_solving:80",
   "78 88 38 68 45 78", "80 88 40 72 22",
   {"chemistry": 85, "biology": 80, "math": 82, "physics": 80, "english": 78},
   ["environmental_engineering", "environmental_science"],
   "Designs the systems that keep industry within environmental limits — waste, "
   "emissions, contamination and remediation.",
   "يصمّم الأنظمة التي تُبقي الصناعة ضمن الحدود البيئية، من النفايات والانبعاثات إلى "
   "التلوث ومعالجته.",
   IND_EN, IND_AR, ["net_zero_2050", "we_the_uae_2031", "nafis"], years=4, icon="leaf")

C2("water_resources_engineer", "Water Resources Engineer", "مهندس الموارد المائية",
   "engineering", "very_high", (14000, 36000),
   "civil_structures:80 sustainability:88 data_analysis:75 physics_reasoning:80 "
   "geospatial_gis:70 problem_solving:82",
   "82 88 35 62 45 82", "76 90 38 68 22", ENG_SUBJ,
   ["water_resources", "civil_engineering"],
   "Designs desalination, distribution and reuse systems — arguably the most "
   "consequential engineering discipline in a desert country.",
   "يصمّم أنظمة التحلية والتوزيع وإعادة الاستخدام، وهو قد يكون أكثر التخصصات الهندسية "
   "أثرًا في دولة صحراوية.",
   ENG_EN, ENG_AR, ["net_zero_2050", "food_security_2051", "centennial_2071"],
   years=5, icon="droplets")

C2("hvac_engineer", "HVAC Engineer", "مهندس التكييف والتبريد", "engineering",
   "very_high", (12000, 32000),
   "mechanical_design:88 energy_systems:85 physics_reasoning:80 sustainability:72 "
   "quality_control:75 project_management:65",
   "90 82 32 48 45 82", "66 90 40 60 22", ENG_SUBJ,
   ["mechanical_engineering"],
   "Designs cooling and air systems for buildings — in this climate a primary "
   "engineering discipline rather than a building service.",
   "يصمّم أنظمة التبريد والهواء للمباني، وهو في هذا المناخ تخصص هندسي أساسي لا خدمة "
   "ثانوية من خدمات المبنى.",
   ENG_EN, ENG_AR, ["net_zero_2050", "industrial_strategy", "nafis"], years=4, icon="wind")

C2("geomatics_engineer", "Surveying and Geomatics Engineer", "مهندس المساحة والجيوماتكس",
   "construction", "high", (12000, 30000),
   "geospatial_gis:95 mathematics:82 attention_detail:92 data_analysis:75 "
   "civil_structures:60 problem_solving:72",
   "88 85 32 45 42 90", "68 92 35 60 22", ENG_SUBJ,
   ["geomatics", "civil_engineering"],
   "Measures and maps land precisely enough that a building ends up where the "
   "drawing said it would.",
   "يقيس الأرض ويرسم خرائطها بدقة تكفي لأن يقع المبنى في الموضع الذي حدّده المخطط تمامًا.",
   ENG_EN, ENG_AR, INITS, years=4, envs=["field", "office"], icon="map")
