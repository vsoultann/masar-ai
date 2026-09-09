"""Government, uniformed services, education and social work."""

from v2.careers_base import C2

GOV_EN = ["federal ministries", "emirate government departments", "public authorities"]
GOV_AR = ["الوزارات الاتحادية", "الدوائر الحكومية المحلية", "الهيئات العامة"]
SCHOOL_EN = ["public schools", "private school groups", "the ministry of education"]
SCHOOL_AR = ["المدارس الحكومية", "مجموعات المدارس الخاصة", "وزارة التربية والتعليم"]
UNIFORM_EN = ["police forces", "civil defence", "federal security services"]
UNIFORM_AR = ["قوات الشرطة", "الدفاع المدني", "أجهزة الأمن الاتحادية"]
HUM_SUBJ = {"arabic": 85, "english": 82, "social": 88, "islamic": 72, "math": 62}
GOV_INITS = ["we_the_uae_2031", "centennial_2071", "nafis"]
EDU_INITS = ["we_the_uae_2031", "nafis", "centennial_2071"]

C2("police_officer", "Police Officer", "ضابط الشرطة", "government", "very_high",
   (10000, 30000),
   "emergency_response:88 law_policy:82 teamwork:88 public_speaking:70 "
   "attention_detail:82 arabic_language:85",
   "82 68 25 82 72 85", "55 90 65 68 20", HUM_SUBJ,
   ["criminology", "homeland_security", "law"],
   "Maintains public safety and investigates crime, in a service that combines "
   "shift work with substantial community contact.",
   "يحافظ على الأمن العام ويحقق في الجرائم، في سلك يجمع بين العمل بنظام الورديات "
   "والتواصل الواسع مع المجتمع.",
   UNIFORM_EN, UNIFORM_AR, GOV_INITS, years=4, envs=["field", "office"], icon="shield")

C2("firefighter", "Firefighter", "رجل الإطفاء", "government", "high", (9000, 24000),
   "emergency_response:98 teamwork:92 attention_detail:80 problem_solving:75 "
   "patient_care:65 leadership:65",
   "95 62 22 82 58 78", "52 90 62 76 16",
   {"physics": 72, "arabic": 78, "english": 68, "biology": 68, "social": 72},
   ["homeland_security", "paramedic_science"],
   "Responds to fire, rescue and hazardous-material incidents, with training and "
   "physical readiness that must be maintained continuously.",
   "يستجيب لحوادث الحريق والإنقاذ والمواد الخطرة، بتدريب وجاهزية بدنية يجب الحفاظ "
   "عليهما باستمرار.",
   UNIFORM_EN, UNIFORM_AR, GOV_INITS, years=2, envs=["field"], icon="flame")

C2("civil_defence_specialist", "Civil Defence Specialist", "أخصائي الدفاع المدني",
   "government", "high", (12000, 32000),
   "emergency_response:92 law_policy:78 project_management:78 attention_detail:88 "
   "writing_docs:72 teamwork:82",
   "78 78 25 75 68 88", "58 92 55 70 18", HUM_SUBJ,
   ["homeland_security", "environmental_engineering"],
   "Plans for emergencies before they happen: inspects buildings, writes safety "
   "requirements and coordinates multi-agency response.",
   "يخطط للطوارئ قبل وقوعها: يفتّش المباني ويضع اشتراطات السلامة وينسّق الاستجابة "
   "بين الجهات المختلفة.",
   UNIFORM_EN, UNIFORM_AR, GOV_INITS, years=4, envs=["field", "office"], icon="siren")

C2("military_officer", "Military Officer", "الضابط العسكري", "government", "high",
   (14000, 45000),
   "leadership:95 emergency_response:85 teamwork:92 project_management:80 "
   "public_speaking:75 attention_detail:82",
   "85 72 25 78 88 85", "58 92 72 62 16", HUM_SUBJ,
   ["military_science", "homeland_security"],
   "Leads and trains personnel and plans operations, following a structured "
   "commissioning and progression path.",
   "يقود الأفراد ويدرّبهم ويخطط للعمليات، وفق مسار منظّم للترقّي والتأهيل.",
   ["the national armed forces"], ["القوات المسلحة الوطنية"], GOV_INITS,
   years=4, envs=["field", "office"], icon="medal")

C2("customs_officer", "Customs Officer", "ضابط الجمارك", "government", "high",
   (9000, 24000),
   "law_policy:85 attention_detail:92 logistics_ops:78 arabic_language:80 "
   "english_language:75 teamwork:75",
   "68 72 22 68 62 92", "52 92 52 66 22", HUM_SUBJ,
   ["criminology", "supply_chain", "law"],
   "Inspects and clears goods crossing the border, applying trade rules and "
   "spotting what does not match its paperwork.",
   "يفتّش البضائع العابرة للحدود ويفسح عنها، مطبّقًا قواعد التجارة وملاحظًا ما لا "
   "يطابق مستنداته.",
   GOV_EN + ["port and airport authorities"], GOV_AR + ["هيئات الموانئ والمطارات"],
   GOV_INITS, years=3, envs=["field", "office"], icon="package-search")

C2("urban_governance_specialist", "Urban Governance Specialist", "أخصائي الحوكمة الحضرية",
   "government", "moderate", (15000, 40000),
   "law_policy:88 geospatial_gis:70 data_analysis:78 writing_docs:85 "
   "public_speaking:75 sustainability:75",
   "38 85 45 72 68 85", "78 88 55 68 24", HUM_SUBJ,
   ["urban_planning", "public_policy", "public_administration"],
   "Works on how cities are regulated and serviced — housing, mobility and land "
   "use — translating policy into local rules.",
   "يعمل على كيفية تنظيم المدن وخدمتها، من الإسكان والتنقل واستخدامات الأراضي، "
   "فيترجم السياسات إلى أنظمة محلية.",
   GOV_EN, GOV_AR, GOV_INITS + ["net_zero_2050"], years=5, icon="building-2")

# ------------------------------------------------------------- education
C2("primary_teacher", "Primary School Teacher", "معلم المرحلة الابتدائية", "education",
   "very_high", (9000, 22000),
   "teaching:95 child_development:88 arabic_language:82 counselling:72 "
   "creativity:75 teamwork:78",
   "32 62 62 95 55 78", "68 88 72 90 24", HUM_SUBJ,
   ["education_primary"],
   "Teaches the full curriculum to one class of young children, and is often the "
   "adult who first notices a learning difficulty.",
   "يدرّس المنهج كاملًا لصف واحد من صغار الطلبة، وهو غالبًا أول بالغ يلاحظ وجود "
   "صعوبة تعلّم لدى الطفل.",
   SCHOOL_EN, SCHOOL_AR, EDU_INITS, years=4, envs=["classroom"], icon="school")

C2("university_lecturer", "University Lecturer", "المحاضر الجامعي", "education",
   "moderate", (18000, 48000),
   "teaching:88 research_methods:92 writing_docs:88 public_speaking:85 "
   "english_language:85 problem_solving:78",
   "30 92 52 82 58 75", "88 86 60 70 24",
   {"arabic": 78, "english": 88, "social": 78, "math": 72},
   ["curriculum_design", "education_secondary"],
   "Teaches and researches within a discipline, normally after a doctorate, and "
   "is assessed on publication as well as teaching.",
   "يدرّس ويبحث في تخصصه، عادةً بعد الدكتوراه، ويُقيَّم على النشر العلمي إلى جانب التدريس.",
   ["universities and colleges"], ["الجامعات والكليات"], EDU_INITS, years=9,
   envs=["classroom", "office"], icon="graduation-cap")

C2("curriculum_designer", "Curriculum Designer", "مصمّم المناهج", "education",
   "high", (13000, 34000),
   "teaching:85 writing_docs:90 creativity:80 research_methods:78 "
   "arabic_language:80 project_management:72",
   "28 82 68 78 58 85", "82 90 52 76 22", HUM_SUBJ,
   ["curriculum_design", "education_secondary"],
   "Designs what gets taught and in what order, and how learning will be "
   "assessed — including building the Arabic and English versions in parallel.",
   "يصمّم ما يُدرَّس وترتيبه وطريقة تقييم التعلّم، بما يشمل بناء النسختين العربية "
   "والإنجليزية بالتوازي.",
   SCHOOL_EN, SCHOOL_AR, EDU_INITS, years=5, envs=["office"], icon="book-open")

# ---------------------------------------------------------------- social
C2("social_worker", "Social Worker", "الأخصائي الاجتماعي", "social", "very_high",
   (9000, 24000),
   "counselling:92 law_policy:70 arabic_language:85 writing_docs:75 "
   "teamwork:82 attention_detail:75",
   "28 68 38 98 55 75", "68 86 62 92 26", HUM_SUBJ,
   ["social_work", "sociology", "psychology"],
   "Supports families and individuals through crisis, and coordinates the "
   "services they need across several agencies at once.",
   "يدعم الأسر والأفراد خلال الأزمات، وينسّق الخدمات التي يحتاجونها بين عدة جهات في آنٍ واحد.",
   GOV_EN + ["community development authorities"], GOV_AR + ["هيئات تنمية المجتمع"],
   ["we_the_uae_2031", "nafis"], years=4, envs=["office", "field"], icon="heart-handshake")

C2("translator", "Translator and Interpreter", "المترجم", "social", "high",
   (10000, 30000),
   "translation_skill:98 arabic_language:95 english_language:95 writing_docs:85 "
   "attention_detail:92 research_methods:65",
   "22 78 62 68 48 88", "76 90 48 72 24",
   {"arabic": 96, "english": 96, "social": 78, "islamic": 68, "math": 55},
   ["translation"],
   "Moves meaning between Arabic and other languages in legal, medical and "
   "official settings, where a mistranslation has consequences.",
   "ينقل المعنى بين العربية وغيرها في السياقات القانونية والطبية والرسمية، حيث "
   "تترتب على الخطأ في الترجمة عواقب.",
   GOV_EN + ["translation and publishing houses"], GOV_AR + ["دور الترجمة والنشر"],
   ["culture_strategy", "we_the_uae_2031"], years=4, envs=["office", "remote"],
   icon="languages")

C2("librarian", "Librarian and Information Specialist", "أخصائي المكتبات والمعلومات",
   "social", "moderate", (9000, 22000),
   "curation_heritage:82 research_methods:85 attention_detail:90 writing_docs:75 "
   "teaching:70 arabic_language:80",
   "32 82 42 78 42 92", "72 90 45 78 24", HUM_SUBJ,
   ["library_science", "museum_studies"],
   "Organises information so it can be found again, and increasingly manages "
   "digital collections and archives rather than only shelves.",
   "ينظّم المعلومات ليمكن العثور عليها لاحقًا، ويدير على نحو متزايد المجموعات "
   "والأرشيفات الرقمية لا الرفوف وحدها.",
   ["public and university libraries", "national archives"],
   ["المكتبات العامة والجامعية", "الأرشيف الوطني"],
   ["culture_strategy", "we_the_uae_2031"], years=4, envs=["office"], icon="library")

C2("islamic_scholar", "Islamic Studies Scholar", "الباحث في الدراسات الإسلامية",
   "social", "moderate", (10000, 30000),
   "islamic_studies_skill:98 arabic_language:95 research_methods:85 "
   "writing_docs:88 public_speaking:80 teaching:78",
   "22 88 45 78 55 85", "72 90 55 78 22",
   {"arabic": 96, "islamic": 96, "social": 82, "english": 70, "math": 55},
   ["islamic_studies", "sharia_law"],
   "Studies and teaches Islamic jurisprudence and its sources, advising on "
   "religious rulings in institutional settings.",
   "يدرس الفقه الإسلامي ومصادره ويعلّمه، ويقدّم المشورة في المسائل الشرعية ضمن "
   "الأطر المؤسسية.",
   ["religious affairs authorities", "universities", "endowment institutions"],
   ["هيئات الشؤون الإسلامية", "الجامعات", "مؤسسات الأوقاف"],
   ["we_the_uae_2031", "culture_strategy"], years=6, envs=["office", "classroom"],
   icon="book-marked")
