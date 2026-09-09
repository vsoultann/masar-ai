"""Technology specialisations, and the energy / aviation / space roles v1 missed."""

from v2.careers_base import C2

TECH_EN = ["technology firms", "national digital-government entities", "banking and telecom groups"]
TECH_AR = ["شركات التقنية", "جهات الحكومة الرقمية الوطنية", "مجموعات المصارف والاتصالات"]
CS_SUBJ = {"math": 88, "computer_science": 95, "physics": 72, "english": 82, "chemistry": 58}
TECH_INITS = ["ai_strategy_2031", "digital_economy_strategy", "centennial_2071"]

C2("ai_research_scientist", "AI Research Scientist", "عالم أبحاث الذكاء الاصطناعي",
   "ai_data", "high", (25000, 65000),
   "machine_learning:98 mathematics:95 research_methods:92 programming:85 "
   "statistics:88 writing_docs:78",
   "32 98 55 38 38 72", "92 88 30 55 22",
   {"math": 96, "computer_science": 92, "physics": 80, "english": 88, "chemistry": 60},
   ["artificial_intelligence", "computer_science", "mathematics"],
   "Develops new machine-learning methods rather than applying existing ones, "
   "and publishes the results.",
   "يطوّر أساليب جديدة في تعلّم الآلة بدل تطبيق الموجود منها، وينشر نتائج أبحاثه.",
   ["national AI research institutes", "university research groups", "corporate research labs"],
   ["معاهد البحث الوطنية في الذكاء الاصطناعي", "مجموعات البحث الجامعية", "مختبرات البحث في الشركات"],
   TECH_INITS, years=8, envs=["laboratory", "office"], icon="flask-conical")

C2("computer_vision_engineer", "Computer Vision Engineer", "مهندس الرؤية الحاسوبية",
   "ai_data", "high", (18000, 45000),
   "machine_learning:92 programming:90 mathematics:85 data_analysis:80 "
   "problem_solving:85 systems_design:70",
   "48 92 45 35 42 75", "82 86 32 55 24", CS_SUBJ,
   ["artificial_intelligence", "computer_science"],
   "Builds systems that interpret images and video — inspection, security, "
   "medical imaging and autonomous navigation.",
   "يبني أنظمة تفسّر الصور والفيديو، في التفتيش والأمن والتصوير الطبي والملاحة الذاتية.",
   TECH_EN, TECH_AR, TECH_INITS, years=4, icon="eye")

C2("nlp_engineer", "NLP Engineer", "مهندس معالجة اللغة الطبيعية", "ai_data",
   "high", (18000, 46000),
   "machine_learning:92 programming:88 arabic_language:82 mathematics:82 "
   "data_analysis:78 research_methods:72",
   "35 92 55 45 42 72", "86 86 35 60 24",
   {"math": 88, "computer_science": 92, "arabic": 85, "english": 88, "physics": 62},
   ["artificial_intelligence", "computer_science"],
   "Builds systems that process human language, with Arabic presenting harder "
   "problems than English in morphology, dialect and script.",
   "يبني أنظمة تعالج اللغة البشرية، وتطرح العربية فيها تحديات أصعب من الإنجليزية في "
   "الصرف واللهجات والكتابة.",
   TECH_EN, TECH_AR, TECH_INITS, years=4, icon="languages")

C2("robotics_engineer", "Robotics Engineer", "مهندس الروبوتات", "ai_data", "high",
   (16000, 42000),
   "electronics:88 programming:85 mechanical_design:82 systems_design:80 "
   "machine_learning:70 problem_solving:88",
   "92 90 45 40 42 76", "82 88 38 58 22",
   {"math": 90, "physics": 92, "computer_science": 88, "english": 78, "chemistry": 62},
   ["robotics", "mechatronics"],
   "Builds machines that sense and act in the physical world, where software "
   "bugs become mechanical accidents.",
   "يبني آلات تستشعر محيطها وتتحرك فيه، حيث تتحول أخطاء البرمجة إلى حوادث ميكانيكية.",
   TECH_EN, TECH_AR, TECH_INITS + ["industrial_strategy"], years=5,
   envs=["laboratory", "plant"], icon="bot")

C2("cloud_architect", "Cloud Solutions Architect", "مهندس الحلول السحابية", "software",
   "very_high", (22000, 55000),
   "cloud_infrastructure:95 systems_design:92 networking:82 cybersecurity:75 "
   "problem_solving:85 business_strategy:70",
   "52 88 38 48 62 88", "76 90 48 60 22", CS_SUBJ,
   ["computer_science", "information_systems"],
   "Designs how an organisation's systems are structured in the cloud, balancing "
   "cost, resilience and the constraints of data-residency rules.",
   "يصمّم بنية أنظمة المؤسسة في السحابة، موازنًا بين الكلفة والمرونة وقيود قواعد "
   "الإقامة المحلية للبيانات.",
   TECH_EN, TECH_AR, TECH_INITS, years=5, icon="cloud")

C2("network_engineer", "Network Engineer", "مهندس الشبكات", "software", "high",
   (13000, 34000),
   "networking:95 cybersecurity:75 systems_design:78 problem_solving:85 "
   "attention_detail:85 cloud_infrastructure:70",
   "72 82 28 48 42 90", "62 90 40 60 24", CS_SUBJ,
   ["network_engineering", "computer_engineering"],
   "Designs and keeps running the networks everything else depends on, and is "
   "first to be called when 'the internet is down'.",
   "يصمّم الشبكات التي يعتمد عليها كل شيء آخر ويحافظ على تشغيلها، وهو أول من يُستدعى "
   "حين «ينقطع الإنترنت».",
   TECH_EN, TECH_AR, TECH_INITS, years=4, icon="network")

C2("database_administrator", "Database Administrator", "مسؤول قواعد البيانات", "software",
   "high", (14000, 35000),
   "systems_design:85 data_analysis:78 cybersecurity:72 attention_detail:95 "
   "problem_solving:80 programming:70",
   "58 85 25 42 40 95", "58 94 32 58 22", CS_SUBJ,
   ["information_systems", "computer_science"],
   "Keeps organisational data correct, fast and recoverable — the role where "
   "the worst mistakes are silent ones.",
   "يحافظ على صحة بيانات المؤسسة وسرعتها وقابليتها للاسترجاع، وهو الدور الذي تكون "
   "فيه أسوأ الأخطاء صامتة.",
   TECH_EN, TECH_AR, TECH_INITS, years=4, icon="database")

C2("blockchain_developer", "Blockchain Developer", "مطوّر البلوكتشين", "software",
   "moderate", (16000, 42000),
   "programming:92 systems_design:82 cybersecurity:78 mathematics:75 "
   "problem_solving:85 finance_accounting:60",
   "45 88 48 38 55 82", "82 86 38 55 24", CS_SUBJ,
   ["computer_science", "software_engineering"],
   "Builds distributed-ledger applications, mostly in payments, trade "
   "documentation and government record-keeping.",
   "يبني تطبيقات السجلات الموزعة، غالبًا في المدفوعات ووثائق التجارة وحفظ السجلات الحكومية.",
   TECH_EN, TECH_AR, TECH_INITS, years=4, icon="link")

C2("it_support_specialist", "IT Support Specialist", "أخصائي الدعم التقني", "software",
   "very_high", (7000, 18000),
   "networking:75 problem_solving:82 customer_service:88 teamwork:78 "
   "attention_detail:78 english_language:72",
   "72 72 25 78 45 82", "58 84 58 78 28",
   {"computer_science": 82, "math": 68, "english": 78, "physics": 60},
   ["information_systems"],
   "Resolves the daily technology problems of an organisation, and is the "
   "most common entry point into an IT career.",
   "يحلّ المشكلات التقنية اليومية في المؤسسة، وهو أكثر نقاط الدخول شيوعًا إلى مهن "
   "تقنية المعلومات.",
   TECH_EN, TECH_AR, TECH_INITS, years=2, icon="headphones")

C2("systems_analyst", "Systems Analyst", "محلل النظم", "software", "high",
   (14000, 36000),
   "systems_design:88 business_strategy:80 writing_docs:82 data_analysis:75 "
   "teamwork:82 problem_solving:82",
   "42 85 38 68 62 88", "72 88 55 68 24", CS_SUBJ,
   ["information_systems", "computer_science"],
   "Sits between the people who need a system and the people who build it, and "
   "turns vague requirements into a specification.",
   "يقف بين من يحتاجون النظام ومن يبنونه، ويحوّل المتطلبات الغامضة إلى مواصفات محددة.",
   TECH_EN, TECH_AR, TECH_INITS, years=4, icon="workflow")

# ---------------------------------------------------- energy and aviation
C2("solar_engineer", "Solar Systems Engineer", "مهندس الأنظمة الشمسية", "energy",
   "very_high", (14000, 36000),
   "energy_systems:95 electronics:82 sustainability:88 physics_reasoning:82 "
   "project_management:70 problem_solving:78",
   "88 88 35 52 48 78", "78 88 40 62 22",
   {"physics": 92, "math": 88, "chemistry": 72, "english": 76, "computer_science": 68},
   ["electrical_engineering", "environmental_engineering"],
   "Designs and commissions photovoltaic installations, from rooftop systems to "
   "utility-scale plants in high-dust, high-heat conditions.",
   "يصمّم منشآت الطاقة الشمسية ويشغّلها، من الأنظمة على أسطح المباني إلى المحطات "
   "الكبرى في ظروف شديدة الغبار والحرارة.",
   ["renewable energy developers", "national utilities", "engineering consultancies"],
   ["مطوّرو الطاقة المتجددة", "شركات المرافق الوطنية", "المكاتب الاستشارية الهندسية"],
   ["net_zero_2050", "centennial_2071", "nafis"], years=4, icon="sun")

C2("nuclear_plant_operator", "Nuclear Plant Operator", "مشغّل المحطة النووية", "energy",
   "high", (16000, 42000),
   "energy_systems:92 attention_detail:98 emergency_response:88 quality_control:90 "
   "physics_reasoning:82 teamwork:82",
   "88 82 22 55 42 95", "58 96 38 62 16",
   {"physics": 92, "math": 85, "chemistry": 80, "english": 78},
   ["nuclear_engineering", "electrical_engineering"],
   "Runs reactor systems from the control room under procedures where deviation "
   "is never improvised.",
   "يشغّل أنظمة المفاعل من غرفة التحكم وفق إجراءات لا يُرتجل فيها أي خروج عن المسار.",
   ["the national nuclear energy corporation", "power generation operators"],
   ["مؤسسة الطاقة النووية الوطنية", "مشغّلو توليد الطاقة"],
   ["net_zero_2050", "centennial_2071", "nafis"], years=4,
   envs=["control_room", "plant"], icon="atom")

C2("process_engineer_oil_gas", "Oil and Gas Process Engineer", "مهندس عمليات النفط والغاز",
   "energy", "high", (18000, 48000),
   "chemistry_lab:85 energy_systems:90 quality_control:82 problem_solving:85 "
   "project_management:70 sustainability:60",
   "85 90 30 45 50 85", "70 92 38 58 20",
   {"chemistry": 90, "physics": 88, "math": 88, "english": 78},
   ["chemical_engineering", "petroleum_engineering"],
   "Optimises the processes that separate, refine and move hydrocarbons, "
   "balancing throughput against safety and emissions limits.",
   "يحسّن العمليات التي تفصل الهيدروكربونات وتكرّرها وتنقلها، موازنًا بين معدل الإنتاج "
   "وحدود السلامة والانبعاثات.",
   ["national energy companies", "refinery operators", "engineering contractors"],
   ["شركات الطاقة الوطنية", "مشغّلو المصافي", "مقاولو الهندسة"],
   ["industrial_strategy", "net_zero_2050", "nafis"], years=4,
   envs=["plant", "office"], icon="fuel")

C2("aircraft_maintenance_engineer", "Aircraft Maintenance Engineer", "مهندس صيانة الطائرات",
   "aviation", "very_high", (12000, 32000),
   "aviation_ops:90 mechanical_design:82 attention_detail:98 quality_control:92 "
   "electronics:75 teamwork:78",
   "95 78 25 52 40 92", "58 96 40 62 18",
   {"physics": 88, "math": 82, "english": 82, "computer_science": 65},
   ["aircraft_maintenance", "aerospace_engineering"],
   "Certifies that an aircraft is fit to fly — a role where the signature "
   "carries personal legal responsibility.",
   "يشهد بصلاحية الطائرة للطيران، وهو دور تحمل فيه التوقيعُ مسؤوليةً قانونية شخصية.",
   ["national airlines", "aircraft maintenance organisations", "airport operators"],
   ["شركات الطيران الوطنية", "منظمات صيانة الطائرات", "مشغّلو المطارات"],
   ["centennial_2071", "nafis"], years=4, envs=["aircraft", "field"], icon="wrench")

C2("aviation_operations_manager", "Aviation Operations Manager", "مدير عمليات الطيران",
   "aviation", "high", (18000, 45000),
   "aviation_ops:92 project_management:85 leadership:85 logistics_ops:80 "
   "problem_solving:82 teamwork:82",
   "68 75 32 72 85 88", "62 90 68 62 20",
   {"math": 80, "physics": 75, "english": 85, "social": 70},
   ["aviation_management", "supply_chain"],
   "Coordinates the ground side of flying — turnarounds, crew, slots and "
   "disruption recovery — against a clock that does not pause.",
   "ينسّق الجانب الأرضي من الطيران، من دورات المناولة والطواقم والفترات الزمنية إلى "
   "التعافي من الاضطرابات، أمام ساعة لا تتوقف.",
   ["national airlines", "airport operators", "ground handling companies"],
   ["شركات الطيران الوطنية", "مشغّلو المطارات", "شركات المناولة الأرضية"],
   ["centennial_2071", "tourism_strategy_2031", "nafis"], years=4,
   envs=["control_room", "office"], icon="plane-takeoff")

C2("astrophysicist", "Astrophysicist", "الفيزيائي الفلكي", "space", "moderate",
   (16000, 42000),
   "physics_reasoning:98 mathematics:95 research_methods:92 data_analysis:85 "
   "programming:78 writing_docs:78",
   "42 98 45 35 30 78", "90 88 28 58 24",
   {"physics": 96, "math": 96, "english": 85, "chemistry": 70, "computer_science": 80},
   ["astronomy", "physics"],
   "Studies the physics of stars, planets and the wider universe, mostly through "
   "modelling and analysis of observational data.",
   "يدرس فيزياء النجوم والكواكب والكون الأوسع، غالبًا عبر النمذجة وتحليل بيانات الرصد.",
   ["space agencies", "university research groups", "observatories"],
   ["وكالات الفضاء", "مجموعات البحث الجامعية", "المراصد الفلكية"],
   ["space_strategy_2030", "centennial_2071"], years=8,
   envs=["laboratory", "office"], icon="telescope")

C2("meteorologist", "Meteorologist", "خبير الأرصاد الجوية", "space", "high",
   (14000, 35000),
   "physics_reasoning:88 data_analysis:88 statistics:82 research_methods:80 "
   "geospatial_gis:75 writing_docs:70",
   "58 92 32 55 40 85", "80 88 42 62 22",
   {"physics": 90, "math": 88, "english": 80, "chemistry": 70, "computer_science": 78},
   ["meteorology", "physics"],
   "Forecasts and models the atmosphere, including the dust, heat and rare "
   "extreme rainfall that matter most in this region.",
   "يتنبأ بحالة الغلاف الجوي وينمذجها، بما يشمل الغبار والحرارة والأمطار الشديدة "
   "النادرة التي تهم هذه المنطقة أكثر من غيرها.",
   ["the national meteorology centre", "aviation authorities", "research institutes"],
   ["المركز الوطني للأرصاد", "هيئات الطيران", "معاهد البحوث"],
   ["space_strategy_2030", "net_zero_2050", "we_the_uae_2031"], years=4,
   envs=["office", "control_room"], icon="cloud-sun")
