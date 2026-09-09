"""Business, finance, and the legal family v1 had no sector for."""

from v2.careers_base import C2

FIN_EN = ["banking groups", "investment and asset managers", "corporate finance departments"]
FIN_AR = ["المجموعات المصرفية", "شركات الاستثمار وإدارة الأصول", "إدارات التمويل في الشركات"]
LAW_EN = ["law firms", "corporate legal departments", "government legal affairs departments"]
LAW_AR = ["مكاتب المحاماة", "الإدارات القانونية في الشركات", "دوائر الشؤون القانونية الحكومية"]
CORP_EN = ["multinational corporates", "national holding groups", "consulting firms"]
CORP_AR = ["الشركات متعددة الجنسيات", "المجموعات القابضة الوطنية", "شركات الاستشارات"]
BIZ_SUBJ = {"math": 82, "english": 85, "social": 75, "arabic": 70, "computer_science": 65}
LAW_SUBJ = {"arabic": 88, "english": 88, "social": 85, "islamic": 78, "math": 62}
FIN_INITS = ["digital_economy_strategy", "centennial_2071", "nafis"]
LAW_INITS = ["we_the_uae_2031", "centennial_2071", "nafis"]

C2("accountant", "Accountant", "المحاسب", "finance", "very_high", (9000, 26000),
   "finance_accounting:95 attention_detail:95 data_analysis:70 writing_docs:65 "
   "english_language:72 problem_solving:65",
   "35 72 20 48 52 98", "50 94 40 62 26", BIZ_SUBJ,
   ["accounting"],
   "Records and reports an organisation's financial position accurately and on "
   "time, under rules that leave little room for interpretation.",
   "يسجّل الوضع المالي للمؤسسة ويعرضه بدقة وفي موعده، وفق قواعد لا تترك مساحة كبيرة للاجتهاد.",
   FIN_EN, FIN_AR, FIN_INITS, years=4, icon="calculator")

C2("auditor", "Auditor", "المدقّق", "finance", "very_high", (11000, 32000),
   "finance_accounting:92 attention_detail:98 law_policy:72 writing_docs:78 "
   "research_methods:75 english_language:75",
   "32 82 20 50 55 95", "58 94 42 60 24", BIZ_SUBJ,
   ["accounting", "finance"],
   "Independently checks whether financial statements tell the truth, and has to "
   "be willing to say so when they do not.",
   "يتحقق باستقلالية مما إذا كانت القوائم المالية تعبّر عن الحقيقة، وعليه أن يملك "
   "الجرأة على قول ذلك حين لا تكون كذلك.",
   FIN_EN, FIN_AR, FIN_INITS, years=4, icon="search-check")

C2("forensic_accountant", "Forensic Accountant", "المحاسب الجنائي", "finance",
   "high", (16000, 42000),
   "finance_accounting:92 research_methods:88 attention_detail:95 law_policy:80 "
   "data_analysis:82 writing_docs:80",
   "32 90 25 48 55 92", "68 92 38 55 22", BIZ_SUBJ,
   ["accounting", "criminology"],
   "Traces money through deliberately confusing records to establish what "
   "actually happened, often for use as evidence.",
   "يتتبّع الأموال عبر سجلات صُمّمت لتكون مربكة ليثبت ما جرى فعلًا، غالبًا لتقديمه كدليل.",
   FIN_EN + ["financial crime units"], FIN_AR + ["وحدات مكافحة الجرائم المالية"],
   FIN_INITS, years=5, icon="file-search")

C2("investment_banker", "Investment Banker", "المصرفي الاستثماري", "finance",
   "high", (20000, 70000),
   "finance_accounting:92 economics:85 business_strategy:88 sales_negotiation:85 "
   "attention_detail:85 english_language:85",
   "28 82 30 55 92 85", "68 90 72 45 24", BIZ_SUBJ,
   ["finance", "economics"],
   "Advises on raising capital and on mergers and acquisitions, in a role known "
   "for both its compensation and its hours.",
   "يقدّم المشورة في جمع رؤوس الأموال وفي عمليات الاندماج والاستحواذ، في مهنة تشتهر "
   "بأجورها وبساعات عملها معًا.",
   FIN_EN, FIN_AR, FIN_INITS, years=4, icon="trending-up")

C2("insurance_underwriter", "Insurance Underwriter", "مكتتب التأمين", "finance",
   "high", (12000, 32000),
   "statistics:82 finance_accounting:80 attention_detail:92 data_analysis:82 "
   "law_policy:70 problem_solving:75",
   "32 85 22 48 62 92", "58 92 42 58 24", BIZ_SUBJ,
   ["finance", "actuarial_science"],
   "Decides which risks the insurer will accept and at what price — judgement "
   "supported by data rather than replaced by it.",
   "يقرّر أي المخاطر تقبلها شركة التأمين وبأي سعر، في حكم تسنده البيانات ولا تحلّ محله.",
   FIN_EN + ["insurance groups"], FIN_AR + ["مجموعات التأمين"], FIN_INITS,
   years=4, icon="shield")

C2("islamic_banking_specialist", "Islamic Banking Specialist", "أخصائي المصرفية الإسلامية",
   "finance", "very_high", (13000, 38000),
   "finance_accounting:88 islamic_studies_skill:88 law_policy:80 arabic_language:82 "
   "attention_detail:85 english_language:75",
   "28 82 25 60 62 90", "62 90 48 66 24",
   {"math": 80, "arabic": 88, "islamic": 90, "english": 82, "social": 72},
   ["islamic_finance", "finance", "sharia_law"],
   "Structures financial products that comply with Sharia principles, which "
   "requires fluency in both finance and Islamic jurisprudence.",
   "يهيكل المنتجات المالية المتوافقة مع أحكام الشريعة، وهو ما يتطلب تمكّنًا من "
   "التمويل والفقه الإسلامي معًا.",
   FIN_EN, FIN_AR, FIN_INITS, years=4, icon="landmark")

C2("economist", "Economist", "الاقتصادي", "finance", "moderate", (16000, 45000),
   "economics:98 statistics:88 data_analysis:88 research_methods:88 "
   "writing_docs:82 law_policy:72",
   "25 95 35 58 55 82", "82 88 42 60 24", BIZ_SUBJ,
   ["economics", "statistics"],
   "Analyses how markets and policy interact, and produces the forecasts that "
   "governments and banks plan against.",
   "يحلّل تفاعل الأسواق مع السياسات، وينتج التوقعات التي تخطط على أساسها الحكومات والمصارف.",
   FIN_EN + ["central banking and statistics authorities"],
   FIN_AR + ["هيئات المصرف المركزي والإحصاء"], FIN_INITS, years=6, icon="line-chart")

C2("management_consultant", "Management Consultant", "المستشار الإداري",
   "entrepreneurship", "high", (18000, 55000),
   "business_strategy:95 data_analysis:82 public_speaking:85 writing_docs:85 "
   "problem_solving:88 leadership:78",
   "28 85 45 65 92 78", "80 88 78 58 22", BIZ_SUBJ,
   ["business_administration", "economics"],
   "Is brought in to diagnose an organisational problem and recommend a change, "
   "then to persuade people to accept it.",
   "يُستقدم لتشخيص مشكلة تنظيمية واقتراح تغيير، ثم لإقناع الناس بقبوله.",
   CORP_EN, CORP_AR, ["centennial_2071", "digital_economy_strategy", "nafis"],
   years=4, icon="presentation")

C2("hr_specialist", "Human Resources Specialist", "أخصائي الموارد البشرية",
   "entrepreneurship", "very_high", (10000, 28000),
   "hr_people:95 law_policy:75 teamwork:85 writing_docs:75 counselling:70 "
   "arabic_language:75",
   "25 68 32 88 72 85", "60 88 68 82 26", BIZ_SUBJ,
   ["human_resources", "business_administration", "psychology"],
   "Handles recruitment, employment law and the people side of an organisation — "
   "including Emiratisation targets and workforce planning.",
   "يتولى التوظيف وقانون العمل والجانب البشري في المؤسسة، بما يشمل مستهدفات التوطين "
   "وتخطيط القوى العاملة.",
   CORP_EN, CORP_AR, ["nafis", "we_the_uae_2031", "centennial_2071"], years=4,
   icon="users")

C2("marketing_manager", "Marketing Manager", "مدير التسويق", "entrepreneurship",
   "high", (14000, 40000),
   "marketing_comm:95 business_strategy:85 creativity:82 data_analysis:75 "
   "leadership:80 arabic_language:72",
   "22 68 72 68 92 70", "82 82 80 62 26", BIZ_SUBJ,
   ["marketing", "business_administration"],
   "Owns how a product is positioned and sold, and is accountable for whether "
   "the spending produced anything.",
   "يتولى تحديد موقع المنتج وطريقة تسويقه، وهو المسؤول عمّا إذا كان الإنفاق قد أثمر شيئًا.",
   CORP_EN, CORP_AR, ["digital_economy_strategy", "tourism_strategy_2031", "nafis"],
   years=4, icon="megaphone")

C2("supply_chain_manager", "Supply Chain Manager", "مدير سلسلة الإمداد", "logistics",
   "very_high", (16000, 45000),
   "logistics_ops:95 project_management:85 data_analysis:80 leadership:82 "
   "sales_negotiation:75 problem_solving:82",
   "62 80 28 62 82 88", "66 90 58 62 22", BIZ_SUBJ,
   ["supply_chain", "business_administration"],
   "Runs the end-to-end movement of goods, and is judged on what happens when "
   "part of the chain fails.",
   "يدير حركة البضائع من طرف السلسلة إلى طرفها، ويُحكم على أدائه بما يحدث حين "
   "يتعطّل جزء منها.",
   ["logistics operators", "port and free-zone authorities", "retail groups"],
   ["مشغّلو الخدمات اللوجستية", "هيئات الموانئ والمناطق الحرة", "مجموعات التجزئة"],
   ["centennial_2071", "industrial_strategy", "nafis"], years=4,
   envs=["office", "field"], icon="truck")

# ------------------------------------------------------------------- law
C2("lawyer", "Lawyer / Advocate", "المحامي", "law", "high", (14000, 45000),
   "law_policy:98 writing_docs:90 public_speaking:85 arabic_language:88 "
   "research_methods:82 attention_detail:88",
   "20 82 45 68 85 82", "70 88 72 55 24", LAW_SUBJ,
   ["law", "sharia_law"],
   "Advises and represents clients, working across a system where federal law, "
   "emirate law and free-zone regimes all apply.",
   "يقدّم المشورة للموكلين ويمثّلهم، ضمن نظام تتداخل فيه القوانين الاتحادية وقوانين "
   "الإمارات وأنظمة المناطق الحرة.",
   LAW_EN, LAW_AR, LAW_INITS, years=5, icon="scale")

C2("legal_counsel", "Corporate Legal Counsel", "المستشار القانوني للشركات", "law",
   "very_high", (18000, 50000),
   "law_policy:95 writing_docs:88 business_strategy:78 attention_detail:92 "
   "sales_negotiation:80 english_language:85",
   "20 85 35 62 78 88", "68 92 58 58 22", LAW_SUBJ,
   ["law"],
   "The lawyer inside a company: drafts and negotiates contracts and keeps the "
   "business on the right side of regulation before a dispute exists.",
   "المحامي داخل الشركة: يصوغ العقود ويتفاوض عليها ويُبقي العمل ضمن حدود التنظيم "
   "قبل نشوء أي نزاع.",
   LAW_EN, LAW_AR, LAW_INITS, years=5, envs=["office"], icon="file-text")

C2("judge", "Judge", "القاضي", "law", "moderate", (30000, 70000),
   "law_policy:98 attention_detail:95 arabic_language:92 writing_docs:88 "
   "research_methods:85 islamic_studies_skill:75",
   "18 88 32 68 62 92", "68 95 45 62 18", LAW_SUBJ,
   ["law", "sharia_law"],
   "Hears cases and delivers reasoned judgments, normally after substantial "
   "prior experience in prosecution or practice.",
   "ينظر في القضايا ويصدر أحكامًا مسبَّبة، عادةً بعد خبرة طويلة في النيابة أو المحاماة.",
   ["federal and local judicial departments"], ["الدوائر القضائية الاتحادية والمحلية"],
   LAW_INITS, years=9, envs=["court"], icon="gavel")

C2("paralegal", "Paralegal", "المساعد القانوني", "law", "high", (8000, 20000),
   "law_policy:82 writing_docs:88 attention_detail:95 research_methods:80 "
   "arabic_language:82 english_language:78",
   "22 78 28 58 48 95", "58 92 45 68 26", LAW_SUBJ,
   ["law", "criminology"],
   "Prepares case files, research and documentation that lawyers rely on, and "
   "is a common route into the profession.",
   "يعدّ ملفات القضايا والبحوث والمستندات التي يعتمد عليها المحامون، وهو مسار شائع "
   "للدخول إلى المهنة.",
   LAW_EN, LAW_AR, LAW_INITS, years=3, envs=["office"], icon="folder-open")
