"""Builds data/skills.json, data/careers.json and data/courses.json.

The catalogs are hand-authored below in a compact tabular form and expanded into
the fully-populated JSON files that the backend seeds from.  Re-run with:

    python data/_build_catalogs.py

Every string that reaches the UI exists in both English and Modern Standard
Arabic (الفصحى).  Salary figures are *indicative* monthly AED ranges compiled
from public UAE job-market reporting and are labelled as such in the UI.
"""
from __future__ import annotations

import json
import pathlib

HERE = pathlib.Path(__file__).resolve().parent

# --------------------------------------------------------------------------
# 1. Skill taxonomy  (40 skills) -- the shared vocabulary for gap analysis
# --------------------------------------------------------------------------
SKILLS: list[tuple[str, str, str, str]] = [
    # id, English, Arabic, family
    ("programming",            "Programming",                     "البرمجة",                        "technical"),
    ("data_analysis",          "Data Analysis",                   "تحليل البيانات",                 "technical"),
    ("machine_learning",       "Machine Learning",                "تعلّم الآلة",                    "technical"),
    ("mathematics",            "Mathematics",                     "الرياضيات",                      "analytical"),
    ("statistics",             "Statistics",                      "الإحصاء",                        "analytical"),
    ("physics_reasoning",      "Physical Reasoning",              "الاستدلال الفيزيائي",            "analytical"),
    ("chemistry_lab",          "Chemistry & Laboratory Work",     "الكيمياء والعمل المخبري",        "analytical"),
    ("life_sciences",          "Life Sciences",                   "علوم الحياة",                    "analytical"),
    ("cybersecurity",          "Cybersecurity",                   "الأمن السيبراني",                "technical"),
    ("networking",             "Computer Networking",             "شبكات الحاسوب",                  "technical"),
    ("cloud_infrastructure",   "Cloud Infrastructure",            "البنية التحتية السحابية",        "technical"),
    ("systems_design",         "Systems Design",                  "تصميم الأنظمة",                  "technical"),
    ("electronics",            "Electronics & Control",           "الإلكترونيات والتحكم",           "technical"),
    ("mechanical_design",      "Mechanical Design",               "التصميم الميكانيكي",             "technical"),
    ("civil_structures",       "Civil & Structural Engineering",  "الهندسة المدنية والإنشائية",     "technical"),
    ("energy_systems",         "Energy Systems",                  "أنظمة الطاقة",                   "technical"),
    ("sustainability",         "Sustainability & Environment",    "الاستدامة والبيئة",              "domain"),
    ("project_management",     "Project Management",              "إدارة المشاريع",                 "professional"),
    ("business_strategy",      "Business Strategy",               "استراتيجية الأعمال",             "professional"),
    ("finance_accounting",     "Finance & Accounting",            "المالية والمحاسبة",              "domain"),
    ("economics",              "Economics",                       "الاقتصاد",                       "domain"),
    ("marketing_comm",         "Marketing & Communication",       "التسويق والاتصال",               "professional"),
    ("writing_docs",           "Writing & Documentation",         "الكتابة والتوثيق",               "professional"),
    ("public_speaking",        "Public Speaking",                 "التحدّث أمام الجمهور",           "professional"),
    ("arabic_language",        "Arabic Language",                 "اللغة العربية",                  "language"),
    ("english_language",       "English Language",                "اللغة الإنجليزية",               "language"),
    ("teamwork",               "Teamwork & Collaboration",        "العمل الجماعي والتعاون",         "personal"),
    ("leadership",             "Leadership",                      "القيادة",                        "personal"),
    ("creativity",             "Creativity & Ideation",           "الإبداع وتوليد الأفكار",         "personal"),
    ("visual_design",          "Visual & UX Design",              "التصميم المرئي وتجربة المستخدم", "technical"),
    ("teaching",               "Teaching & Mentoring",            "التعليم والإرشاد",               "professional"),
    ("clinical_skills",        "Clinical Skills",                 "المهارات السريرية",              "domain"),
    ("customer_service",       "Customer & Guest Service",        "خدمة العملاء والضيوف",           "professional"),
    ("logistics_ops",          "Logistics & Operations",          "اللوجستيات والعمليات",           "domain"),
    ("law_policy",             "Law & Public Policy",             "القانون والسياسات العامة",       "domain"),
    ("research_methods",       "Research Methods",                "مناهج البحث",                    "analytical"),
    ("attention_detail",       "Attention to Detail",             "الدقّة والانتباه للتفاصيل",      "personal"),
    ("problem_solving",        "Problem Solving",                 "حل المشكلات",                    "personal"),
    ("aviation_ops",           "Aviation Operations",             "عمليات الطيران",                 "domain"),
    ("geospatial_gis",         "Geospatial & GIS",                "نظم المعلومات الجغرافية",        "technical"),
]
SKILL_IDS = {s[0] for s in SKILLS}

# --------------------------------------------------------------------------
# 2. Sectors (UAE strategic sectors)
# --------------------------------------------------------------------------
SECTORS: list[tuple[str, str, str, str]] = [
    ("ai_data",             "Artificial Intelligence & Data", "الذكاء الاصطناعي والبيانات", "#00732F"),
    ("cybersecurity",       "Cybersecurity",                  "الأمن السيبراني",            "#0B3D5C"),
    ("software",            "Software Engineering",           "هندسة البرمجيات",            "#1B7F5A"),
    ("energy",              "Energy & Sustainability",        "الطاقة والاستدامة",          "#2E7D32"),
    ("aviation",            "Aviation & Aerospace",           "الطيران والفضاء الجوي",      "#155E75"),
    ("space",               "Space Technology",               "تقنيات الفضاء",              "#3F3D8F"),
    ("healthcare",          "Healthcare",                     "الرعاية الصحية",             "#0E7490"),
    ("finance",             "Finance & Fintech",              "المالية والتقنية المالية",   "#8A6D1F"),
    ("tourism",             "Tourism & Hospitality",          "السياحة والضيافة",           "#B45309"),
    ("construction",        "Civil & Construction",           "الهندسة المدنية والإنشاءات", "#6B4E2E"),
    ("logistics",           "Logistics & Maritime",           "اللوجستيات والملاحة",        "#374151"),
    ("government",          "Government & Public Policy",     "الحكومة والسياسات العامة",   "#111827"),
    ("education",          "Education",                       "التعليم",                    "#7C2D12"),
    ("media",               "Media & Creative Industries",    "الإعلام والصناعات الإبداعية","#9D174D"),
    ("entrepreneurship",    "Entrepreneurship",               "ريادة الأعمال",              "#B91C1C"),
]

# --------------------------------------------------------------------------
# 3. National initiatives (described in our own words)
# --------------------------------------------------------------------------
INITIATIVES: list[dict] = [
    {
        "id": "centennial_2071",
        "name_en": "UAE Centennial 2071",
        "name_ar": "مئوية الإمارات 2071",
        "summary_en": "A long-horizon national plan that aims to build a knowledge-driven "
                      "economy and world-class education so that the UAE is among the best "
                      "countries in the world by its hundredth national anniversary.",
        "summary_ar": "خطة وطنية بعيدة المدى تهدف إلى بناء اقتصاد قائم على المعرفة وتعليم "
                      "عالمي المستوى، بحيث تكون الإمارات ضمن أفضل دول العالم عند حلول "
                      "الذكرى المئوية لتأسيسها.",
    },
    {
        "id": "ai_strategy_2031",
        "name_en": "UAE National Strategy for Artificial Intelligence 2031",
        "name_ar": "الاستراتيجية الوطنية للذكاء الاصطناعي 2031",
        "summary_en": "A national programme to embed artificial intelligence across government "
                      "services and priority industries, and to grow a local pool of AI talent "
                      "and research capability.",
        "summary_ar": "برنامج وطني لدمج الذكاء الاصطناعي في الخدمات الحكومية والقطاعات ذات "
                      "الأولوية، وتنمية كوادر وطنية وقدرات بحثية في هذا المجال.",
    },
    {
        "id": "nafis",
        "name_en": "Emiratisation / NAFIS",
        "name_ar": "التوطين / نافس",
        "summary_en": "A federal programme that raises the participation of Emirati citizens in "
                      "private-sector employment through training, salary support and "
                      "employer targets.",
        "summary_ar": "برنامج اتحادي يرفع مشاركة المواطنين الإماراتيين في وظائف القطاع الخاص "
                      "من خلال التدريب ودعم الرواتب واستهداف أصحاب العمل.",
    },
    {
        "id": "we_the_uae_2031",
        "name_en": "We the UAE 2031",
        "name_ar": "نحن الإمارات 2031",
        "summary_en": "A ten-year vision covering the economy, society, diplomacy and "
                      "ecosystem, with goals such as doubling the size of the national economy "
                      "and expanding non-oil trade.",
        "summary_ar": "رؤية عشرية تشمل الاقتصاد والمجتمع والدبلوماسية والمنظومة الوطنية، "
                      "وتتضمّن أهدافاً مثل مضاعفة حجم الاقتصاد الوطني وتوسيع التجارة غير النفطية.",
    },
    {
        "id": "net_zero_2050",
        "name_en": "UAE Net Zero by 2050",
        "name_ar": "الحياد المناخي 2050",
        "summary_en": "A strategic initiative to reach net-zero greenhouse-gas emissions by "
                      "2050 through investment in clean and renewable energy, efficiency and "
                      "carbon management.",
        "summary_ar": "مبادرة استراتيجية للوصول إلى صافي انبعاثات صفري من غازات الدفيئة بحلول "
                      "عام 2050 عبر الاستثمار في الطاقة النظيفة والمتجددة وكفاءة الاستهلاك "
                      "وإدارة الكربون.",
    },
    {
        "id": "space_strategy_2030",
        "name_en": "National Space Strategy 2030",
        "name_ar": "الاستراتيجية الوطنية للفضاء 2030",
        "summary_en": "A framework for growing the UAE space sector, covering satellites, "
                      "exploration missions, space services and the regulation and financing "
                      "that support them.",
        "summary_ar": "إطار عمل لتنمية قطاع الفضاء الإماراتي، ويشمل الأقمار الصناعية وبعثات "
                      "الاستكشاف وخدمات الفضاء والتشريعات والتمويل الداعمة لها.",
    },
    {
        "id": "digital_economy_strategy",
        "name_en": "UAE Digital Economy Strategy",
        "name_ar": "استراتيجية الاقتصاد الرقمي",
        "summary_en": "A plan to raise the digital economy's contribution to national GDP by "
                      "supporting digital start-ups, advanced technology adoption and "
                      "digital skills.",
        "summary_ar": "خطة لرفع مساهمة الاقتصاد الرقمي في الناتج المحلي الإجمالي عبر دعم "
                      "الشركات الرقمية الناشئة وتبنّي التقنيات المتقدمة وتنمية المهارات الرقمية.",
    },
]

# --------------------------------------------------------------------------
# 4. Careers (60) -- compact authoring helper
# --------------------------------------------------------------------------
SUBJECT_KEYS = ["math", "physics", "chemistry", "biology", "arabic",
                "english", "computer_science", "islamic", "social"]

CAREERS: list[dict] = []


def C(cid, en, ar, sector, demand, sal, desc_en, desc_ar, skills,
      riasec, bigfive, subj, degrees_en, degrees_ar, emp_en, emp_ar, inits):
    """Expand a compact career row into a full catalog record.

    skills  -- "skill_id:weight ..." with weight 0-100 (importance of the skill)
    riasec  -- "R I A S E C"  ideal profile, 0-100
    bigfive -- "O C E A N"    ideal profile, 0-100
    subj    -- dict of subject -> 0-100 (unlisted subjects default to 55)
    """
    sk = {}
    for token in skills.split():
        name, _, weight = token.partition(":")
        assert name in SKILL_IDS, f"unknown skill {name!r} in {cid}"
        sk[name] = int(weight)
    r = [int(x) for x in riasec.split()]
    b = [int(x) for x in bigfive.split()]
    assert len(r) == 6 and len(b) == 5, cid
    subjects = {k: 55 for k in SUBJECT_KEYS}
    subjects.update(subj)
    CAREERS.append({
        "id": cid,
        "title_en": en,
        "title_ar": ar,
        "sector": sector,
        "demand": demand,                       # very_high | high | moderate
        "salary_aed": {"min": sal[0], "max": sal[1], "period": "month",
                       "note_en": "Indicative monthly range in AED; varies by employer and experience.",
                       "note_ar": "نطاق شهري إرشادي بالدرهم الإماراتي؛ يختلف حسب جهة العمل والخبرة."},
        "description_en": desc_en,
        "description_ar": desc_ar,
        "skills": sk,
        "profile": {
            "riasec": dict(zip(["R", "I", "A", "S", "E", "C"], r)),
            "bigfive": dict(zip(["O", "C", "E", "A", "N"], b)),
            "subjects": subjects,
        },
        "degrees_en": degrees_en,
        "degrees_ar": degrees_ar,
        "employers_en": emp_en,
        "employers_ar": emp_ar,
        "initiatives": inits,
    })


# ---- Artificial Intelligence & Data ---------------------------------------
C("machine_learning_engineer", "Machine Learning Engineer", "مهندس تعلّم الآلة",
  "ai_data", "very_high", (18000, 38000),
  "Designs, trains and deploys machine-learning models that turn data into working products, "
  "from recommendation systems to Arabic language models, and keeps them reliable in production.",
  "يصمّم نماذج تعلّم الآلة ويدرّبها وينشرها لتحويل البيانات إلى منتجات عاملة، من أنظمة "
  "التوصية إلى النماذج اللغوية العربية، ويحافظ على موثوقيتها في بيئة التشغيل.",
  "machine_learning:95 programming:90 mathematics:85 statistics:85 data_analysis:80 cloud_infrastructure:60 problem_solving:80 english_language:70",
  "35 95 40 30 45 70", "85 80 40 50 25",
  {"math": 92, "physics": 75, "computer_science": 95, "english": 80},
  ["Computer Science", "Artificial Intelligence", "Data Science", "Applied Mathematics"],
  ["علوم الحاسوب", "الذكاء الاصطناعي", "علم البيانات", "الرياضيات التطبيقية"],
  ["national AI research institutes", "federal digital-government entities", "Abu Dhabi and Dubai technology firms"],
  ["معاهد البحث الوطنية في الذكاء الاصطناعي", "جهات الحكومة الرقمية الاتحادية", "شركات التقنية في أبوظبي ودبي"],
  ["ai_strategy_2031", "centennial_2071", "digital_economy_strategy"])

C("data_scientist", "Data Scientist", "عالم بيانات",
  "ai_data", "very_high", (16000, 34000),
  "Answers business and policy questions with statistics and modelling: frames the question, "
  "cleans the data, builds the model and explains the result to decision-makers.",
  "يجيب عن أسئلة الأعمال والسياسات باستخدام الإحصاء والنمذجة: يصوغ السؤال، وينظّف البيانات، "
  "ويبني النموذج، ثم يشرح النتيجة لصنّاع القرار.",
  "statistics:95 data_analysis:95 programming:80 machine_learning:75 mathematics:80 writing_docs:65 problem_solving:80",
  "25 95 40 40 50 70", "80 80 45 55 30",
  {"math": 90, "computer_science": 85, "english": 78, "social": 65},
  ["Data Science", "Statistics", "Computer Science", "Economics"],
  ["علم البيانات", "الإحصاء", "علوم الحاسوب", "الاقتصاد"],
  ["national statistics and analytics centres", "banking groups", "healthcare networks"],
  ["المراكز الوطنية للإحصاء والتحليل", "المجموعات المصرفية", "شبكات الرعاية الصحية"],
  ["ai_strategy_2031", "digital_economy_strategy"])

C("data_engineer", "Data Engineer", "مهندس بيانات",
  "ai_data", "very_high", (15000, 30000),
  "Builds the pipelines and storage that make data usable: ingestion, transformation, quality "
  "checks and the platforms that analysts and ML teams depend on every day.",
  "يبني خطوط نقل البيانات وأنظمة تخزينها لتصبح قابلة للاستخدام: الاستقبال والتحويل وفحوص "
  "الجودة والمنصّات التي يعتمد عليها المحللون وفرق تعلّم الآلة يومياً.",
  "programming:90 cloud_infrastructure:85 data_analysis:75 systems_design:80 attention_detail:80 problem_solving:75",
  "45 85 25 30 40 85", "70 88 35 50 30",
  {"math": 80, "computer_science": 92, "english": 75},
  ["Computer Engineering", "Computer Science", "Information Systems"],
  ["هندسة الحاسوب", "علوم الحاسوب", "نظم المعلومات"],
  ["telecom operators", "federal ministries", "logistics and retail groups"],
  ["شركات الاتصالات", "الوزارات الاتحادية", "مجموعات الخدمات اللوجستية والتجزئة"],
  ["ai_strategy_2031", "digital_economy_strategy"])

C("ai_ethics_policy_analyst", "AI Policy & Ethics Analyst", "محلل سياسات وأخلاقيات الذكاء الاصطناعي",
  "ai_data", "high", (14000, 28000),
  "Studies how AI systems affect people and writes the rules that govern them: risk assessment, "
  "fairness review, and guidance that regulators and organisations can actually apply.",
  "يدرس أثر أنظمة الذكاء الاصطناعي في الناس ويضع القواعد الحاكمة لها: تقييم المخاطر، "
  "ومراجعة العدالة، وإرشادات قابلة للتطبيق لدى الجهات التنظيمية والمؤسسات.",
  "law_policy:90 research_methods:85 writing_docs:85 machine_learning:55 public_speaking:70 english_language:80 arabic_language:75",
  "15 80 45 65 65 70", "85 78 60 65 35",
  {"math": 70, "english": 85, "arabic": 82, "social": 85, "computer_science": 70},
  ["Public Policy", "Law", "Philosophy & Technology", "Computer Science"],
  ["السياسات العامة", "القانون", "الفلسفة والتقنية", "علوم الحاسوب"],
  ["federal regulatory authorities", "policy research centres", "large technology employers"],
  ["الهيئات التنظيمية الاتحادية", "مراكز أبحاث السياسات", "كبرى جهات التوظيف التقنية"],
  ["ai_strategy_2031", "we_the_uae_2031", "centennial_2071"])

# ---- Cybersecurity ---------------------------------------------------------
C("security_analyst", "Cybersecurity Analyst", "محلل أمن سيبراني",
  "cybersecurity", "very_high", (14000, 28000),
  "Monitors networks and systems for attacks, investigates alerts, and responds to incidents "
  "before they become breaches in banks, utilities and government platforms.",
  "يراقب الشبكات والأنظمة بحثاً عن الهجمات، ويحقّق في التنبيهات، ويستجيب للحوادث قبل أن "
  "تتحوّل إلى اختراقات في المصارف والمرافق والمنصّات الحكومية.",
  "cybersecurity:95 networking:85 attention_detail:90 programming:65 problem_solving:80 writing_docs:60",
  "50 88 20 35 40 90", "70 90 35 50 35",
  {"math": 78, "computer_science": 92, "english": 78},
  ["Cybersecurity", "Computer Science", "Network Engineering"],
  ["الأمن السيبراني", "علوم الحاسوب", "هندسة الشبكات"],
  ["national cybersecurity bodies", "banking groups", "critical-infrastructure operators"],
  ["الجهات الوطنية للأمن السيبراني", "المجموعات المصرفية", "مشغّلو البنية التحتية الحيوية"],
  ["ai_strategy_2031", "digital_economy_strategy", "we_the_uae_2031"])

C("penetration_tester", "Penetration Tester", "مختبِر اختراق",
  "cybersecurity", "high", (15000, 30000),
  "Attacks systems with permission in order to defend them: finds weaknesses in applications "
  "and networks, proves the impact, and writes the report that gets them fixed.",
  "يهاجم الأنظمة بتفويض رسمي بهدف حمايتها: يكتشف نقاط الضعف في التطبيقات والشبكات، "
  "ويثبت أثرها، ويكتب التقرير الذي يؤدي إلى معالجتها.",
  "cybersecurity:95 programming:80 networking:85 problem_solving:90 creativity:70 writing_docs:70",
  "55 90 45 25 45 65", "82 78 40 40 35",
  {"math": 78, "computer_science": 95, "english": 80},
  ["Cybersecurity", "Computer Science", "Information Security"],
  ["الأمن السيبراني", "علوم الحاسوب", "أمن المعلومات"],
  ["security consultancies", "national defence-technology entities", "financial institutions"],
  ["الشركات الاستشارية الأمنية", "الجهات الوطنية لتقنيات الدفاع", "المؤسسات المالية"],
  ["ai_strategy_2031", "digital_economy_strategy"])

C("security_architect", "Security Architect", "مهندس معماري للأمن",
  "cybersecurity", "high", (22000, 45000),
  "Designs how an organisation's whole technology estate stays secure — identity, networks, "
  "cloud and data — and sets the standards that engineering teams build against.",
  "يصمّم منظومة الحماية لكامل البنية التقنية للمؤسسة — الهوية والشبكات والسحابة والبيانات — "
  "ويضع المعايير التي تبني عليها الفرق الهندسية.",
  "cybersecurity:90 systems_design:90 cloud_infrastructure:80 networking:75 leadership:70 writing_docs:70",
  "40 88 30 40 60 85", "78 88 50 50 30",
  {"math": 80, "computer_science": 92, "english": 82},
  ["Cybersecurity", "Computer Engineering", "Information Systems"],
  ["الأمن السيبراني", "هندسة الحاسوب", "نظم المعلومات"],
  ["federal digital-government entities", "energy companies", "telecom operators"],
  ["جهات الحكومة الرقمية الاتحادية", "شركات الطاقة", "شركات الاتصالات"],
  ["ai_strategy_2031", "centennial_2071"])

C("digital_forensics_investigator", "Digital Forensics Investigator", "محقّق أدلة رقمية",
  "cybersecurity", "moderate", (13000, 26000),
  "Recovers and analyses digital evidence after an incident or a crime, reconstructs what "
  "happened, and presents findings that stand up in a legal process.",
  "يستعيد الأدلة الرقمية ويحلّلها بعد وقوع حادثة أو جريمة، ويعيد بناء تسلسل الأحداث، "
  "ويقدّم نتائج تصمد أمام الإجراءات القانونية.",
  "cybersecurity:85 attention_detail:95 law_policy:70 programming:60 writing_docs:80 research_methods:75",
  "45 85 20 40 30 92", "68 92 35 50 35",
  {"math": 72, "computer_science": 88, "english": 78, "social": 65},
  ["Digital Forensics", "Cybersecurity", "Criminal Justice & Technology"],
  ["الأدلة الجنائية الرقمية", "الأمن السيبراني", "العدالة الجنائية والتقنية"],
  ["police and interior-ministry technical units", "audit and consulting firms", "banks"],
  ["الوحدات الفنية في الشرطة ووزارة الداخلية", "شركات التدقيق والاستشارات", "المصارف"],
  ["we_the_uae_2031", "digital_economy_strategy"])

# ---- Software Engineering --------------------------------------------------
C("software_engineer", "Software Engineer", "مهندس برمجيات",
  "software", "very_high", (14000, 32000),
  "Builds and maintains the applications and services people use every day, from government "
  "portals to banking apps, and is responsible for their correctness and performance.",
  "يبني التطبيقات والخدمات التي يستخدمها الناس يومياً ويصونها، من البوّابات الحكومية إلى "
  "تطبيقات المصارف، ويتحمّل مسؤولية صحّتها وأدائها.",
  "programming:95 systems_design:80 problem_solving:85 teamwork:70 english_language:70 attention_detail:75",
  "45 88 40 35 45 75", "75 82 45 55 30",
  {"math": 85, "computer_science": 95, "english": 78},
  ["Computer Science", "Software Engineering", "Computer Engineering"],
  ["علوم الحاسوب", "هندسة البرمجيات", "هندسة الحاسوب"],
  ["technology companies in Dubai Internet City", "federal digital-government entities", "banking groups"],
  ["شركات التقنية في مدينة دبي للإنترنت", "جهات الحكومة الرقمية الاتحادية", "المجموعات المصرفية"],
  ["digital_economy_strategy", "centennial_2071"])

C("cloud_devops_engineer", "Cloud & DevOps Engineer", "مهندس سحابة وعمليات تطوير",
  "software", "very_high", (16000, 34000),
  "Runs the infrastructure that software lives on: automates deployment, keeps systems "
  "available and scalable, and shortens the path from code to production.",
  "يدير البنية التي تعمل عليها البرمجيات: يؤتمت النشر، ويحافظ على جاهزية الأنظمة وقابليتها "
  "للتوسّع، ويختصر المسافة بين كتابة الشيفرة وتشغيلها.",
  "cloud_infrastructure:95 programming:80 networking:75 systems_design:80 problem_solving:80 attention_detail:75",
  "55 85 25 35 45 85", "72 88 40 50 30",
  {"math": 80, "computer_science": 92, "english": 78},
  ["Computer Engineering", "Computer Science", "Information Technology"],
  ["هندسة الحاسوب", "علوم الحاسوب", "تقنية المعلومات"],
  ["cloud service providers", "telecom operators", "national digital platforms"],
  ["مزوّدو الخدمات السحابية", "شركات الاتصالات", "المنصّات الرقمية الوطنية"],
  ["digital_economy_strategy", "ai_strategy_2031"])

C("mobile_app_developer", "Mobile Application Developer", "مطوّر تطبيقات الهواتف",
  "software", "high", (12000, 26000),
  "Designs and ships mobile applications for iOS and Android, working closely with designers "
  "to make bilingual, right-to-left-aware experiences that feel native.",
  "يصمّم تطبيقات الهواتف لنظامَي iOS وأندرويد ويطلقها، بالتعاون الوثيق مع المصمّمين لإنتاج "
  "تجارب ثنائية اللغة تدعم الاتجاه من اليمين إلى اليسار وتبدو أصيلة.",
  "programming:90 visual_design:65 problem_solving:75 teamwork:70 creativity:60 attention_detail:75",
  "40 78 60 40 45 70", "78 80 50 58 32",
  {"math": 78, "computer_science": 92, "english": 75},
  ["Computer Science", "Software Engineering", "Interactive Media"],
  ["علوم الحاسوب", "هندسة البرمجيات", "الوسائط التفاعلية"],
  ["digital product studios", "retail and delivery platforms", "government service apps"],
  ["استوديوهات المنتجات الرقمية", "منصّات التجزئة والتوصيل", "تطبيقات الخدمات الحكومية"],
  ["digital_economy_strategy"])

C("qa_automation_engineer", "QA Automation Engineer", "مهندس ضمان جودة وأتمتة اختبارات",
  "software", "high", (11000, 22000),
  "Protects quality by designing test strategies and automated suites that catch defects "
  "before users do, and by measuring reliability release after release.",
  "يحمي الجودة عبر تصميم استراتيجيات الاختبار والمجموعات الآلية التي تكتشف العيوب قبل "
  "المستخدمين، وقياس الموثوقية إصداراً بعد إصدار.",
  "programming:80 attention_detail:95 problem_solving:75 writing_docs:70 systems_design:60 teamwork:70",
  "45 80 20 40 35 92", "65 92 40 58 30",
  {"math": 75, "computer_science": 88, "english": 75},
  ["Software Engineering", "Computer Science", "Information Technology"],
  ["هندسة البرمجيات", "علوم الحاسوب", "تقنية المعلومات"],
  ["software houses", "banking technology teams", "aviation IT departments"],
  ["شركات البرمجيات", "فرق التقنية في المصارف", "إدارات تقنية المعلومات في قطاع الطيران"],
  ["digital_economy_strategy"])

# ---- Energy & Sustainability ----------------------------------------------
C("renewable_energy_engineer", "Renewable Energy Engineer", "مهندس طاقة متجددة",
  "energy", "very_high", (15000, 32000),
  "Plans and engineers solar and other clean-energy projects, from yield modelling and grid "
  "connection to commissioning large plants in the desert climate.",
  "يخطّط لمشاريع الطاقة الشمسية والطاقة النظيفة ويهندسها، من نمذجة الإنتاجية والربط "
  "بالشبكة إلى تشغيل المحطات الكبيرة في المناخ الصحراوي.",
  "energy_systems:95 physics_reasoning:85 mathematics:80 sustainability:85 project_management:70 problem_solving:75",
  "80 88 25 40 45 70", "75 85 40 55 30",
  {"math": 88, "physics": 92, "chemistry": 72, "computer_science": 70},
  ["Electrical Engineering", "Renewable Energy Engineering", "Mechanical Engineering"],
  ["الهندسة الكهربائية", "هندسة الطاقة المتجددة", "الهندسة الميكانيكية"],
  ["national renewable-energy developers", "utility authorities", "engineering consultancies"],
  ["مطوّرو الطاقة المتجددة الوطنيون", "هيئات المرافق", "الشركات الاستشارية الهندسية"],
  ["net_zero_2050", "centennial_2071", "we_the_uae_2031"])

C("petroleum_engineer", "Petroleum Engineer", "مهندس بترول",
  "energy", "high", (20000, 45000),
  "Works on how oil and gas are extracted safely and efficiently — reservoir behaviour, well "
  "design and production optimisation — increasingly alongside emissions-reduction targets.",
  "يعمل على استخراج النفط والغاز بأمان وكفاءة — سلوك المكامن وتصميم الآبار وتحسين الإنتاج — "
  "بالتوازي المتزايد مع أهداف خفض الانبعاثات.",
  "physics_reasoning:90 mathematics:88 chemistry_lab:70 energy_systems:85 problem_solving:80 project_management:65",
  "85 88 20 30 50 75", "68 88 45 50 28",
  {"math": 92, "physics": 92, "chemistry": 82},
  ["Petroleum Engineering", "Chemical Engineering", "Mechanical Engineering"],
  ["هندسة البترول", "الهندسة الكيميائية", "الهندسة الميكانيكية"],
  ["national energy companies", "oilfield service providers", "engineering contractors"],
  ["شركات الطاقة الوطنية", "مزوّدو خدمات حقول النفط", "مقاولو الأعمال الهندسية"],
  ["we_the_uae_2031", "net_zero_2050"])

C("nuclear_engineer", "Nuclear Engineer", "مهندس نووي",
  "energy", "moderate", (20000, 42000),
  "Supports the safe operation of peaceful nuclear power: reactor systems, radiation "
  "protection, fuel handling and the strict safety culture the sector requires.",
  "يدعم التشغيل الآمن للطاقة النووية السلمية: أنظمة المفاعل، والوقاية من الإشعاع، "
  "ومناولة الوقود، وثقافة السلامة الصارمة التي يتطلبها القطاع.",
  "physics_reasoning:95 mathematics:90 energy_systems:85 attention_detail:95 problem_solving:80 chemistry_lab:65",
  "78 95 15 35 40 88", "70 95 35 55 25",
  {"math": 95, "physics": 96, "chemistry": 80},
  ["Nuclear Engineering", "Mechanical Engineering", "Physics"],
  ["الهندسة النووية", "الهندسة الميكانيكية", "الفيزياء"],
  ["the national nuclear energy corporation", "regulatory authorities", "specialised contractors"],
  ["المؤسسة الوطنية للطاقة النووية", "الهيئات الرقابية", "المقاولون المتخصصون"],
  ["net_zero_2050", "centennial_2071"])

C("sustainability_consultant", "Sustainability Consultant", "استشاري استدامة",
  "energy", "high", (13000, 28000),
  "Helps organisations measure and reduce their environmental footprint: carbon accounting, "
  "green-building certification, reporting and practical decarbonisation roadmaps.",
  "يساعد المؤسسات على قياس أثرها البيئي وخفضه: حساب البصمة الكربونية، وشهادات الأبنية "
  "الخضراء، وإعداد التقارير، وخرائط طريق عملية لخفض الكربون.",
  "sustainability:95 data_analysis:75 writing_docs:80 business_strategy:70 public_speaking:70 research_methods:70",
  "45 80 40 65 65 70", "82 82 60 65 32",
  {"math": 75, "chemistry": 75, "biology": 72, "english": 82, "social": 78},
  ["Environmental Science", "Environmental Engineering", "Sustainability Management"],
  ["العلوم البيئية", "الهندسة البيئية", "إدارة الاستدامة"],
  ["environment authorities", "property developers", "consulting firms"],
  ["هيئات البيئة", "شركات التطوير العقاري", "الشركات الاستشارية"],
  ["net_zero_2050", "we_the_uae_2031"])

# ---- Aviation & Aerospace --------------------------------------------------
C("commercial_pilot", "Commercial Pilot", "طيّار تجاري",
  "aviation", "high", (25000, 60000),
  "Flies passengers and cargo on scheduled routes, applying strict procedures, weather and "
  "navigation judgement, and crew coordination on every sector.",
  "يقود الرحلات المجدولة لنقل الركاب والبضائع، مطبّقاً إجراءات صارمة وحسن تقدير للأحوال "
  "الجوية والملاحة، والتنسيق مع الطاقم في كل رحلة.",
  "aviation_ops:95 physics_reasoning:75 attention_detail:95 teamwork:85 english_language:90 problem_solving:80",
  "88 75 20 55 55 90", "62 95 60 60 20",
  {"math": 85, "physics": 88, "english": 90},
  ["Aviation / Professional Pilot Programme", "Aeronautical Engineering", "Aviation Management"],
  ["برامج الطيران المهني", "هندسة الطيران", "إدارة الطيران"],
  ["national carriers", "cargo airlines", "business-aviation operators"],
  ["الناقلات الوطنية", "شركات الشحن الجوي", "مشغّلو طيران رجال الأعمال"],
  ["we_the_uae_2031", "centennial_2071"])

C("aeronautical_engineer", "Aeronautical Engineer", "مهندس طيران",
  "aviation", "high", (16000, 34000),
  "Designs, tests and certifies aircraft structures and systems, and supports airworthiness "
  "through analysis, maintenance engineering and continuous improvement.",
  "يصمّم هياكل الطائرات وأنظمتها ويختبرها ويعتمدها، ويدعم صلاحية الطيران عبر التحليل "
  "وهندسة الصيانة والتحسين المستمر.",
  "mechanical_design:90 physics_reasoning:92 mathematics:88 systems_design:75 attention_detail:85 problem_solving:80",
  "85 92 30 30 40 82", "75 90 35 50 28",
  {"math": 93, "physics": 95, "computer_science": 72},
  ["Aerospace Engineering", "Mechanical Engineering", "Aeronautical Engineering"],
  ["هندسة الفضاء الجوي", "الهندسة الميكانيكية", "هندسة الطيران"],
  ["aircraft maintenance organisations", "national carriers", "defence-industry manufacturers"],
  ["مؤسسات صيانة الطائرات", "الناقلات الوطنية", "مصنّعو الصناعات الدفاعية"],
  ["centennial_2071", "we_the_uae_2031"])

C("air_traffic_controller", "Air Traffic Controller", "مراقب حركة جوية",
  "aviation", "moderate", (18000, 38000),
  "Keeps aircraft safely separated in some of the world's busiest airspace, issuing clearances "
  "under time pressure with total procedural discipline.",
  "يحافظ على الفصل الآمن بين الطائرات في واحد من أكثر الأجواء ازدحاماً في العالم، ويصدر "
  "التصاريح تحت ضغط الوقت بانضباط إجرائي كامل.",
  "aviation_ops:95 attention_detail:98 problem_solving:85 english_language:88 teamwork:80 public_speaking:60",
  "70 80 15 55 50 95", "58 95 55 58 18",
  {"math": 82, "physics": 80, "english": 88},
  ["Air Traffic Management", "Aviation Studies", "Aeronautical Engineering"],
  ["إدارة الحركة الجوية", "دراسات الطيران", "هندسة الطيران"],
  ["the national air-navigation authority", "airport operators", "military aviation units"],
  ["الهيئة الوطنية للملاحة الجوية", "مشغّلو المطارات", "وحدات الطيران العسكري"],
  ["we_the_uae_2031"])

C("avionics_technician", "Avionics Engineer / Technician", "مهندس أو فني إلكترونيات طيران",
  "aviation", "high", (10000, 24000),
  "Installs, tests and repairs the electronic systems that fly and navigate an aircraft — "
  "instruments, communications, radar and autopilot.",
  "يركّب الأنظمة الإلكترونية التي تقود الطائرة وتوجّهها ويختبرها ويصلحها — الأجهزة "
  "والاتصالات والرادار والطيار الآلي.",
  "electronics:95 attention_detail:92 aviation_ops:70 problem_solving:78 english_language:70 networking:55",
  "92 78 20 35 30 88", "62 92 35 55 25",
  {"math": 82, "physics": 88, "computer_science": 75},
  ["Avionics Engineering", "Electrical Engineering", "Aircraft Maintenance Technology"],
  ["هندسة إلكترونيات الطيران", "الهندسة الكهربائية", "تقنية صيانة الطائرات"],
  ["aircraft maintenance organisations", "national carriers", "defence contractors"],
  ["مؤسسات صيانة الطائرات", "الناقلات الوطنية", "شركات التعاقد الدفاعي"],
  ["centennial_2071"])

# ---- Space Technology ------------------------------------------------------
C("satellite_systems_engineer", "Satellite Systems Engineer", "مهندس أنظمة أقمار صناعية",
  "space", "high", (18000, 38000),
  "Designs and integrates the subsystems of a satellite — power, thermal, communications and "
  "attitude control — and verifies that they survive launch and orbit.",
  "يصمّم أنظمة القمر الصناعي الفرعية ويدمجها — الطاقة والحرارة والاتصالات والتحكّم في "
  "الاتجاه — ويتحقق من قدرتها على تحمّل الإطلاق والمدار.",
  "systems_design:92 physics_reasoning:92 electronics:85 mathematics:88 attention_detail:88 problem_solving:82",
  "80 95 30 30 40 85", "82 92 35 52 25",
  {"math": 94, "physics": 96, "computer_science": 82},
  ["Aerospace Engineering", "Electrical Engineering", "Physics"],
  ["هندسة الفضاء الجوي", "الهندسة الكهربائية", "الفيزياء"],
  ["the national space agency", "satellite manufacturers", "advanced-technology research centres"],
  ["وكالة الفضاء الوطنية", "مصنّعو الأقمار الصناعية", "مراكز أبحاث التقنيات المتقدمة"],
  ["space_strategy_2030", "centennial_2071"])

C("space_mission_analyst", "Space Mission Analyst", "محلل بعثات فضائية",
  "space", "moderate", (16000, 32000),
  "Plans orbits, trajectories and mission timelines, and analyses the data a mission returns "
  "so that scientific and operational goals are actually met.",
  "يخطّط المدارات والمسارات والجداول الزمنية للبعثات، ويحلّل البيانات العائدة منها لضمان "
  "تحقيق الأهداف العلمية والتشغيلية فعلياً.",
  "mathematics:95 physics_reasoning:92 programming:80 data_analysis:85 research_methods:80 attention_detail:85",
  "55 96 30 30 35 82", "88 90 30 50 25",
  {"math": 96, "physics": 95, "computer_science": 85},
  ["Astrophysics", "Aerospace Engineering", "Applied Mathematics"],
  ["الفيزياء الفلكية", "هندسة الفضاء الجوي", "الرياضيات التطبيقية"],
  ["the national space agency", "university research groups", "space-services companies"],
  ["وكالة الفضاء الوطنية", "المجموعات البحثية الجامعية", "شركات خدمات الفضاء"],
  ["space_strategy_2030", "ai_strategy_2031"])

C("remote_sensing_specialist", "Remote Sensing & GIS Specialist", "أخصائي استشعار عن بُعد ونظم معلومات جغرافية",
  "space", "high", (12000, 26000),
  "Turns satellite and drone imagery into decisions: mapping urban growth, monitoring "
  "vegetation and coastlines, and supporting planning with spatial analysis.",
  "يحوّل صور الأقمار الصناعية والطائرات المسيّرة إلى قرارات: رسم خرائط النمو العمراني، "
  "ومراقبة الغطاء النباتي والسواحل، ودعم التخطيط بالتحليل المكاني.",
  "geospatial_gis:95 data_analysis:85 programming:65 sustainability:65 research_methods:70 attention_detail:80",
  "65 88 40 40 35 80", "80 85 35 55 30",
  {"math": 85, "physics": 80, "computer_science": 82, "social": 70},
  ["Geomatics / GIS", "Environmental Science", "Civil Engineering"],
  ["الجيوماتكس ونظم المعلومات الجغرافية", "العلوم البيئية", "الهندسة المدنية"],
  ["municipalities and urban-planning departments", "the national space agency", "environment authorities"],
  ["البلديات ودوائر التخطيط العمراني", "وكالة الفضاء الوطنية", "هيئات البيئة"],
  ["space_strategy_2030", "net_zero_2050", "we_the_uae_2031"])

C("space_robotics_engineer", "Space Robotics Engineer", "مهندس روبوتات فضائية",
  "space", "moderate", (18000, 36000),
  "Builds robotic arms, rovers and autonomous systems that operate where humans cannot, and "
  "makes them reliable under extreme temperature, dust and radiation.",
  "يبني الأذرع الروبوتية والمركبات الجوّالة والأنظمة ذاتية التشغيل التي تعمل حيث لا يستطيع "
  "الإنسان، ويجعلها موثوقة في درجات حرارة وغبار وإشعاع قاسية.",
  "mechanical_design:88 electronics:90 programming:88 machine_learning:70 physics_reasoning:88 problem_solving:85",
  "92 92 40 25 35 78", "88 88 30 48 25",
  {"math": 92, "physics": 94, "computer_science": 90},
  ["Robotics Engineering", "Mechatronics", "Aerospace Engineering"],
  ["هندسة الروبوتات", "الميكاترونكس", "هندسة الفضاء الجوي"],
  ["advanced-technology research institutes", "the national space agency", "robotics start-ups"],
  ["معاهد أبحاث التقنيات المتقدمة", "وكالة الفضاء الوطنية", "الشركات الناشئة في الروبوتات"],
  ["space_strategy_2030", "ai_strategy_2031"])

# ---- Healthcare ------------------------------------------------------------
C("physician", "Physician (General Medicine)", "طبيب (الطب العام)",
  "healthcare", "very_high", (25000, 60000),
  "Diagnoses and treats patients, coordinates their care across specialities, and combines "
  "scientific reasoning with the communication skill that patients rely on.",
  "يشخّص المرضى ويعالجهم، وينسّق رعايتهم بين التخصصات، ويجمع بين الاستدلال العلمي "
  "ومهارة التواصل التي يعتمد عليها المريض.",
  "life_sciences:95 clinical_skills:95 chemistry_lab:75 attention_detail:90 teamwork:80 public_speaking:65 arabic_language:70",
  "50 95 25 90 45 80", "72 92 55 82 25",
  {"biology": 96, "chemistry": 92, "math": 80, "english": 85, "arabic": 78},
  ["Medicine (MBBS/MD)", "Biomedical Sciences (pre-medicine)"],
  ["الطب البشري", "العلوم الطبية الحيوية (تمهيدي للطب)"],
  ["public hospital groups", "private healthcare networks", "university teaching hospitals"],
  ["مجموعات المستشفيات الحكومية", "شبكات الرعاية الصحية الخاصة", "المستشفيات الجامعية التعليمية"],
  ["we_the_uae_2031", "centennial_2071"])

C("registered_nurse", "Registered Nurse", "ممرّض مسجّل",
  "healthcare", "very_high", (10000, 22000),
  "Delivers and coordinates day-to-day patient care, monitors condition changes, and is often "
  "the professional a patient and family speak with most.",
  "يقدّم الرعاية اليومية للمرضى وينسّقها، ويراقب تغيّر حالاتهم، وغالباً ما يكون الشخص "
  "الذي يتواصل معه المريض وأسرته أكثر من غيره.",
  "clinical_skills:95 teamwork:90 attention_detail:90 life_sciences:80 customer_service:75 arabic_language:70",
  "60 78 25 95 35 82", "62 90 62 90 30",
  {"biology": 90, "chemistry": 80, "arabic": 75, "english": 80, "social": 75},
  ["Nursing (BSN)", "Health Sciences"],
  ["التمريض", "العلوم الصحية"],
  ["public hospital groups", "primary healthcare centres", "home-care providers"],
  ["مجموعات المستشفيات الحكومية", "مراكز الرعاية الصحية الأولية", "مزوّدو الرعاية المنزلية"],
  ["we_the_uae_2031", "nafis"])

C("pharmacist", "Pharmacist", "صيدلاني",
  "healthcare", "high", (12000, 26000),
  "Dispenses and reviews medication, checks for interactions and dosing errors, and advises "
  "patients and clinicians on safe and effective drug therapy.",
  "يصرف الأدوية ويراجعها، ويتحقق من التداخلات وأخطاء الجرعات، ويقدّم المشورة للمرضى "
  "والأطباء بشأن العلاج الدوائي الآمن والفعّال.",
  "chemistry_lab:92 life_sciences:88 attention_detail:95 clinical_skills:75 customer_service:70 research_methods:60",
  "55 90 20 75 40 92", "68 93 45 78 28",
  {"chemistry": 95, "biology": 90, "math": 78, "english": 82},
  ["Pharmacy (PharmD/BPharm)", "Pharmaceutical Sciences"],
  ["الصيدلة", "العلوم الصيدلانية"],
  ["hospital pharmacies", "retail pharmacy chains", "pharmaceutical distributors"],
  ["صيدليات المستشفيات", "سلاسل الصيدليات", "شركات توزيع الأدوية"],
  ["we_the_uae_2031"])

C("health_informatics_specialist", "Health Informatics Specialist", "أخصائي معلوماتية صحية",
  "healthcare", "high", (14000, 30000),
  "Sits between clinicians and technology: designs electronic health records, protects patient "
  "data, and turns hospital data into measurable improvements in care.",
  "يعمل بين الأطباء والتقنية: يصمّم السجلات الصحية الإلكترونية، ويحمي بيانات المرضى، "
  "ويحوّل بيانات المستشفى إلى تحسينات قابلة للقياس في الرعاية.",
  "data_analysis:88 programming:70 life_sciences:70 systems_design:75 cybersecurity:60 writing_docs:70 clinical_skills:50",
  "35 88 30 70 50 85", "78 88 45 68 30",
  {"biology": 82, "computer_science": 88, "math": 82, "english": 80},
  ["Health Informatics", "Computer Science", "Public Health"],
  ["المعلوماتية الصحية", "علوم الحاسوب", "الصحة العامة"],
  ["health authorities", "hospital IT departments", "digital-health companies"],
  ["الهيئات الصحية", "إدارات تقنية المعلومات في المستشفيات", "شركات الصحة الرقمية"],
  ["ai_strategy_2031", "digital_economy_strategy"])

# ---- Finance & Fintech -----------------------------------------------------
C("financial_analyst", "Financial Analyst", "محلل مالي",
  "finance", "high", (13000, 28000),
  "Evaluates investments and company performance through financial modelling, valuation and "
  "reporting, and makes a clear recommendation from an unclear set of numbers.",
  "يقيّم الاستثمارات وأداء الشركات عبر النمذجة المالية والتقييم وإعداد التقارير، "
  "ويصوغ توصية واضحة انطلاقاً من أرقام غير واضحة.",
  "finance_accounting:95 data_analysis:85 economics:80 mathematics:80 writing_docs:70 attention_detail:85",
  "20 88 20 40 75 92", "68 90 55 50 30",
  {"math": 90, "english": 82, "social": 72},
  ["Finance", "Accounting", "Economics", "Business Administration"],
  ["المالية", "المحاسبة", "الاقتصاد", "إدارة الأعمال"],
  ["banking groups", "sovereign investment entities", "audit and advisory firms"],
  ["المجموعات المصرفية", "الجهات الاستثمارية السيادية", "شركات التدقيق والاستشارات"],
  ["we_the_uae_2031", "nafis"])

C("fintech_product_manager", "Fintech Product Manager", "مدير منتجات التقنية المالية",
  "finance", "high", (18000, 40000),
  "Owns a digital financial product end to end — payments, lending or wealth — balancing user "
  "needs, regulation and engineering effort to decide what ships next.",
  "يتولّى منتجاً مالياً رقمياً من طرف إلى طرف — المدفوعات أو الإقراض أو إدارة الثروات — "
  "موازناً بين احتياجات المستخدمين والتشريعات وجهد التطوير لتحديد ما يُطلق تالياً.",
  "business_strategy:90 finance_accounting:75 marketing_comm:75 project_management:85 leadership:75 data_analysis:70",
  "20 78 45 55 92 75", "80 85 75 55 30",
  {"math": 85, "english": 85, "social": 78, "computer_science": 75},
  ["Business Administration", "Finance", "Information Systems"],
  ["إدارة الأعمال", "المالية", "نظم المعلومات"],
  ["Abu Dhabi and Dubai fintech firms", "digital banks", "payment providers"],
  ["شركات التقنية المالية في أبوظبي ودبي", "المصارف الرقمية", "مزوّدو خدمات الدفع"],
  ["digital_economy_strategy", "we_the_uae_2031"])

C("actuary", "Actuary", "خبير اكتواري",
  "finance", "moderate", (18000, 40000),
  "Prices risk with mathematics and statistics — insurance, pensions and capital adequacy — "
  "and defends the assumptions behind every number.",
  "يسعّر المخاطر بالرياضيات والإحصاء — التأمين والمعاشات وكفاية رأس المال — ويدافع عن "
  "الافتراضات الكامنة خلف كل رقم.",
  "mathematics:98 statistics:95 finance_accounting:85 data_analysis:85 attention_detail:92 programming:60",
  "15 95 15 30 55 95", "70 95 35 48 28",
  {"math": 98, "english": 82},
  ["Actuarial Science", "Mathematics", "Statistics", "Finance"],
  ["العلوم الاكتوارية", "الرياضيات", "الإحصاء", "المالية"],
  ["insurance companies", "reinsurance and consulting firms", "pension funds"],
  ["شركات التأمين", "شركات إعادة التأمين والاستشارات", "صناديق المعاشات"],
  ["we_the_uae_2031"])

C("compliance_officer", "Compliance & AML Officer", "مسؤول امتثال ومكافحة غسل الأموال",
  "finance", "high", (14000, 30000),
  "Keeps a financial institution inside the rules: monitors transactions, investigates "
  "suspicious activity, and maintains the controls regulators inspect.",
  "يبقي المؤسسة المالية ضمن الأنظمة: يراقب المعاملات، ويحقّق في الأنشطة المشبوهة، "
  "ويحافظ على الضوابط التي تفحصها الجهات الرقابية.",
  "law_policy:88 attention_detail:95 finance_accounting:80 writing_docs:80 data_analysis:70 english_language:80",
  "20 82 15 50 55 95", "60 93 45 60 30",
  {"math": 80, "english": 85, "social": 80, "arabic": 78},
  ["Law", "Finance", "Business Administration", "Criminology & Financial Crime"],
  ["القانون", "المالية", "إدارة الأعمال", "علم الجريمة والجرائم المالية"],
  ["banking groups", "financial regulators", "exchange houses"],
  ["المجموعات المصرفية", "الجهات المنظّمة للقطاع المالي", "شركات الصرافة"],
  ["we_the_uae_2031"])

# ---- Tourism & Hospitality -------------------------------------------------
C("hotel_operations_manager", "Hotel Operations Manager", "مدير عمليات فندقية",
  "tourism", "high", (14000, 30000),
  "Runs the daily operation of a hotel — rooms, service standards, staffing and budget — and "
  "is accountable for both guest experience and profitability.",
  "يدير التشغيل اليومي للفندق — الغرف ومعايير الخدمة والكوادر والميزانية — ويكون مسؤولاً "
  "عن تجربة الضيف والربحية معاً.",
  "customer_service:92 leadership:88 project_management:80 business_strategy:70 teamwork:85 english_language:80",
  "35 55 40 85 90 75", "68 88 85 72 25",
  {"english": 85, "arabic": 78, "social": 80, "math": 70},
  ["Hospitality Management", "Tourism Management", "Business Administration"],
  ["إدارة الضيافة", "إدارة السياحة", "إدارة الأعمال"],
  ["international hotel groups", "resort operators", "hospitality management companies"],
  ["المجموعات الفندقية العالمية", "مشغّلو المنتجعات", "شركات إدارة الضيافة"],
  ["we_the_uae_2031", "nafis"])

C("tourism_experience_designer", "Tourism Experience Designer", "مصمّم تجارب سياحية",
  "tourism", "moderate", (11000, 24000),
  "Creates the itineraries, cultural programmes and destination experiences that make visitors "
  "choose the UAE, blending heritage, storytelling and logistics.",
  "يبتكر البرامج السياحية والثقافية وتجارب الوجهات التي تدفع الزائر لاختيار الإمارات، "
  "بمزج التراث وسرد القصص والتنظيم اللوجستي.",
  "creativity:90 marketing_comm:85 customer_service:80 project_management:70 arabic_language:75 public_speaking:70",
  "30 55 88 80 78 60", "90 78 78 72 32",
  {"arabic": 82, "english": 85, "social": 88, "islamic": 72},
  ["Tourism Management", "Cultural Heritage Studies", "Marketing"],
  ["إدارة السياحة", "دراسات التراث الثقافي", "التسويق"],
  ["tourism authorities", "destination-management companies", "cultural districts and museums"],
  ["هيئات السياحة", "شركات إدارة الوجهات", "المناطق الثقافية والمتاحف"],
  ["we_the_uae_2031"])

C("events_manager", "Events & Exhibitions Manager", "مدير فعاليات ومعارض",
  "tourism", "high", (12000, 26000),
  "Delivers conferences, exhibitions and large public events on time and on budget, "
  "coordinating venues, suppliers, permits and hundreds of moving parts.",
  "ينفّذ المؤتمرات والمعارض والفعاليات الجماهيرية الكبرى في الوقت والميزانية المحدّدين، "
  "منسّقاً المواقع والمورّدين والتصاريح ومئات التفاصيل المتحرّكة.",
  "project_management:92 leadership:80 marketing_comm:80 customer_service:80 teamwork:85 attention_detail:80",
  "45 50 70 78 88 82", "78 88 82 68 30",
  {"english": 82, "arabic": 78, "social": 82, "math": 68},
  ["Event Management", "Hospitality Management", "Marketing"],
  ["إدارة الفعاليات", "إدارة الضيافة", "التسويق"],
  ["exhibition centres", "event agencies", "government communication offices"],
  ["مراكز المعارض", "وكالات تنظيم الفعاليات", "مكاتب الاتصال الحكومي"],
  ["we_the_uae_2031", "nafis"])

C("airline_customer_experience", "Airline Customer Experience Specialist", "أخصائي تجربة عملاء الطيران",
  "tourism", "moderate", (9000, 20000),
  "Improves every touchpoint of a passenger's journey, from booking to arrival, using service "
  "data and direct feedback to redesign what is not working.",
  "يحسّن كل نقطة تماس في رحلة المسافر، من الحجز حتى الوصول، مستخدماً بيانات الخدمة "
  "والملاحظات المباشرة لإعادة تصميم ما لا يعمل جيداً.",
  "customer_service:92 data_analysis:70 marketing_comm:75 english_language:85 teamwork:80 writing_docs:65",
  "25 65 55 88 70 72", "75 82 80 80 30",
  {"english": 88, "arabic": 78, "social": 82},
  ["Aviation Management", "Hospitality Management", "Marketing"],
  ["إدارة الطيران", "إدارة الضيافة", "التسويق"],
  ["national carriers", "airport operators", "travel platforms"],
  ["الناقلات الوطنية", "مشغّلو المطارات", "منصّات السفر"],
  ["we_the_uae_2031", "nafis"])

# ---- Civil & Construction --------------------------------------------------
C("civil_engineer", "Civil Engineer", "مهندس مدني",
  "construction", "high", (12000, 28000),
  "Designs and supervises the roads, bridges, water networks and buildings a growing country "
  "runs on, balancing safety codes, cost and desert-climate conditions.",
  "يصمّم الطرق والجسور وشبكات المياه والمباني التي تقوم عليها دولة نامية ويشرف عليها، "
  "موازناً بين أكواد السلامة والتكلفة وظروف المناخ الصحراوي.",
  "civil_structures:95 mathematics:85 physics_reasoning:88 project_management:75 attention_detail:85 problem_solving:80",
  "88 85 35 40 50 82", "68 88 45 58 28",
  {"math": 90, "physics": 90, "chemistry": 68},
  ["Civil Engineering", "Structural Engineering", "Construction Engineering"],
  ["الهندسة المدنية", "الهندسة الإنشائية", "هندسة التشييد"],
  ["infrastructure authorities", "engineering consultancies", "major contractors"],
  ["هيئات البنية التحتية", "الشركات الاستشارية الهندسية", "كبرى شركات المقاولات"],
  ["we_the_uae_2031", "centennial_2071"])

C("architect", "Architect", "مهندس معماري",
  "construction", "moderate", (12000, 28000),
  "Turns a brief into a building: form, light, circulation and materials, resolved into "
  "drawings that a contractor can build and a client wants to inhabit.",
  "يحوّل المتطلبات إلى مبنى: الشكل والضوء والحركة والمواد، مترجمة إلى مخططات ينفّذها "
  "المقاول ويرغب العميل في السكن فيها.",
  "visual_design:92 creativity:92 civil_structures:70 mathematics:72 project_management:65 attention_detail:80",
  "65 70 95 45 55 70", "93 82 50 58 32",
  {"math": 82, "physics": 78, "english": 78, "social": 70},
  ["Architecture (B.Arch)", "Interior Architecture", "Urban Design"],
  ["الهندسة المعمارية", "العمارة الداخلية", "التصميم الحضري"],
  ["architecture practices", "property developers", "municipal planning departments"],
  ["المكاتب المعمارية", "شركات التطوير العقاري", "دوائر التخطيط في البلديات"],
  ["we_the_uae_2031", "centennial_2071"])

C("quantity_surveyor", "Quantity Surveyor", "مساح كميات",
  "construction", "moderate", (11000, 24000),
  "Controls the money on a construction project: measures work, prices variations, manages "
  "contracts and keeps a large build financially honest.",
  "يضبط الجانب المالي في مشروع الإنشاء: يقيس الأعمال، ويسعّر التغييرات، ويدير العقود، "
  "ويحافظ على انضباط مالي في مشروع كبير.",
  "finance_accounting:85 attention_detail:95 civil_structures:70 mathematics:82 writing_docs:75 project_management:75",
  "65 78 20 40 60 95", "58 93 45 55 30",
  {"math": 88, "physics": 75, "english": 78},
  ["Quantity Surveying", "Construction Management", "Civil Engineering"],
  ["مسح الكميات", "إدارة التشييد", "الهندسة المدنية"],
  ["contracting companies", "cost-consultancy firms", "government project offices"],
  ["شركات المقاولات", "شركات استشارات التكلفة", "مكاتب المشاريع الحكومية"],
  ["we_the_uae_2031"])

C("urban_planner", "Urban Planner", "مخطّط حضري",
  "construction", "moderate", (13000, 28000),
  "Plans how cities grow — land use, transport, density and public space — so that new "
  "districts remain liveable, walkable and sustainable decades later.",
  "يخطّط لنمو المدن — استعمالات الأراضي والنقل والكثافة والفضاء العام — لتبقى الأحياء "
  "الجديدة صالحة للعيش وقابلة للمشي ومستدامة بعد عقود.",
  "geospatial_gis:85 sustainability:80 law_policy:75 research_methods:78 writing_docs:75 public_speaking:70",
  "50 85 60 70 60 78", "85 85 55 68 30",
  {"math": 80, "social": 88, "english": 82, "arabic": 78},
  ["Urban Planning", "Architecture", "Geography & GIS"],
  ["التخطيط العمراني", "الهندسة المعمارية", "الجغرافيا ونظم المعلومات الجغرافية"],
  ["municipalities", "urban-planning councils", "master-developer companies"],
  ["البلديات", "مجالس التخطيط العمراني", "شركات التطوير الرئيسية"],
  ["we_the_uae_2031", "net_zero_2050"])

# ---- Logistics & Maritime --------------------------------------------------
C("supply_chain_analyst", "Supply Chain Analyst", "محلل سلاسل الإمداد",
  "logistics", "high", (11000, 24000),
  "Uses data to keep goods moving: forecasts demand, optimises inventory and routes, and finds "
  "the bottleneck that is costing a distribution network money.",
  "يستخدم البيانات لإبقاء البضائع في حركة: يتنبأ بالطلب، ويحسّن المخزون والمسارات، "
  "ويكتشف الاختناق الذي يكلّف شبكة التوزيع أموالاً.",
  "logistics_ops:92 data_analysis:88 mathematics:78 problem_solving:80 business_strategy:65 attention_detail:80",
  "45 85 20 40 60 88", "68 88 45 55 30",
  {"math": 88, "computer_science": 78, "english": 80, "social": 68},
  ["Supply Chain Management", "Industrial Engineering", "Business Analytics"],
  ["إدارة سلاسل الإمداد", "الهندسة الصناعية", "تحليلات الأعمال"],
  ["port and terminal operators", "logistics groups", "retail distribution networks"],
  ["مشغّلو الموانئ والمحطات", "المجموعات اللوجستية", "شبكات توزيع التجزئة"],
  ["we_the_uae_2031", "digital_economy_strategy"])

C("port_operations_manager", "Port & Terminal Operations Manager", "مدير عمليات موانئ ومحطات",
  "logistics", "moderate", (16000, 34000),
  "Directs the movement of vessels, containers and equipment across a terminal, balancing "
  "safety, berth scheduling and throughput targets around the clock.",
  "يوجّه حركة السفن والحاويات والمعدات داخل المحطة، موازناً بين السلامة وجدولة الأرصفة "
  "وأهداف الإنتاجية على مدار الساعة.",
  "logistics_ops:95 leadership:85 project_management:80 problem_solving:80 teamwork:80 attention_detail:80",
  "80 70 20 55 82 85", "62 90 68 60 25",
  {"math": 82, "physics": 75, "english": 82, "social": 72},
  ["Maritime Studies", "Logistics Management", "Industrial Engineering"],
  ["الدراسات البحرية", "إدارة اللوجستيات", "الهندسة الصناعية"],
  ["port operators", "shipping lines", "free-zone authorities"],
  ["مشغّلو الموانئ", "خطوط الملاحة", "هيئات المناطق الحرة"],
  ["we_the_uae_2031", "nafis"])

C("marine_engineer", "Marine Engineer", "مهندس بحري",
  "logistics", "moderate", (15000, 32000),
  "Keeps ships running: propulsion, power generation and onboard systems, maintained and "
  "repaired far from any workshop.",
  "يحافظ على تشغيل السفن: أنظمة الدفع وتوليد الطاقة والأنظمة على متن السفينة، صيانةً "
  "وإصلاحاً بعيداً عن أي ورشة.",
  "mechanical_design:90 physics_reasoning:88 electronics:75 energy_systems:75 problem_solving:82 attention_detail:85",
  "92 85 20 35 40 80", "65 90 40 52 25",
  {"math": 88, "physics": 92, "chemistry": 70},
  ["Marine Engineering", "Mechanical Engineering", "Naval Architecture"],
  ["الهندسة البحرية", "الهندسة الميكانيكية", "هندسة بناء السفن"],
  ["shipping companies", "offshore energy operators", "ship-repair yards"],
  ["شركات الملاحة", "مشغّلو الطاقة البحرية", "أحواض إصلاح السفن"],
  ["we_the_uae_2031"])

C("customs_trade_specialist", "Customs & Trade Compliance Specialist", "أخصائي جمارك وامتثال تجاري",
  "logistics", "moderate", (9000, 20000),
  "Makes cross-border trade legal and fast: classifies goods, applies tariff and sanctions "
  "rules, and clears shipments without costly delays.",
  "يجعل التجارة عبر الحدود قانونية وسريعة: يصنّف البضائع، ويطبّق قواعد التعرفة والعقوبات، "
  "ويخلّص الشحنات دون تأخير مكلف.",
  "law_policy:85 logistics_ops:85 attention_detail:92 writing_docs:75 english_language:80 arabic_language:75",
  "40 75 15 55 55 92", "58 90 50 62 30",
  {"english": 82, "arabic": 82, "social": 80, "math": 72},
  ["International Trade", "Logistics Management", "Law"],
  ["التجارة الدولية", "إدارة اللوجستيات", "القانون"],
  ["federal customs authorities", "freight forwarders", "free-zone companies"],
  ["الهيئات الجمركية الاتحادية", "شركات الشحن والتخليص", "شركات المناطق الحرة"],
  ["we_the_uae_2031", "nafis"])

# ---- Government & Public Policy -------------------------------------------
C("public_policy_analyst", "Public Policy Analyst", "محلل سياسات عامة",
  "government", "high", (13000, 28000),
  "Researches social and economic problems, evaluates options with evidence, and drafts the "
  "policy papers that ministries use to decide.",
  "يبحث المشكلات الاجتماعية والاقتصادية، ويقيّم الخيارات بالأدلة، ويصوغ أوراق السياسات "
  "التي تستند إليها الوزارات في اتخاذ القرار.",
  "law_policy:92 research_methods:90 writing_docs:88 economics:75 data_analysis:70 arabic_language:82",
  "15 88 40 72 65 78", "82 88 55 68 30",
  {"social": 92, "arabic": 88, "english": 85, "math": 75},
  ["Public Policy", "Political Science", "Economics"],
  ["السياسات العامة", "العلوم السياسية", "الاقتصاد"],
  ["federal ministries", "policy research centres", "emirate-level executive councils"],
  ["الوزارات الاتحادية", "مراكز أبحاث السياسات", "المجالس التنفيذية في الإمارات"],
  ["we_the_uae_2031", "centennial_2071"])

C("government_digital_services", "Government Digital Services Officer", "مسؤول خدمات حكومية رقمية",
  "government", "high", (12000, 26000),
  "Redesigns public services so residents can complete them online in minutes, coordinating "
  "technology teams, legal requirements and Arabic-first user experience.",
  "يعيد تصميم الخدمات العامة ليتمكّن المتعاملون من إنجازها إلكترونياً خلال دقائق، منسّقاً "
  "بين الفرق التقنية والمتطلبات القانونية وتجربة استخدام عربية أولاً.",
  "project_management:85 systems_design:70 writing_docs:75 customer_service:80 arabic_language:85 data_analysis:65",
  "30 78 50 78 75 82", "80 88 65 70 30",
  {"social": 85, "arabic": 88, "english": 82, "computer_science": 78},
  ["Information Systems", "Public Administration", "Business Administration"],
  ["نظم المعلومات", "الإدارة العامة", "إدارة الأعمال"],
  ["federal digital-government entities", "smart-city offices", "service centres"],
  ["جهات الحكومة الرقمية الاتحادية", "مكاتب المدن الذكية", "مراكز الخدمة"],
  ["digital_economy_strategy", "centennial_2071"])

C("diplomat", "Diplomat / Foreign Service Officer", "دبلوماسي",
  "government", "moderate", (15000, 35000),
  "Represents the country abroad: negotiates agreements, reports on political developments, "
  "and supports citizens and national interests in another state.",
  "يمثّل الدولة في الخارج: يتفاوض على الاتفاقيات، ويرفع التقارير عن التطورات السياسية، "
  "ويخدم المواطنين والمصالح الوطنية في دولة أخرى.",
  "law_policy:88 public_speaking:90 writing_docs:85 arabic_language:90 english_language:90 research_methods:70",
  "15 80 45 82 85 78", "82 88 75 72 25",
  {"social": 92, "arabic": 92, "english": 90, "islamic": 78},
  ["International Relations", "Political Science", "Law"],
  ["العلاقات الدولية", "العلوم السياسية", "القانون"],
  ["the foreign ministry", "diplomatic missions", "international organisations"],
  ["وزارة الخارجية", "البعثات الدبلوماسية", "المنظمات الدولية"],
  ["we_the_uae_2031", "centennial_2071"])

C("statistician_gov", "Government Statistician", "إحصائي حكومي",
  "government", "moderate", (12000, 26000),
  "Designs surveys and produces the official statistics a country plans with — population, "
  "labour, prices — with defensible methodology and clear publication.",
  "يصمّم المسوح وينتج الإحصاءات الرسمية التي تُخطط بها الدولة — السكان والعمل والأسعار — "
  "بمنهجية قابلة للدفاع ونشر واضح.",
  "statistics:95 data_analysis:90 research_methods:88 writing_docs:75 mathematics:85 attention_detail:88",
  "20 92 20 50 40 90", "72 92 40 58 28",
  {"math": 92, "social": 82, "english": 80, "computer_science": 78},
  ["Statistics", "Economics", "Data Science"],
  ["الإحصاء", "الاقتصاد", "علم البيانات"],
  ["national statistics centres", "federal ministries", "central bank research units"],
  ["المراكز الوطنية للإحصاء", "الوزارات الاتحادية", "وحدات البحوث في المصرف المركزي"],
  ["we_the_uae_2031", "ai_strategy_2031"])

# ---- Education -------------------------------------------------------------
C("secondary_teacher_stem", "Secondary STEM Teacher", "معلّم علوم ورياضيات للمرحلة الثانوية",
  "education", "high", (9000, 20000),
  "Teaches mathematics or science to secondary students, designs assessment, and turns an "
  "abstract syllabus into something a sixteen-year-old can actually use.",
  "يدرّس الرياضيات أو العلوم لطلبة المرحلة الثانوية، ويصمّم التقويم، ويحوّل منهجاً "
  "مجرّداً إلى معرفة يستطيع طالب في السادسة عشرة استخدامها فعلاً.",
  "teaching:95 public_speaking:85 mathematics:80 problem_solving:70 arabic_language:75 attention_detail:70",
  "35 82 45 92 60 75", "72 85 72 80 30",
  {"math": 88, "physics": 82, "chemistry": 78, "arabic": 80, "english": 78},
  ["Education (Mathematics/Science)", "Physics", "Mathematics"],
  ["التربية (رياضيات/علوم)", "الفيزياء", "الرياضيات"],
  ["public and private schools", "the ministry of education", "curriculum development units"],
  ["المدارس الحكومية والخاصة", "وزارة التربية والتعليم", "وحدات تطوير المناهج"],
  ["nafis", "centennial_2071"])

C("special_education_specialist", "Special Education Specialist", "أخصائي تربية خاصة",
  "education", "high", (10000, 22000),
  "Supports students with additional learning needs through individual plans, adapted "
  "materials and close work with families and therapists.",
  "يدعم الطلبة ذوي الاحتياجات التعليمية الإضافية عبر الخطط الفردية والمواد المكيّفة "
  "والعمل الوثيق مع الأسر والمعالجين.",
  "teaching:92 clinical_skills:60 teamwork:88 attention_detail:85 arabic_language:80 writing_docs:70",
  "35 75 50 96 45 78", "78 88 62 92 32",
  {"biology": 78, "social": 88, "arabic": 85, "english": 78},
  ["Special Education", "Psychology", "Education"],
  ["التربية الخاصة", "علم النفس", "التربية"],
  ["inclusive schools", "rehabilitation and early-intervention centres", "the ministry of education"],
  ["المدارس الدامجة", "مراكز التأهيل والتدخل المبكر", "وزارة التربية والتعليم"],
  ["we_the_uae_2031"])

C("instructional_designer", "Instructional Designer", "مصمّم تعليمي",
  "education", "high", (11000, 24000),
  "Builds digital courses that work: defines learning outcomes, structures content and "
  "assessment, and produces bilingual material for online delivery.",
  "يبني مقررات رقمية فعّالة: يحدّد نواتج التعلّم، وينظّم المحتوى والتقويم، وينتج مواد "
  "ثنائية اللغة للتعليم عبر الإنترنت.",
  "teaching:82 writing_docs:88 visual_design:70 creativity:75 project_management:70 arabic_language:80",
  "25 78 72 78 55 78", "85 85 55 72 30",
  {"arabic": 85, "english": 85, "social": 78, "computer_science": 72},
  ["Instructional Design / Educational Technology", "Education", "Media Studies"],
  ["التصميم التعليمي وتقنيات التعليم", "التربية", "دراسات الإعلام"],
  ["universities and colleges", "corporate learning departments", "e-learning companies"],
  ["الجامعات والكليات", "إدارات التدريب في الشركات", "شركات التعلّم الإلكتروني"],
  ["digital_economy_strategy", "centennial_2071"])

C("academic_career_counsellor", "Academic & Career Counsellor", "مرشد أكاديمي ومهني",
  "education", "moderate", (9000, 20000),
  "Guides students through subject choice, university applications and career direction, "
  "combining assessment tools with one-to-one conversation.",
  "يرشد الطلبة في اختيار المواد والتقديم الجامعي والاتجاه المهني، جامعاً بين أدوات "
  "التقييم والحوار الفردي.",
  "teaching:80 public_speaking:75 research_methods:65 writing_docs:70 arabic_language:85 customer_service:75",
  "20 75 45 96 60 72", "78 85 75 90 32",
  {"social": 90, "arabic": 88, "english": 82, "biology": 65},
  ["Counselling Psychology", "Education", "Sociology"],
  ["الإرشاد النفسي", "التربية", "علم الاجتماع"],
  ["schools and universities", "the ministry of education", "career-guidance centres"],
  ["المدارس والجامعات", "وزارة التربية والتعليم", "مراكز الإرشاد المهني"],
  ["nafis", "we_the_uae_2031"])

# ---- Media & Creative Industries -------------------------------------------
C("ux_ui_designer", "UX/UI Designer", "مصمّم تجربة وواجهة المستخدم",
  "media", "high", (12000, 26000),
  "Designs how a product feels to use: research, flows, interface and design systems that "
  "work in both Arabic right-to-left and English layouts.",
  "يصمّم شعور استخدام المنتج: البحث، ومسارات الاستخدام، والواجهة، وأنظمة التصميم التي "
  "تعمل في التخطيط العربي من اليمين إلى اليسار والإنجليزي معاً.",
  "visual_design:95 creativity:88 problem_solving:70 research_methods:70 teamwork:75 writing_docs:60",
  "30 75 92 60 55 70", "92 82 55 65 32",
  {"english": 82, "arabic": 78, "computer_science": 78, "social": 75},
  ["Interaction / UX Design", "Graphic Design", "Computer Science"],
  ["تصميم التفاعل وتجربة المستخدم", "التصميم الجرافيكي", "علوم الحاسوب"],
  ["digital product studios", "banks and telecom operators", "government service teams"],
  ["استوديوهات المنتجات الرقمية", "المصارف وشركات الاتصالات", "فرق الخدمات الحكومية"],
  ["digital_economy_strategy"])

C("digital_content_producer", "Digital Content Producer", "منتج محتوى رقمي",
  "media", "high", (9000, 22000),
  "Plans, shoots and edits video and social content in Arabic and English, and measures what "
  "actually reaches an audience rather than what looks impressive.",
  "يخطّط للمحتوى المرئي ومحتوى منصّات التواصل ويصوّره ويحرّره بالعربية والإنجليزية، "
  "ويقيس ما يصل فعلاً إلى الجمهور لا ما يبدو مبهراً فحسب.",
  "creativity:92 marketing_comm:85 visual_design:80 writing_docs:80 arabic_language:85 data_analysis:55",
  "40 55 95 65 72 55", "92 75 78 65 35",
  {"arabic": 88, "english": 85, "social": 80},
  ["Media Production", "Communication", "Digital Media"],
  ["الإنتاج الإعلامي", "الاتصال", "الإعلام الرقمي"],
  ["media production houses", "government communication offices", "brand marketing teams"],
  ["شركات الإنتاج الإعلامي", "مكاتب الاتصال الحكومي", "فرق التسويق للعلامات التجارية"],
  ["we_the_uae_2031"])

C("journalist_editor", "Journalist / Editor", "صحفي أو محرّر",
  "media", "moderate", (9000, 20000),
  "Reports and edits accurate stories under deadline, verifies sources, and writes clearly "
  "in Modern Standard Arabic and English for very different audiences.",
  "يعدّ الأخبار ويحرّرها بدقّة ضمن مواعيد ضاغطة، ويتحقّق من المصادر، ويكتب بوضوح "
  "بالعربية الفصحى والإنجليزية لجمهورين مختلفين تماماً.",
  "writing_docs:95 arabic_language:92 english_language:85 research_methods:78 attention_detail:85 public_speaking:65",
  "20 78 85 70 60 75", "88 82 65 62 35",
  {"arabic": 92, "english": 88, "social": 88},
  ["Journalism", "Mass Communication", "Arabic Language & Literature"],
  ["الصحافة", "الإعلام", "اللغة العربية وآدابها"],
  ["news organisations", "government media offices", "digital publishers"],
  ["المؤسسات الإخبارية", "المكاتب الإعلامية الحكومية", "دور النشر الرقمي"],
  ["we_the_uae_2031"])

C("game_developer", "Game Developer", "مطوّر ألعاب",
  "media", "moderate", (12000, 28000),
  "Programmes interactive experiences — gameplay systems, graphics and performance — often "
  "in small teams where one person owns several disciplines.",
  "يبرمج التجارب التفاعلية — أنظمة اللعب والرسوميات والأداء — غالباً ضمن فرق صغيرة "
  "يتولّى فيها الشخص الواحد أكثر من تخصص.",
  "programming:92 creativity:85 mathematics:80 visual_design:70 physics_reasoning:70 problem_solving:85",
  "50 82 88 35 45 68", "92 78 45 52 35",
  {"math": 88, "physics": 80, "computer_science": 95, "english": 80},
  ["Game Development", "Computer Science", "Interactive Media"],
  ["تطوير الألعاب", "علوم الحاسوب", "الوسائط التفاعلية"],
  ["game studios", "creative-industry free zones", "simulation and training companies"],
  ["استوديوهات الألعاب", "المناطق الحرة للصناعات الإبداعية", "شركات المحاكاة والتدريب"],
  ["digital_economy_strategy"])

# ---- Entrepreneurship ------------------------------------------------------
C("startup_founder", "Startup Founder", "مؤسّس شركة ناشئة",
  "entrepreneurship", "moderate", (8000, 50000),
  "Identifies a real problem, builds a first version, finds the customers who will pay for it, "
  "and raises the funding to keep going — with all the risk that implies.",
  "يحدّد مشكلة حقيقية، ويبني نسخة أولى، ويجد العملاء المستعدين للدفع، ويجمع التمويل "
  "لمواصلة العمل — بكل ما يحمله ذلك من مخاطرة.",
  "business_strategy:92 leadership:92 marketing_comm:82 finance_accounting:70 problem_solving:88 public_speaking:80",
  "35 78 70 55 98 55", "92 82 85 52 30",
  {"math": 78, "english": 85, "social": 82, "computer_science": 72},
  ["Entrepreneurship", "Business Administration", "any technical degree plus business training"],
  ["ريادة الأعمال", "إدارة الأعمال", "أي تخصص تقني مع تدريب في الأعمال"],
  ["start-up accelerators and incubators", "venture-capital-backed ventures", "free-zone company set-ups"],
  ["مسرّعات وحاضنات الأعمال", "المشاريع المدعومة برأس المال الجريء", "الشركات في المناطق الحرة"],
  ["digital_economy_strategy", "we_the_uae_2031", "nafis"])

C("product_manager", "Product Manager", "مدير منتج",
  "entrepreneurship", "high", (18000, 40000),
  "Decides what a product should do and why, working between users, engineers and business "
  "goals, and is measured on outcomes rather than output.",
  "يقرّر ما ينبغي أن يفعله المنتج ولماذا، عاملاً بين المستخدمين والمهندسين وأهداف العمل، "
  "ويُقاس بالنتائج لا بحجم ما يُنتَج.",
  "business_strategy:88 project_management:85 data_analysis:75 marketing_comm:75 leadership:80 writing_docs:75",
  "25 80 55 62 90 72", "85 85 75 60 30",
  {"math": 82, "english": 85, "social": 78, "computer_science": 78},
  ["Business Administration", "Information Systems", "Computer Science"],
  ["إدارة الأعمال", "نظم المعلومات", "علوم الحاسوب"],
  ["technology companies", "banking digital teams", "e-commerce platforms"],
  ["شركات التقنية", "الفرق الرقمية في المصارف", "منصّات التجارة الإلكترونية"],
  ["digital_economy_strategy"])

C("digital_marketing_specialist", "Digital Marketing Specialist", "أخصائي تسويق رقمي",
  "entrepreneurship", "high", (9000, 22000),
  "Grows an audience and a customer base through search, social and paid channels, and proves "
  "the return on every dirham spent with analytics.",
  "ينمّي الجمهور وقاعدة العملاء عبر محرّكات البحث ومنصّات التواصل والقنوات المدفوعة، "
  "ويثبت العائد على كل درهم يُنفق باستخدام التحليلات.",
  "marketing_comm:95 data_analysis:78 creativity:80 writing_docs:78 arabic_language:80 english_language:80",
  "20 70 78 65 88 70", "85 78 82 62 32",
  {"english": 85, "arabic": 85, "social": 80, "math": 72},
  ["Marketing", "Business Administration", "Communication"],
  ["التسويق", "إدارة الأعمال", "الاتصال"],
  ["marketing agencies", "e-commerce and retail groups", "start-ups"],
  ["وكالات التسويق", "مجموعات التجارة الإلكترونية والتجزئة", "الشركات الناشئة"],
  ["digital_economy_strategy", "nafis"])

C("business_analyst", "Business Analyst", "محلل أعمال",
  "entrepreneurship", "high", (12000, 26000),
  "Translates between business and technology: documents processes, defines requirements, and "
  "makes sure the system that gets built is the one that was needed.",
  "يترجم بين لغة الأعمال ولغة التقنية: يوثّق العمليات، ويحدّد المتطلبات، ويضمن أن يكون "
  "النظام الذي يُبنى هو النظام المطلوب فعلاً.",
  "business_strategy:82 data_analysis:85 writing_docs:88 problem_solving:78 teamwork:78 attention_detail:82",
  "20 85 35 62 70 88", "75 88 62 65 30",
  {"math": 82, "english": 82, "social": 78, "computer_science": 78},
  ["Business Administration", "Information Systems", "Industrial Engineering"],
  ["إدارة الأعمال", "نظم المعلومات", "الهندسة الصناعية"],
  ["consulting firms", "banking groups", "government transformation offices"],
  ["الشركات الاستشارية", "المجموعات المصرفية", "مكاتب التحول الحكومي"],
  ["digital_economy_strategy", "we_the_uae_2031"])

# --------------------------------------------------------------------------
# 5. Course catalog (120) -- three learning options per skill in the taxonomy
# --------------------------------------------------------------------------
COURSES: list[dict] = []


def CO(cid, en, ar, provider, ptype, skills, level, weeks, cost, lang, d_en, d_ar):
    """skills -- "skill_id:gain ..." where gain is the 0-100 proficiency lift."""
    sk = {}
    for token in skills.split():
        name, _, gain = token.partition(":")
        assert name in SKILL_IDS, f"unknown skill {name!r} in {cid}"
        sk[name] = int(gain)
    assert level in {"beginner", "intermediate", "advanced"}, cid
    assert cost in {"free", "paid"}, cid
    assert lang in {"en", "ar", "both"}, cid
    COURSES.append({
        "id": cid,
        "title_en": en,
        "title_ar": ar,
        "provider": provider,
        "provider_type": ptype,          # global | uae
        "skills": sk,
        "level": level,
        "duration_weeks": weeks,
        "cost": cost,
        "language": lang,
        "description_en": d_en,
        "description_ar": d_ar,
        "search_query": f"{en} {provider}",
    })


# ---- programming -----------------------------------------------------------
CO("py_for_everybody", "Python for Everybody", "بايثون للجميع", "Coursera", "global",
   "programming:45 problem_solving:20", "beginner", 8, "free", "en",
   "A gentle first programming course covering variables, loops, functions and working with data files.",
   "مقرّر أول لطيف في البرمجة يغطي المتغيّرات والحلقات والدوال والتعامل مع ملفات البيانات.")
CO("cs50x", "CS50: Introduction to Computer Science", "مقدمة في علوم الحاسوب CS50", "edX", "global",
   "programming:55 problem_solving:35 systems_design:20", "beginner", 12, "free", "en",
   "A demanding introduction to computer science through C, Python, SQL and web programming.",
   "مقدمة صارمة في علوم الحاسوب عبر لغات C وبايثون وSQL وبرمجة الويب.")
CO("java_oop_ar", "Object-Oriented Programming in Java (Arabic)", "البرمجة كائنية التوجّه بلغة جافا", "Rwaq", "global",
   "programming:45 systems_design:25", "intermediate", 8, "free", "ar",
   "Classes, inheritance and interfaces taught fully in Arabic with practical exercises.",
   "الأصناف والوراثة والواجهات مشروحة بالكامل بالعربية مع تمارين تطبيقية.")
# ---- data_analysis ---------------------------------------------------------
CO("google_data_analytics", "Google Data Analytics Certificate", "شهادة تحليل البيانات من جوجل", "Google", "global",
   "data_analysis:50 statistics:25 writing_docs:15", "beginner", 24, "paid", "en",
   "An end-to-end analytics certificate covering spreadsheets, SQL, R and dashboard storytelling.",
   "شهادة تحليلية متكاملة تغطي الجداول الحسابية وSQL ولغة R وسرد البيانات في لوحات المعلومات.")
CO("excel_to_powerbi", "From Excel to Power BI", "من إكسل إلى Power BI", "Microsoft", "global",
   "data_analysis:40 attention_detail:15", "beginner", 6, "free", "both",
   "Turns spreadsheet skills into proper data models and interactive business dashboards.",
   "يحوّل مهارات الجداول الحسابية إلى نماذج بيانات صحيحة ولوحات معلومات تفاعلية للأعمال.")
CO("sql_for_data", "SQL for Data Analysis", "لغة SQL لتحليل البيانات", "Udacity", "global",
   "data_analysis:45 programming:20", "intermediate", 4, "paid", "en",
   "Query design, joins, aggregation and window functions on realistic business datasets.",
   "تصميم الاستعلامات والربط والتجميع ودوال النوافذ على مجموعات بيانات واقعية.")
# ---- machine_learning ------------------------------------------------------
CO("ml_specialization", "Machine Learning Specialization", "تخصص تعلّم الآلة", "Coursera", "global",
   "machine_learning:55 mathematics:20 programming:20", "intermediate", 12, "paid", "en",
   "Supervised and unsupervised learning from the ground up, with hands-on model building.",
   "التعلّم الموجّه وغير الموجّه من الأساس، مع بناء عملي للنماذج.")
CO("deep_learning_ar", "Introduction to Deep Learning (Arabic)", "مقدمة في التعلّم العميق", "Rwaq", "global",
   "machine_learning:45 mathematics:20", "intermediate", 8, "free", "ar",
   "Neural networks, training dynamics and common architectures explained in Arabic.",
   "الشبكات العصبية وديناميكيات التدريب والبنى الشائعة مشروحة بالعربية.")
CO("mbzuai_ai_foundations", "AI Foundations Programme", "برنامج أسس الذكاء الاصطناعي", "MBZUAI", "uae",
   "machine_learning:50 mathematics:25 research_methods:20", "advanced", 16, "free", "en",
   "A university-run programme in modern AI methods aimed at strong STEM students in the UAE.",
   "برنامج جامعي في أساليب الذكاء الاصطناعي الحديثة موجّه لطلبة العلوم المتميّزين في الإمارات.")
# ---- mathematics -----------------------------------------------------------
CO("khan_calculus", "Calculus I & II", "التفاضل والتكامل ١ و٢", "Khan Academy", "global",
   "mathematics:45 problem_solving:15", "intermediate", 16, "free", "both",
   "Limits, derivatives, integrals and series with thousands of practice problems.",
   "النهايات والمشتقات والتكاملات والمتسلسلات مع آلاف التمارين التطبيقية.")
CO("linear_algebra_ml", "Linear Algebra for Machine Learning", "الجبر الخطي لتعلّم الآلة", "Coursera", "global",
   "mathematics:45 machine_learning:20", "intermediate", 6, "free", "en",
   "Vectors, matrices and eigen-decomposition taught through their use in data problems.",
   "المتجهات والمصفوفات والتحليل الذاتي مشروحة من خلال استخدامها في مسائل البيانات.")
CO("emsat_math_prep", "EmSAT Mathematics Preparation", "التحضير لاختبار إمسات رياضيات", "HCT", "uae",
   "mathematics:40 attention_detail:20", "beginner", 8, "free", "both",
   "Targeted revision of the algebra, functions and geometry assessed in the EmSAT maths test.",
   "مراجعة موجّهة للجبر والدوال والهندسة التي يقيسها اختبار إمسات في الرياضيات.")
# ---- statistics ------------------------------------------------------------
CO("stats_with_r", "Statistics with R", "الإحصاء باستخدام R", "Coursera", "global",
   "statistics:50 data_analysis:25 programming:15", "intermediate", 12, "paid", "en",
   "Inference, regression and experimental design with a full statistical computing toolkit.",
   "الاستدلال والانحدار وتصميم التجارب مع حزمة كاملة لأدوات الحوسبة الإحصائية.")
CO("intro_probability", "Introduction to Probability", "مقدمة في الاحتمالات", "edX", "global",
   "statistics:45 mathematics:25", "intermediate", 10, "free", "en",
   "Random variables, distributions and Bayesian reasoning built from first principles.",
   "المتغيّرات العشوائية والتوزيعات والاستدلال البايزي مبنية من المبادئ الأولى.")
CO("stats_arabic", "Descriptive and Inferential Statistics (Arabic)", "الإحصاء الوصفي والاستدلالي", "Edraak", "global",
   "statistics:40 data_analysis:20", "beginner", 6, "free", "ar",
   "Core statistical concepts and hypothesis testing presented entirely in Arabic.",
   "المفاهيم الإحصائية الأساسية واختبار الفرضيات مقدّمة بالكامل بالعربية.")
# ---- physics_reasoning -----------------------------------------------------
CO("mechanics_mit", "Classical Mechanics", "الميكانيكا الكلاسيكية", "edX", "global",
   "physics_reasoning:50 mathematics:25 problem_solving:20", "intermediate", 14, "free", "en",
   "Newtonian mechanics at university level, heavy on problem solving and modelling.",
   "الميكانيكا النيوتونية بمستوى جامعي، مع تركيز كبير على حل المسائل والنمذجة.")
CO("emsat_physics_prep", "EmSAT Physics Preparation", "التحضير لاختبار إمسات فيزياء", "HCT", "uae",
   "physics_reasoning:40 mathematics:20", "beginner", 8, "free", "both",
   "Structured revision of mechanics, electricity and waves for the EmSAT physics test.",
   "مراجعة منظّمة للميكانيكا والكهرباء والموجات استعداداً لاختبار إمسات في الفيزياء.")
CO("thermo_energy", "Thermodynamics and Energy Transfer", "الديناميكا الحرارية وانتقال الطاقة", "Coursera", "global",
   "physics_reasoning:45 energy_systems:30", "advanced", 10, "paid", "en",
   "Energy, entropy and heat transfer applied to engines, plants and building systems.",
   "الطاقة والإنتروبيا وانتقال الحرارة مطبّقة على المحركات والمحطات وأنظمة المباني.")
# ---- chemistry_lab ---------------------------------------------------------
CO("general_chemistry", "General Chemistry", "الكيمياء العامة", "edX", "global",
   "chemistry_lab:50 attention_detail:20", "beginner", 12, "free", "en",
   "Atomic structure, bonding, stoichiometry and reaction kinetics with virtual labs.",
   "التركيب الذري والروابط والحسابات الكيميائية وحركية التفاعلات مع مختبرات افتراضية.")
CO("organic_chem", "Organic Chemistry Essentials", "أساسيات الكيمياء العضوية", "Coursera", "global",
   "chemistry_lab:45 life_sciences:20", "intermediate", 10, "paid", "en",
   "Functional groups, mechanisms and synthesis routes for pre-medical and engineering students.",
   "المجموعات الوظيفية والآليات ومسارات التخليق لطلبة الطب التمهيدي والهندسة.")
CO("lab_safety", "Laboratory Safety and Technique", "السلامة والتقنيات المخبرية", "IBM SkillsBuild", "global",
   "chemistry_lab:30 attention_detail:35", "beginner", 3, "free", "both",
   "Handling, measurement and documentation discipline expected in any professional laboratory.",
   "انضباط المناولة والقياس والتوثيق المتوقّع في أي مختبر مهني.")
# ---- life_sciences ---------------------------------------------------------
CO("intro_biology", "Introduction to Biology", "مقدمة في علم الأحياء", "edX", "global",
   "life_sciences:50 research_methods:15", "beginner", 12, "free", "en",
   "Cell biology, genetics and molecular processes as a foundation for health careers.",
   "بيولوجيا الخلية وعلم الوراثة والعمليات الجزيئية كأساس للمهن الصحية.")
CO("human_anatomy", "Human Anatomy and Physiology", "التشريح ووظائف الأعضاء", "Coursera", "global",
   "life_sciences:45 clinical_skills:25", "intermediate", 14, "paid", "en",
   "Body systems and their function, structured for nursing and pre-medical students.",
   "أجهزة الجسم ووظائفها، منظّمة لطلبة التمريض والطب التمهيدي.")
CO("genetics_ar", "Principles of Genetics (Arabic)", "مبادئ علم الوراثة", "Edraak", "global",
   "life_sciences:40 research_methods:15", "intermediate", 6, "free", "ar",
   "Inheritance, DNA and modern genomics explained in Arabic for secondary graduates.",
   "الوراثة والحمض النووي وعلم الجينوم الحديث مشروحة بالعربية لخريجي الثانوية.")
# ---- cybersecurity ---------------------------------------------------------
CO("google_cybersecurity", "Google Cybersecurity Certificate", "شهادة الأمن السيبراني من جوجل", "Google", "global",
   "cybersecurity:50 networking:25 attention_detail:20", "beginner", 24, "paid", "en",
   "A career-entry certificate covering threats, SIEM tooling, Linux and incident response.",
   "شهادة لدخول المجال تغطي التهديدات وأدوات SIEM ولينكس والاستجابة للحوادث.")
CO("cisco_cyberops", "Cisco CyberOps Associate", "شهادة سيسكو CyberOps", "Cisco", "global",
   "cybersecurity:50 networking:35", "intermediate", 16, "free", "en",
   "Security operations centre skills: monitoring, analysis and structured incident handling.",
   "مهارات مركز العمليات الأمنية: المراقبة والتحليل والتعامل المنظّم مع الحوادث.")
CO("web_app_security", "Web Application Security", "أمن تطبيقات الويب", "Coursera", "global",
   "cybersecurity:45 programming:25 problem_solving:20", "advanced", 8, "paid", "en",
   "Common web vulnerability classes, secure coding practice and hands-on exploitation labs.",
   "أصناف الثغرات الشائعة في الويب وممارسات البرمجة الآمنة ومختبرات تطبيقية للاستغلال.")
# ---- networking ------------------------------------------------------------
CO("ccna", "Cisco CCNA: Networking Essentials", "أساسيات الشبكات CCNA", "Cisco", "global",
   "networking:55 systems_design:20", "intermediate", 20, "free", "en",
   "Routing, switching, addressing and troubleshooting — the industry standard entry point.",
   "التوجيه والتبديل والعنونة واستكشاف الأعطال — المدخل المعياري في هذا المجال.")
CO("network_fundamentals_ar", "Computer Networks Fundamentals (Arabic)", "أساسيات شبكات الحاسوب", "Rwaq", "global",
   "networking:45", "beginner", 6, "free", "ar",
   "The OSI model, protocols and basic network configuration taught in Arabic.",
   "نموذج OSI والبروتوكولات وإعدادات الشبكة الأساسية مشروحة بالعربية.")
CO("wireless_5g", "Wireless and 5G Networks", "الشبكات اللاسلكية والجيل الخامس", "edX", "global",
   "networking:45 electronics:25", "advanced", 8, "paid", "en",
   "Radio access, spectrum and mobile core architecture for modern telecom networks.",
   "الوصول الراديوي والطيف الترددي وبنية النواة المتنقلة لشبكات الاتصالات الحديثة.")

# ---- cloud_infrastructure --------------------------------------------------
CO("aws_cloud_practitioner", "AWS Cloud Practitioner Essentials", "أساسيات الحوسبة السحابية AWS", "Coursera", "global",
   "cloud_infrastructure:45 systems_design:20", "beginner", 6, "free", "en",
   "Cloud service models, core AWS services, pricing and the shared-responsibility model.",
   "نماذج الخدمات السحابية وخدمات AWS الأساسية والتسعير ونموذج المسؤولية المشتركة.")
CO("azure_fundamentals", "Microsoft Azure Fundamentals", "أساسيات مايكروسوفت أزور", "Microsoft", "global",
   "cloud_infrastructure:45 networking:20", "beginner", 5, "free", "both",
   "Compute, storage, identity and governance on Azure, with free hands-on sandboxes.",
   "الحوسبة والتخزين والهوية والحوكمة في أزور، مع بيئات تجريبية مجانية.")
CO("k8s_docker", "Docker and Kubernetes in Practice", "دوكر وكوبرنيتيس عملياً", "Udacity", "global",
   "cloud_infrastructure:50 systems_design:30 programming:20", "advanced", 8, "paid", "en",
   "Containerising applications and running them reliably on an orchestrated cluster.",
   "تحويل التطبيقات إلى حاويات وتشغيلها بموثوقية على عنقود مُدار.")
# ---- systems_design --------------------------------------------------------
CO("software_architecture", "Software Architecture and Design", "معمارية البرمجيات وتصميمها", "edX", "global",
   "systems_design:50 programming:25 writing_docs:20", "advanced", 10, "paid", "en",
   "Architectural styles, trade-off analysis and documenting decisions for large systems.",
   "الأنماط المعمارية وتحليل المفاضلات وتوثيق القرارات في الأنظمة الكبيرة.")
CO("system_design_interview", "Scalable System Design", "تصميم الأنظمة القابلة للتوسّع", "Coursera", "global",
   "systems_design:45 cloud_infrastructure:25", "advanced", 6, "paid", "en",
   "Caching, sharding, queues and consistency choices behind high-traffic services.",
   "التخزين المؤقت والتجزئة والطوابير وخيارات الاتساق خلف الخدمات عالية الحمل.")
CO("db_design", "Database Design and Modelling", "تصميم قواعد البيانات ونمذجتها", "Rwaq", "global",
   "systems_design:35 data_analysis:25 programming:20", "intermediate", 6, "free", "ar",
   "Normalisation, relational modelling and indexing taught in Arabic with SQL practice.",
   "التطبيع والنمذجة العلائقية والفهرسة بالعربية مع تمارين على SQL.")
# ---- electronics -----------------------------------------------------------
CO("circuits_basics", "Electric Circuits Fundamentals", "أساسيات الدوائر الكهربائية", "edX", "global",
   "electronics:50 physics_reasoning:30 mathematics:20", "beginner", 10, "free", "en",
   "DC and AC circuit analysis, components and measurement with simulated laboratories.",
   "تحليل دوائر التيار المستمر والمتردد والمكوّنات والقياس عبر مختبرات محاكاة.")
CO("embedded_arduino", "Embedded Systems with Arduino", "الأنظمة المدمجة باستخدام أردوينو", "Udacity", "global",
   "electronics:45 programming:35 problem_solving:25", "intermediate", 8, "paid", "both",
   "Microcontrollers, sensors and actuators built into working hardware projects.",
   "المتحكّمات الدقيقة والمستشعرات والمشغّلات ضمن مشاريع عتاد عاملة.")
CO("control_systems", "Control Systems Engineering", "هندسة أنظمة التحكم", "Coursera", "global",
   "electronics:40 mathematics:35 physics_reasoning:30", "advanced", 10, "paid", "en",
   "Feedback control, stability and PID tuning for industrial and aerospace systems.",
   "التحكم بالتغذية الراجعة والاستقرار وضبط PID لأنظمة صناعية وفضائية.")
# ---- mechanical_design -----------------------------------------------------
CO("cad_solidworks", "Mechanical CAD with SolidWorks", "التصميم الميكانيكي باستخدام سوليدووركس", "Coursera", "global",
   "mechanical_design:50 attention_detail:25 visual_design:15", "beginner", 8, "paid", "en",
   "Parametric part and assembly modelling with proper engineering drawing practice.",
   "نمذجة القطع والتجميعات بارامترياً مع ممارسة سليمة للرسم الهندسي.")
CO("materials_science", "Materials Science for Engineers", "علم المواد للمهندسين", "edX", "global",
   "mechanical_design:35 chemistry_lab:30 physics_reasoning:30", "intermediate", 10, "free", "en",
   "Why materials fail: stress, fatigue, corrosion and selection for desert conditions.",
   "لماذا تفشل المواد: الإجهاد والكلال والتآكل واختيار المواد لظروف صحراوية.")
CO("fea_intro", "Introduction to Finite Element Analysis", "مقدمة في تحليل العناصر المحدودة", "Udacity", "global",
   "mechanical_design:45 mathematics:35 physics_reasoning:30", "advanced", 6, "paid", "en",
   "Meshing, boundary conditions and interpreting simulation results without trusting them blindly.",
   "التشبيك والشروط الحدّية وتفسير نتائج المحاكاة دون الوثوق بها عمياً.")
# ---- civil_structures ------------------------------------------------------
CO("structural_analysis", "Structural Analysis I", "تحليل الإنشاءات ١", "edX", "global",
   "civil_structures:50 physics_reasoning:35 mathematics:30", "intermediate", 12, "free", "en",
   "Beams, frames and trusses: internal forces, deflection and load-path reasoning.",
   "الجسور والإطارات والجمالونات: القوى الداخلية والانحراف وتتبّع مسار الأحمال.")
CO("concrete_design", "Reinforced Concrete Design", "تصميم الخرسانة المسلحة", "Coursera", "global",
   "civil_structures:50 mathematics:25 attention_detail:25", "advanced", 10, "paid", "en",
   "Code-based design of slabs, beams and columns for regional construction practice.",
   "تصميم البلاطات والجسور والأعمدة وفق الأكواد بما يناسب ممارسات البناء الإقليمية.")
CO("bim_revit", "BIM and Revit for Construction", "نمذجة معلومات البناء وريفيت", "HCT", "uae",
   "civil_structures:35 visual_design:30 project_management:25", "intermediate", 8, "paid", "both",
   "Building information modelling as used by UAE consultants and main contractors.",
   "نمذجة معلومات البناء كما تُستخدم لدى الاستشاريين والمقاولين الرئيسيين في الإمارات.")
# ---- energy_systems --------------------------------------------------------
CO("solar_pv_design", "Solar PV System Design", "تصميم أنظمة الطاقة الشمسية", "Coursera", "global",
   "energy_systems:55 sustainability:30 physics_reasoning:25", "intermediate", 8, "paid", "en",
   "Sizing, yield modelling and grid connection for photovoltaic plants in hot climates.",
   "تحديد الأحجام ونمذجة الإنتاجية والربط بالشبكة لمحطات كهروضوئية في المناخات الحارة.")
CO("power_systems", "Electric Power Systems", "أنظمة القدرة الكهربائية", "edX", "global",
   "energy_systems:50 electronics:30 mathematics:25", "advanced", 10, "free", "en",
   "Generation, transmission and grid stability, including renewable integration challenges.",
   "التوليد والنقل واستقرار الشبكة، بما في ذلك تحديات دمج مصادر الطاقة المتجددة.")
CO("energy_efficiency_uae", "Energy Efficiency in Buildings", "كفاءة الطاقة في المباني", "Abu Dhabi School of Government", "uae",
   "energy_systems:35 sustainability:45", "beginner", 4, "free", "both",
   "Practical demand-reduction measures for buildings operating under Gulf cooling loads.",
   "إجراءات عملية لخفض الطلب في المباني العاملة تحت أحمال التبريد الخليجية.")
# ---- sustainability --------------------------------------------------------
CO("carbon_accounting", "Carbon Accounting and Reporting", "حساب الكربون وإعداد التقارير", "Coursera", "global",
   "sustainability:55 data_analysis:25 writing_docs:20", "intermediate", 6, "paid", "en",
   "Measuring scope 1, 2 and 3 emissions and producing a report an auditor accepts.",
   "قياس الانبعاثات ضمن النطاقات الأول والثاني والثالث وإعداد تقرير يقبله المدقّق.")
CO("sustainable_dev_ar", "Sustainable Development (Arabic)", "التنمية المستدامة", "Edraak", "global",
   "sustainability:45 economics:20 law_policy:20", "beginner", 5, "free", "ar",
   "The environmental, social and economic pillars of sustainability, taught in Arabic.",
   "الركائز البيئية والاجتماعية والاقتصادية للاستدامة، مشروحة بالعربية.")
CO("circular_economy", "Circular Economy and Waste", "الاقتصاد الدائري وإدارة النفايات", "edX", "global",
   "sustainability:45 business_strategy:25", "intermediate", 6, "free", "en",
   "Designing products and supply chains that keep materials in use rather than in landfill.",
   "تصميم المنتجات وسلاسل الإمداد لإبقاء المواد في الاستخدام بدل مكبّات النفايات.")
# ---- project_management ----------------------------------------------------
CO("google_pm", "Google Project Management Certificate", "شهادة إدارة المشاريع من جوجل", "Google", "global",
   "project_management:55 leadership:25 writing_docs:20", "beginner", 24, "paid", "en",
   "Planning, risk, stakeholders and agile delivery, taught through realistic project artefacts.",
   "التخطيط والمخاطر وأصحاب المصلحة والتسليم الرشيق، عبر مخرجات مشاريع واقعية.")
CO("pmp_prep_ar", "PMP Preparation (Arabic)", "التحضير لشهادة PMP", "Rwaq", "global",
   "project_management:50 leadership:20", "advanced", 10, "paid", "ar",
   "Full coverage of the project management body of knowledge in Arabic, with mock exams.",
   "تغطية كاملة لدليل معرفة إدارة المشاريع بالعربية مع اختبارات تجريبية.")
CO("agile_scrum", "Agile and Scrum in Practice", "الأجايل والسكرَم عملياً", "edX", "global",
   "project_management:45 teamwork:30 leadership:20", "intermediate", 4, "free", "en",
   "Sprints, backlogs and the facilitation habits that make agile teams actually deliver.",
   "السباقات وقوائم الأعمال وعادات التيسير التي تجعل الفرق الرشيقة تُنجز فعلاً.")
# ---- business_strategy -----------------------------------------------------
CO("business_strategy_intro", "Foundations of Business Strategy", "أسس استراتيجية الأعمال", "Coursera", "global",
   "business_strategy:55 economics:25", "intermediate", 6, "free", "en",
   "Competitive analysis, positioning and how firms build a defensible advantage.",
   "تحليل المنافسة والتموضع وكيف تبني الشركات ميزة قابلة للدفاع عنها.")
CO("innovation_management", "Innovation and Growth Management", "إدارة الابتكار والنمو", "edX", "global",
   "business_strategy:45 creativity:30 leadership:25", "advanced", 8, "paid", "en",
   "Portfolio thinking, experimentation and scaling new products inside established firms.",
   "التفكير بمنطق المحفظة والتجريب وتوسيع المنتجات الجديدة داخل الشركات القائمة.")
CO("gov_strategy_uae", "Strategic Planning in Government", "التخطيط الاستراتيجي في العمل الحكومي", "Abu Dhabi School of Government", "uae",
   "business_strategy:45 law_policy:30 project_management:25", "intermediate", 5, "free", "both",
   "Translating national strategy into departmental objectives and measurable indicators.",
   "ترجمة الاستراتيجية الوطنية إلى أهداف على مستوى الدوائر ومؤشرات قابلة للقياس.")

# ---- finance_accounting ----------------------------------------------------
CO("financial_accounting", "Financial Accounting Fundamentals", "أساسيات المحاسبة المالية", "Coursera", "global",
   "finance_accounting:55 attention_detail:25", "beginner", 8, "free", "en",
   "The three financial statements and how transactions flow through them.",
   "القوائم المالية الثلاث وكيف تنتقل العمليات المحاسبية خلالها.")
CO("financial_modelling", "Financial Modelling and Valuation", "النمذجة المالية والتقييم", "edX", "global",
   "finance_accounting:50 data_analysis:30 mathematics:25", "advanced", 8, "paid", "en",
   "Building a three-statement model and valuing a company with DCF and comparables.",
   "بناء نموذج ثلاثي القوائم وتقييم الشركة بالتدفقات النقدية المخصومة والنظائر.")
CO("islamic_finance", "Principles of Islamic Finance", "مبادئ التمويل الإسلامي", "Emirates Institute of Finance", "uae",
   "finance_accounting:45 law_policy:25 economics:20", "intermediate", 6, "free", "both",
   "Sharia-compliant instruments and how they differ structurally from conventional products.",
   "الأدوات المتوافقة مع الشريعة وكيف تختلف هيكلياً عن المنتجات التقليدية.")
# ---- economics -------------------------------------------------------------
CO("micro_econ", "Principles of Microeconomics", "مبادئ الاقتصاد الجزئي", "edX", "global",
   "economics:55 mathematics:20", "beginner", 10, "free", "en",
   "Supply, demand, market structure and the logic behind everyday pricing decisions.",
   "العرض والطلب وهياكل السوق والمنطق وراء قرارات التسعير اليومية.")
CO("macro_econ_ar", "Macroeconomics (Arabic)", "الاقتصاد الكلي", "Edraak", "global",
   "economics:50 data_analysis:20", "intermediate", 6, "free", "ar",
   "Growth, inflation, monetary and fiscal policy explained in Arabic with Gulf examples.",
   "النمو والتضخم والسياستان النقدية والمالية بالعربية مع أمثلة خليجية.")
CO("econometrics", "Applied Econometrics", "الاقتصاد القياسي التطبيقي", "Coursera", "global",
   "economics:45 statistics:40 data_analysis:30", "advanced", 8, "paid", "en",
   "Regression for causal questions, with attention to what the data cannot tell you.",
   "الانحدار للأسئلة السببية، مع الانتباه إلى ما لا تستطيع البيانات إخبارك به.")
# ---- marketing_comm --------------------------------------------------------
CO("digital_marketing_google", "Fundamentals of Digital Marketing", "أساسيات التسويق الرقمي", "Google", "global",
   "marketing_comm:50 data_analysis:20 creativity:20", "beginner", 5, "free", "both",
   "Search, social, email and analytics as one coherent customer-acquisition system.",
   "البحث ومنصّات التواصل والبريد والتحليلات كمنظومة متكاملة لجذب العملاء.")
CO("brand_storytelling", "Brand Strategy and Storytelling", "استراتيجية العلامة وسرد قصتها", "edX", "global",
   "marketing_comm:45 creativity:35 writing_docs:25", "intermediate", 6, "paid", "en",
   "Positioning a brand and building a narrative that survives contact with an audience.",
   "تموضع العلامة التجارية وبناء سردية تصمد عند مواجهة الجمهور.")
CO("social_media_ar", "Social Media Marketing (Arabic)", "التسويق عبر وسائل التواصل الاجتماعي", "Rwaq", "global",
   "marketing_comm:45 arabic_language:25 creativity:25", "beginner", 4, "free", "ar",
   "Content planning, paid campaigns and analytics for Arabic-speaking audiences.",
   "تخطيط المحتوى والحملات المدفوعة والتحليلات لجمهور ناطق بالعربية.")
# ---- writing_docs ----------------------------------------------------------
CO("technical_writing", "Technical Writing", "الكتابة التقنية", "Google", "global",
   "writing_docs:55 attention_detail:25", "beginner", 3, "free", "en",
   "Writing documentation people can follow: structure, clarity and ruthless editing.",
   "كتابة توثيق يمكن اتّباعه: البنية والوضوح والتحرير الحازم.")
CO("academic_writing_ar", "Academic Writing in Arabic", "الكتابة الأكاديمية بالعربية", "Edraak", "global",
   "writing_docs:50 arabic_language:40 research_methods:20", "intermediate", 6, "free", "ar",
   "Structuring a research paper in formal Arabic, with citation and argument discipline.",
   "بناء الورقة البحثية بالعربية الفصحى مع انضباط في التوثيق وبناء الحجّة.")
CO("business_report_writing", "Business and Policy Report Writing", "كتابة تقارير الأعمال والسياسات", "Abu Dhabi School of Government", "uae",
   "writing_docs:50 law_policy:25 public_speaking:15", "intermediate", 4, "free", "both",
   "Producing briefs and reports that a busy decision-maker can act on in ten minutes.",
   "إعداد مذكرات وتقارير يستطيع صانع قرار مشغول التصرّف بناءً عليها في عشر دقائق.")
# ---- public_speaking -------------------------------------------------------
CO("public_speaking_intro", "Introduction to Public Speaking", "مقدمة في التحدّث أمام الجمهور", "Coursera", "global",
   "public_speaking:55 writing_docs:20", "beginner", 5, "free", "en",
   "Structure, delivery and nerves — practised through recorded and peer-reviewed talks.",
   "البناء والإلقاء والتعامل مع التوتر — بالتدريب عبر عروض مسجّلة ومراجعة الأقران.")
CO("presentation_ar", "Effective Presentation Skills (Arabic)", "مهارات العرض الفعّال", "Rwaq", "global",
   "public_speaking:50 arabic_language:30 visual_design:20", "beginner", 3, "free", "ar",
   "Designing and delivering a persuasive presentation in Modern Standard Arabic.",
   "تصميم عرض مقنع وإلقاؤه بالعربية الفصحى.")
CO("negotiation", "Negotiation and Persuasion", "التفاوض والإقناع", "edX", "global",
   "public_speaking:45 leadership:30 business_strategy:20", "intermediate", 5, "paid", "en",
   "Preparation, framing and concession strategy in commercial and workplace negotiations.",
   "التحضير والتأطير واستراتيجية التنازلات في المفاوضات التجارية والمهنية.")
# ---- arabic_language -------------------------------------------------------
CO("arabic_grammar", "Advanced Arabic Grammar", "النحو العربي المتقدم", "Edraak", "global",
   "arabic_language:55 writing_docs:25", "advanced", 8, "free", "ar",
   "Syntax and morphology at the level expected of professional Arabic writing.",
   "النحو والصرف بالمستوى المتوقّع في الكتابة العربية المهنية.")
CO("arabic_media_language", "Media Arabic", "لغة الإعلام العربية", "Rwaq", "global",
   "arabic_language:45 marketing_comm:25 writing_docs:25", "intermediate", 5, "free", "ar",
   "The register, vocabulary and conventions of news and institutional Arabic.",
   "المستوى اللغوي والمفردات والأعراف في اللغة الإخبارية والمؤسسية العربية.")
CO("translation_ar_en", "Arabic-English Translation", "الترجمة من العربية إلى الإنجليزية", "Edraak", "global",
   "arabic_language:40 english_language:40 writing_docs:25", "advanced", 8, "paid", "both",
   "Practical translation between the two languages without losing register or meaning.",
   "ترجمة عملية بين اللغتين دون فقدان المستوى اللغوي أو المعنى.")
# ---- english_language ------------------------------------------------------
CO("ielts_prep", "IELTS Academic Preparation", "التحضير لاختبار الآيلتس الأكاديمي", "HCT", "uae",
   "english_language:55 writing_docs:25", "intermediate", 8, "paid", "both",
   "The four IELTS skills with band-descriptor practice and timed mock tests.",
   "مهارات الآيلتس الأربع مع تدريب على معايير النطاقات واختبارات محاكاة موقوتة.")
CO("emsat_english_prep", "EmSAT English Preparation", "التحضير لاختبار إمسات إنجليزي", "HCT", "uae",
   "english_language:45 attention_detail:20", "beginner", 6, "free", "both",
   "Reading, grammar and vocabulary practice mapped to the EmSAT English test format.",
   "تدريب على القراءة والقواعد والمفردات وفق صيغة اختبار إمسات في الإنجليزية.")
CO("business_english", "English for Professional Communication", "الإنجليزية للتواصل المهني", "Coursera", "global",
   "english_language:50 writing_docs:30 public_speaking:25", "intermediate", 6, "free", "en",
   "Emails, meetings and presentations in the English used in Gulf workplaces.",
   "الرسائل والاجتماعات والعروض بالإنجليزية المستخدمة في بيئات العمل الخليجية.")
# ---- teamwork --------------------------------------------------------------
CO("teamwork_collab", "Teamwork and Collaboration Skills", "مهارات العمل الجماعي والتعاون", "edX", "global",
   "teamwork:55 leadership:20", "beginner", 4, "free", "en",
   "Roles, conflict and feedback in teams, practised through structured group tasks.",
   "الأدوار والخلافات والتغذية الراجعة في الفرق، بالتدريب عبر مهام جماعية منظّمة.")
CO("remote_collaboration", "Collaborating in Distributed Teams", "التعاون في الفرق الموزّعة", "Microsoft", "global",
   "teamwork:45 writing_docs:25 project_management:20", "beginner", 3, "free", "both",
   "Working well across time zones with written communication and shared tooling.",
   "العمل بكفاءة عبر المناطق الزمنية بالاعتماد على التواصل المكتوب والأدوات المشتركة.")
CO("emotional_intelligence", "Emotional Intelligence at Work", "الذكاء العاطفي في بيئة العمل", "Coursera", "global",
   "teamwork:45 leadership:30 customer_service:20", "intermediate", 4, "free", "both",
   "Self-awareness, empathy and handling difficult conversations professionally.",
   "الوعي بالذات والتعاطف وإدارة المحادثات الصعبة باحترافية.")
# ---- leadership ------------------------------------------------------------
CO("leading_teams", "Leading People and Teams", "قيادة الأفراد والفرق", "Coursera", "global",
   "leadership:55 teamwork:30 public_speaking:20", "intermediate", 8, "paid", "en",
   "Motivation, delegation and performance conversations for first-time managers.",
   "التحفيز والتفويض ومحادثات الأداء للمديرين الجدد.")
CO("gov_leadership_uae", "Public Sector Leadership Programme", "برنامج القيادة في القطاع العام", "Abu Dhabi School of Government", "uae",
   "leadership:50 law_policy:25 business_strategy:25", "advanced", 8, "free", "both",
   "Leading change inside government entities, with UAE public-service case studies.",
   "قيادة التغيير داخل الجهات الحكومية، مع دراسات حالة من الخدمة العامة الإماراتية.")
CO("nafis_career_readiness", "Career Readiness Programme", "برنامج الجاهزية الوظيفية", "NAFIS", "uae",
   "leadership:30 public_speaking:30 teamwork:30 customer_service:25", "beginner", 6, "free", "both",
   "Interview technique, workplace expectations and professional conduct for new graduates.",
   "مهارات المقابلات وتوقّعات بيئة العمل والسلوك المهني للخريجين الجدد.")

# ---- creativity ------------------------------------------------------------
CO("design_thinking", "Design Thinking for Innovation", "التفكير التصميمي للابتكار", "Coursera", "global",
   "creativity:55 problem_solving:30 visual_design:20", "beginner", 5, "free", "en",
   "Empathy, ideation and prototyping used to solve problems people actually have.",
   "التعاطف وتوليد الأفكار والنمذجة الأولية لحل مشكلات حقيقية يعيشها الناس.")
CO("creative_problem_ar", "Creative Thinking Skills (Arabic)", "مهارات التفكير الإبداعي", "Edraak", "global",
   "creativity:50 problem_solving:30", "beginner", 4, "free", "ar",
   "Structured ideation techniques and breaking fixed thinking patterns, in Arabic.",
   "تقنيات منظّمة لتوليد الأفكار وكسر أنماط التفكير الجامدة، بالعربية.")
CO("storytelling_media", "Visual Storytelling", "السرد البصري", "edX", "global",
   "creativity:45 visual_design:35 marketing_comm:25", "intermediate", 5, "paid", "en",
   "Shaping narrative through image, sequence and pacing across visual media.",
   "تشكيل السرد عبر الصورة والتسلسل والإيقاع في الوسائط البصرية.")
# ---- visual_design ---------------------------------------------------------
CO("ux_design_google", "Google UX Design Certificate", "شهادة تصميم تجربة المستخدم من جوجل", "Google", "global",
   "visual_design:55 creativity:30 research_methods:25", "beginner", 24, "paid", "en",
   "Research, wireframing, prototyping and usability testing across three portfolio projects.",
   "البحث والتخطيط الهيكلي والنمذجة واختبار قابلية الاستخدام عبر ثلاثة مشاريع لملف الأعمال.")
CO("figma_ui", "Interface Design with Figma", "تصميم الواجهات باستخدام فيغما", "Udacity", "global",
   "visual_design:50 creativity:25", "beginner", 4, "free", "both",
   "Components, layout systems and building a design system that supports RTL layouts.",
   "المكوّنات وأنظمة التخطيط وبناء نظام تصميم يدعم الاتجاه من اليمين إلى اليسار.")
CO("arabic_typography", "Arabic Typography and Layout", "الطباعة والتنسيق بالخط العربي", "Rwaq", "global",
   "visual_design:45 arabic_language:30 creativity:25", "intermediate", 5, "free", "ar",
   "Type selection, spacing and bilingual composition for Arabic-first design work.",
   "اختيار الخطوط والتباعد والتركيب ثنائي اللغة في التصميم العربي أولاً.")
# ---- teaching --------------------------------------------------------------
CO("teaching_foundations", "Foundations of Teaching and Learning", "أسس التعليم والتعلّم", "Coursera", "global",
   "teaching:55 public_speaking:25 writing_docs:20", "beginner", 8, "free", "en",
   "How learning works and how to plan a lesson that produces measurable understanding.",
   "كيف يحدث التعلّم وكيف تُخطَّط حصّة تنتج فهماً قابلاً للقياس.")
CO("assessment_design", "Assessment and Feedback Design", "تصميم التقويم والتغذية الراجعة", "edX", "global",
   "teaching:50 attention_detail:25 writing_docs:25", "intermediate", 5, "paid", "en",
   "Writing assessments that measure what you intended, and feedback students act on.",
   "صياغة تقويمات تقيس ما قُصد قياسه، وتغذية راجعة يتصرّف الطلبة بناءً عليها.")
CO("edtech_classroom_ar", "Educational Technology in the Classroom (Arabic)", "تقنيات التعليم في الصف", "Edraak", "global",
   "teaching:45 visual_design:20 arabic_language:25", "beginner", 4, "free", "ar",
   "Practical digital tools for Arabic-medium classrooms and blended teaching.",
   "أدوات رقمية عملية للصفوف الناطقة بالعربية والتعليم المدمج.")
# ---- clinical_skills -------------------------------------------------------
CO("first_aid_bls", "First Aid and Basic Life Support", "الإسعافات الأولية ودعم الحياة الأساسي", "IBM SkillsBuild", "global",
   "clinical_skills:45 attention_detail:25 teamwork:20", "beginner", 2, "free", "both",
   "Certified basic life support technique, including CPR and emergency assessment.",
   "تقنيات دعم الحياة الأساسي المعتمدة، وتشمل الإنعاش القلبي الرئوي وتقييم الطوارئ.")
CO("clinical_reasoning", "Introduction to Clinical Reasoning", "مقدمة في الاستدلال السريري", "Coursera", "global",
   "clinical_skills:55 life_sciences:30 problem_solving:25", "advanced", 8, "paid", "en",
   "Working from symptoms to differential diagnosis using structured clinical thinking.",
   "الانتقال من الأعراض إلى التشخيص التفريقي عبر تفكير سريري منظّم.")
CO("patient_communication", "Patient Communication Skills", "مهارات التواصل مع المرضى", "edX", "global",
   "clinical_skills:35 customer_service:35 arabic_language:25", "intermediate", 4, "free", "both",
   "Explaining a diagnosis, breaking difficult news and consulting across languages.",
   "شرح التشخيص ونقل الأخبار الصعبة والتواصل عبر لغات مختلفة.")
# ---- customer_service ------------------------------------------------------
CO("customer_experience", "Customer Experience Management", "إدارة تجربة العملاء", "Coursera", "global",
   "customer_service:55 data_analysis:20 marketing_comm:20", "intermediate", 5, "paid", "en",
   "Journey mapping, service recovery and measuring satisfaction that actually predicts loyalty.",
   "رسم رحلة العميل واستعادة الخدمة وقياس رضا يتنبأ فعلاً بالولاء.")
CO("hospitality_service_uae", "Guest Service Excellence", "التميّز في خدمة الضيوف", "HCT", "uae",
   "customer_service:50 english_language:25 teamwork:25", "beginner", 4, "free", "both",
   "Service standards for UAE hospitality, including cultural expectations of guests.",
   "معايير الخدمة في ضيافة الإمارات، بما فيها التوقّعات الثقافية للضيوف.")
CO("call_center_ar", "Professional Client Handling (Arabic)", "التعامل الاحترافي مع المتعاملين", "Rwaq", "global",
   "customer_service:45 arabic_language:30 public_speaking:20", "beginner", 3, "free", "ar",
   "Handling complaints and difficult callers professionally in Arabic.",
   "التعامل مع الشكاوى والمتصلين الصعبين باحترافية بالعربية.")
# ---- logistics_ops ---------------------------------------------------------
CO("supply_chain_intro", "Supply Chain Management Fundamentals", "أساسيات إدارة سلاسل الإمداد", "edX", "global",
   "logistics_ops:55 data_analysis:25 business_strategy:20", "beginner", 8, "free", "en",
   "Sourcing, inventory, transport and the trade-offs between cost and service level.",
   "التوريد والمخزون والنقل والمفاضلات بين التكلفة ومستوى الخدمة.")
CO("logistics_analytics", "Logistics Analytics and Optimisation", "تحليلات وتحسين اللوجستيات", "Coursera", "global",
   "logistics_ops:50 data_analysis:40 mathematics:25", "advanced", 6, "paid", "en",
   "Forecasting, routing and network design using optimisation and simulation tools.",
   "التنبؤ وتحديد المسارات وتصميم الشبكات باستخدام أدوات التحسين والمحاكاة.")
CO("ports_trade_uae", "Ports, Free Zones and Trade Operations", "الموانئ والمناطق الحرة وعمليات التجارة", "HCT", "uae",
   "logistics_ops:50 law_policy:25 english_language:20", "intermediate", 5, "free", "both",
   "How goods actually move through UAE ports, free zones and customs procedures.",
   "كيف تتحرك البضائع فعلياً عبر موانئ الإمارات والمناطق الحرة والإجراءات الجمركية.")
# ---- law_policy ------------------------------------------------------------
CO("intro_law_ar", "Introduction to Law (Arabic)", "مدخل إلى القانون", "Edraak", "global",
   "law_policy:55 writing_docs:25 arabic_language:25", "beginner", 6, "free", "ar",
   "Legal systems, sources of law and how a statute is read and applied, in Arabic.",
   "الأنظمة القانونية ومصادر القانون وكيفية قراءة النص التشريعي وتطبيقه، بالعربية.")
CO("public_policy_analysis", "Public Policy Analysis", "تحليل السياسات العامة", "edX", "global",
   "law_policy:50 research_methods:35 economics:25", "advanced", 8, "paid", "en",
   "Framing a policy problem, comparing options and writing a defensible recommendation.",
   "تأطير مشكلة السياسة ومقارنة الخيارات وكتابة توصية قابلة للدفاع عنها.")
CO("data_protection_law", "Data Protection and Privacy Law", "قانون حماية البيانات والخصوصية", "Coursera", "global",
   "law_policy:45 cybersecurity:25 writing_docs:20", "intermediate", 4, "free", "en",
   "Personal-data obligations, consent and cross-border transfer rules for organisations.",
   "التزامات البيانات الشخصية والموافقة وقواعد النقل عبر الحدود للمؤسسات.")
# ---- research_methods ------------------------------------------------------
CO("research_methods_intro", "Research Methods and Design", "مناهج البحث وتصميمه", "Coursera", "global",
   "research_methods:55 statistics:25 writing_docs:25", "intermediate", 8, "free", "en",
   "Question formulation, sampling, validity and choosing a design that answers the question.",
   "صياغة السؤال وأخذ العيّنات والصدق واختيار تصميم يجيب عن السؤال فعلاً.")
CO("scientific_writing_ar", "Scientific Research Skills (Arabic)", "مهارات البحث العلمي", "Rwaq", "global",
   "research_methods:50 writing_docs:35 arabic_language:25", "beginner", 5, "free", "ar",
   "Literature review, methodology and referencing for Arabic-language research work.",
   "مراجعة الأدبيات والمنهجية والتوثيق للأعمال البحثية باللغة العربية.")
CO("survey_design", "Survey Design and Field Data Collection", "تصميم المسوح وجمع البيانات الميدانية", "edX", "global",
   "research_methods:45 statistics:30 attention_detail:25", "advanced", 5, "paid", "en",
   "Writing unbiased questions, sampling frames and managing real field data quality.",
   "صياغة أسئلة غير منحازة وأُطر المعاينة وإدارة جودة البيانات الميدانية.")
# ---- attention_detail ------------------------------------------------------
CO("quality_management", "Quality Management and Six Sigma", "إدارة الجودة وستة سيغما", "Coursera", "global",
   "attention_detail:50 project_management:30 statistics:30", "intermediate", 8, "paid", "en",
   "Process control, defect reduction and the statistics behind continuous improvement.",
   "ضبط العمليات وخفض العيوب والإحصاء الكامن خلف التحسين المستمر.")
CO("data_quality", "Data Quality and Validation", "جودة البيانات والتحقق منها", "Microsoft", "global",
   "attention_detail:50 data_analysis:35", "beginner", 3, "free", "both",
   "Profiling, cleaning and validating datasets before anyone builds a decision on them.",
   "توصيف البيانات وتنظيفها والتحقق منها قبل أن يبني أحد قراراً عليها.")
CO("auditing_basics", "Internal Auditing Basics", "أساسيات التدقيق الداخلي", "Emirates Institute of Finance", "uae",
   "attention_detail:50 finance_accounting:35 law_policy:25", "intermediate", 5, "free", "both",
   "Evidence, sampling and documenting an audit finding that withstands challenge.",
   "الأدلة والمعاينة وتوثيق ملاحظة تدقيقية تصمد أمام الاعتراض.")
# ---- problem_solving -------------------------------------------------------
CO("problem_solving_ds", "Algorithmic Problem Solving", "حل المشكلات الخوارزمي", "edX", "global",
   "problem_solving:55 programming:35 mathematics:25", "intermediate", 10, "free", "en",
   "Data structures and algorithm design practised on progressively harder problems.",
   "هياكل البيانات وتصميم الخوارزميات بالتدريب على مسائل متدرّجة الصعوبة.")
CO("critical_thinking_ar", "Critical Thinking (Arabic)", "التفكير الناقد", "Edraak", "global",
   "problem_solving:50 research_methods:25", "beginner", 4, "free", "ar",
   "Argument analysis, logical fallacies and evidence evaluation, taught in Arabic.",
   "تحليل الحجج والمغالطات المنطقية وتقييم الأدلة، مشروحة بالعربية.")
CO("root_cause_analysis", "Root Cause Analysis", "تحليل الأسباب الجذرية", "IBM SkillsBuild", "global",
   "problem_solving:50 attention_detail:30 project_management:20", "intermediate", 3, "free", "en",
   "Structured techniques for finding why something failed rather than what failed.",
   "تقنيات منظّمة لاكتشاف سبب الفشل لا مجرّد تحديد ما الذي فشل.")
# ---- aviation_ops ----------------------------------------------------------
CO("private_pilot_ground", "Private Pilot Ground School", "الدراسة الأرضية لرخصة الطيران الخاص", "HCT", "uae",
   "aviation_ops:55 physics_reasoning:30 english_language:25", "intermediate", 16, "paid", "en",
   "Air law, navigation, meteorology and principles of flight up to written-exam standard.",
   "قانون الجو والملاحة والأرصاد ومبادئ الطيران حتى مستوى الاختبار التحريري.")
CO("aviation_safety", "Aviation Safety and Human Factors", "سلامة الطيران والعوامل البشرية", "Coursera", "global",
   "aviation_ops:50 teamwork:30 attention_detail:35", "intermediate", 5, "free", "en",
   "Why aviation accidents happen and the crew-resource-management practices that prevent them.",
   "لماذا تقع حوادث الطيران وممارسات إدارة موارد الطاقم التي تمنعها.")
CO("airport_operations", "Airport Operations Management", "إدارة عمليات المطارات", "edX", "global",
   "aviation_ops:50 logistics_ops:30 customer_service:25", "beginner", 6, "paid", "both",
   "Ground handling, terminal flow and the coordination behind an on-time departure.",
   "الخدمات الأرضية وانسياب حركة المبنى والتنسيق الكامن خلف إقلاع في موعده.")
# ---- geospatial_gis --------------------------------------------------------
CO("gis_fundamentals", "GIS Fundamentals", "أساسيات نظم المعلومات الجغرافية", "Coursera", "global",
   "geospatial_gis:55 data_analysis:25", "beginner", 6, "free", "en",
   "Coordinate systems, spatial data and producing a map that answers a real question.",
   "أنظمة الإحداثيات والبيانات المكانية وإنتاج خريطة تجيب عن سؤال حقيقي.")
CO("remote_sensing", "Remote Sensing and Image Analysis", "الاستشعار عن بُعد وتحليل الصور", "edX", "global",
   "geospatial_gis:50 data_analysis:35 physics_reasoning:25", "advanced", 8, "paid", "en",
   "Satellite imagery, spectral indices and change detection over time series.",
   "صور الأقمار الصناعية والمؤشرات الطيفية وكشف التغيّر عبر السلاسل الزمنية.")
CO("spatial_python", "Spatial Analysis with Python", "التحليل المكاني باستخدام بايثون", "Udacity", "global",
   "geospatial_gis:50 programming:40 data_analysis:30", "advanced", 6, "paid", "en",
   "Automating geospatial workflows with open-source Python libraries.",
   "أتمتة تدفقات العمل الجغرافية المكانية باستخدام مكتبات بايثون مفتوحة المصدر.")

# --------------------------------------------------------------------------
# 6. Questionnaires
# --------------------------------------------------------------------------
# Holland RIASEC -- 30 items, 5 per type, Likert 1-5 ("does not describe me" ..
# "describes me very well").  Items are written as activity preferences, which
# is how Holland's model is normally measured.
RIASEC_ITEMS: list[tuple[str, str, str]] = [
    # Realistic
    ("R", "I enjoy repairing machines, devices or vehicles with my own hands.",
          "أستمتع بإصلاح الآلات أو الأجهزة أو المركبات بيديّ."),
    ("R", "I would rather work outdoors or on a site than at a desk all day.",
          "أفضّل العمل في الهواء الطلق أو في الموقع على الجلوس إلى مكتب طوال اليوم."),
    ("R", "I like building physical things such as models, circuits or structures.",
          "أحب بناء أشياء ملموسة مثل النماذج أو الدوائر الكهربائية أو المنشآت."),
    ("R", "I am comfortable using tools, instruments and technical equipment.",
          "أشعر بالارتياح عند استخدام الأدوات والأجهزة والمعدات التقنية."),
    ("R", "I prefer tasks with a clear physical result over abstract discussion.",
          "أفضّل المهام ذات النتيجة الملموسة على النقاشات النظرية المجردة."),
    # Investigative
    ("I", "I enjoy solving difficult problems even when no one asks me to.",
          "أستمتع بحل المسائل الصعبة حتى دون أن يطلب مني أحد ذلك."),
    ("I", "I like to understand why something works, not just that it works.",
          "أحب أن أفهم سبب عمل الشيء، لا أن يعمل فحسب."),
    ("I", "I am drawn to science, mathematics or research subjects.",
          "أنجذب إلى مواد العلوم أو الرياضيات أو البحث العلمي."),
    ("I", "I enjoy analysing data and looking for patterns in it.",
          "أستمتع بتحليل البيانات والبحث عن الأنماط فيها."),
    ("I", "I would happily spend hours investigating a question that interests me.",
          "لا أمانع قضاء ساعات في بحث سؤال يثير اهتمامي."),
    # Artistic
    ("A", "I often come up with original ideas that others had not considered.",
          "كثيراً ما تخطر لي أفكار أصيلة لم يفكر فيها الآخرون."),
    ("A", "I enjoy design, drawing, photography, writing or music.",
          "أستمتع بالتصميم أو الرسم أو التصوير أو الكتابة أو الموسيقى."),
    ("A", "I prefer work that lets me express myself rather than follow a fixed format.",
          "أفضّل العمل الذي يتيح لي التعبير عن نفسي على العمل ذي الصيغة الثابتة."),
    ("A", "I notice visual details such as colour, layout and composition.",
          "ألاحظ التفاصيل البصرية مثل اللون والتنسيق والتكوين."),
    ("A", "I like imagining new ways of presenting an idea to people.",
          "أحب تخيّل طرق جديدة لعرض فكرة ما على الناس."),
    # Social
    ("S", "I enjoy explaining things to others until they understand.",
          "أستمتع بشرح الأمور للآخرين حتى يفهموها."),
    ("S", "People often come to me when they need help or advice.",
          "كثيراً ما يلجأ إليّ الناس عندما يحتاجون مساعدة أو نصيحة."),
    ("S", "I find it rewarding to care for or support other people.",
          "أجد رضاً حقيقياً في رعاية الآخرين أو دعمهم."),
    ("S", "I work well in groups and enjoy cooperating with others.",
          "أعمل جيداً ضمن المجموعات وأستمتع بالتعاون مع الآخرين."),
    ("S", "I would like a job whose main purpose is to help people directly.",
          "أرغب في عمل يكون هدفه الأساسي مساعدة الناس بشكل مباشر."),
    # Enterprising
    ("E", "I am comfortable persuading other people to accept my point of view.",
          "أشعر بالارتياح في إقناع الآخرين بوجهة نظري."),
    ("E", "I like taking the lead when a group has to make a decision.",
          "أحب أخذ زمام المبادرة عندما يتعيّن على المجموعة اتخاذ قرار."),
    ("E", "I am interested in starting a business or a new project of my own.",
          "أهتم بتأسيس مشروع تجاري أو مشروع جديد خاص بي."),
    ("E", "I am willing to take a calculated risk for a bigger result.",
          "أنا مستعد لخوض مخاطرة محسوبة من أجل نتيجة أكبر."),
    ("E", "I enjoy negotiating, selling or presenting to an audience.",
          "أستمتع بالتفاوض أو البيع أو تقديم العروض أمام جمهور."),
    # Conventional
    ("C", "I like working with clear rules, procedures and checklists.",
          "أحب العمل وفق قواعد وإجراءات وقوائم تحقّق واضحة."),
    ("C", "I keep my files, notes and schedule well organised.",
          "أحافظ على تنظيم ملفاتي وملاحظاتي وجدولي الزمني."),
    ("C", "I notice small errors that other people overlook.",
          "ألاحظ الأخطاء الصغيرة التي يغفل عنها الآخرون."),
    ("C", "I am comfortable working with numbers, records and detailed documents.",
          "أشعر بالارتياح في التعامل مع الأرقام والسجلات والمستندات التفصيلية."),
    ("C", "I prefer a predictable, well-structured working day.",
          "أفضّل يوم عمل يمكن التنبؤ به وجيّد التنظيم."),
]

# Big Five (IPIP-style) -- 25 items, 5 per trait, some reverse scored.
BIGFIVE_ITEMS: list[tuple[str, bool, str, str]] = [
    # (trait, reverse, en, ar)
    ("O", False, "I have a vivid imagination and many ideas.",
                 "لديّ خيال واسع وأفكار كثيرة."),
    ("O", False, "I enjoy learning about subjects far outside my field.",
                 "أستمتع بالتعلّم عن مجالات بعيدة تماماً عن تخصصي."),
    ("O", False, "I like trying things I have never done before.",
                 "أحب تجربة أشياء لم أقم بها من قبل."),
    ("O", True,  "I prefer familiar routines to new experiences.",
                 "أفضّل الروتين المألوف على التجارب الجديدة."),
    ("O", False, "Abstract or philosophical questions interest me.",
                 "تثير اهتمامي الأسئلة المجرّدة أو الفلسفية."),
    ("C", False, "I complete my tasks before their deadline.",
                 "أنجز مهامي قبل موعدها النهائي."),
    ("C", False, "I plan my work carefully before starting it.",
                 "أخطّط لعملي بعناية قبل البدء فيه."),
    ("C", True,  "I often leave my belongings and work in a mess.",
                 "كثيراً ما أترك أغراضي وأعمالي في حالة فوضى."),
    ("C", False, "I pay close attention to details in what I produce.",
                 "أولي اهتماماً دقيقاً للتفاصيل فيما أنتجه."),
    ("C", True,  "I put off difficult tasks until the last moment.",
                 "أؤجّل المهام الصعبة حتى اللحظة الأخيرة."),
    ("E", False, "I feel comfortable starting a conversation with strangers.",
                 "أشعر بالارتياح في بدء حديث مع أشخاص لا أعرفهم."),
    ("E", False, "I gain energy from being around other people.",
                 "أكتسب طاقة من وجودي بين الناس."),
    ("E", True,  "I prefer to stay in the background in a group.",
                 "أفضّل البقاء في الخلفية داخل المجموعة."),
    ("E", False, "I enjoy being the person who speaks for the group.",
                 "أستمتع بأن أكون الشخص الذي يتحدث باسم المجموعة."),
    ("E", True,  "Large social gatherings tire me quickly.",
                 "تُتعبني التجمعات الاجتماعية الكبيرة بسرعة."),
    ("A", False, "I try to understand a situation from the other person's side.",
                 "أحاول فهم الموقف من وجهة نظر الطرف الآخر."),
    ("A", False, "I go out of my way to help someone in difficulty.",
                 "أبذل جهداً إضافياً لمساعدة من يمر بضائقة."),
    ("A", True,  "I am often critical of the way other people work.",
                 "كثيراً ما أنتقد طريقة عمل الآخرين."),
    ("A", False, "I prefer cooperation over competition.",
                 "أفضّل التعاون على المنافسة."),
    ("A", False, "I trust that most people mean well.",
                 "أثق بأن معظم الناس حسنو النية."),
    ("N", False, "I worry about things more than most people do.",
                 "أقلق بشأن الأمور أكثر من معظم الناس."),
    ("N", False, "I become tense before an important exam or presentation.",
                 "أشعر بالتوتر قبل اختبار مهم أو عرض تقديمي."),
    ("N", True,  "I stay calm when a plan suddenly changes.",
                 "أبقى هادئاً عندما تتغيّر الخطة فجأة."),
    ("N", False, "My mood changes quite easily.",
                 "تتغيّر حالتي المزاجية بسهولة."),
    ("N", True,  "I recover quickly after something goes wrong.",
                 "أتعافى بسرعة بعد حدوث أمر سيّئ."),
]

RIASEC_LABELS = {
    "R": ("Realistic", "الواقعي"), "I": ("Investigative", "البحثي"),
    "A": ("Artistic", "الفني"), "S": ("Social", "الاجتماعي"),
    "E": ("Enterprising", "المبادِر"), "C": ("Conventional", "التقليدي"),
}
BIGFIVE_LABELS = {
    "O": ("Openness", "الانفتاح على التجربة"),
    "C": ("Conscientiousness", "يقظة الضمير"),
    "E": ("Extraversion", "الانبساط"),
    "A": ("Agreeableness", "المقبولية"),
    "N": ("Neuroticism", "العصابية"),
}
LIKERT = [
    (1, "Strongly disagree", "لا أوافق بشدة"),
    (2, "Disagree", "لا أوافق"),
    (3, "Neutral", "محايد"),
    (4, "Agree", "أوافق"),
    (5, "Strongly agree", "أوافق بشدة"),
]


def build_questionnaires() -> tuple[dict, dict]:
    riasec = {
        "id": "riasec30",
        "name_en": "Holland RIASEC Interest Inventory (30 items)",
        "name_ar": "مقياس هولاند للميول المهنية RIASEC (٣٠ عبارة)",
        "scale": [{"value": v, "label_en": e, "label_ar": a} for v, e, a in LIKERT],
        "dimensions": [{"code": k, "name_en": v[0], "name_ar": v[1]}
                       for k, v in RIASEC_LABELS.items()],
        "items": [
            {"id": f"riasec_{i + 1:02d}", "dimension": dim, "reverse": False,
             "text_en": en, "text_ar": ar}
            for i, (dim, en, ar) in enumerate(RIASEC_ITEMS)
        ],
    }
    bigfive = {
        "id": "bigfive25",
        "name_en": "Big Five Personality Inventory (25 items)",
        "name_ar": "مقياس السمات الخمس الكبرى للشخصية (٢٥ عبارة)",
        "scale": [{"value": v, "label_en": e, "label_ar": a} for v, e, a in LIKERT],
        "dimensions": [{"code": k, "name_en": v[0], "name_ar": v[1]}
                       for k, v in BIGFIVE_LABELS.items()],
        "items": [
            {"id": f"bigfive_{i + 1:02d}", "dimension": dim, "reverse": rev,
             "text_en": en, "text_ar": ar}
            for i, (dim, rev, en, ar) in enumerate(BIGFIVE_ITEMS)
        ],
    }
    return riasec, bigfive


# --------------------------------------------------------------------------
# 7. Write the JSON catalogs
# --------------------------------------------------------------------------
def write(name: str, payload) -> None:
    path = HERE / name
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8")
    print(f"wrote {path.relative_to(HERE.parent)}  ({path.stat().st_size:,} bytes)")


def main() -> None:
    assert len(CAREERS) == 60, f"expected 60 careers, got {len(CAREERS)}"
    assert len(COURSES) == 120, f"expected 120 courses, got {len(COURSES)}"
    assert len(RIASEC_ITEMS) == 30 and len(BIGFIVE_ITEMS) == 25

    write("skills.json", [
        {"id": i, "name_en": e, "name_ar": a, "family": f} for i, e, a, f in SKILLS])
    write("sectors.json", [
        {"id": i, "name_en": e, "name_ar": a, "color": c} for i, e, a, c in SECTORS])
    write("initiatives.json", INITIATIVES)
    write("careers.json", CAREERS)
    write("courses.json", COURSES)
    riasec, bigfive = build_questionnaires()
    write("questionnaire_riasec.json", riasec)
    write("questionnaire_bigfive.json", bigfive)


if __name__ == "__main__":
    main()
