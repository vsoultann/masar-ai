"""Healthcare and medicine — the largest sector in the v2 catalog.

v1 carried four generic health roles. The brief asks for the family to be
represented properly, including the whole imaging chain around radiology, so
a student who is drawn to that work can see the technologist, therapist and
specialist routes side by side rather than only the consultant post.
"""

from v2.careers_base import C2

HOSP_EN = ["public hospital groups", "private hospital networks",
           "federal and emirate health authorities"]
HOSP_AR = ["مجموعات المستشفيات الحكومية", "شبكات المستشفيات الخاصة",
           "الهيئات الصحية الاتحادية والمحلية"]
CLINIC_EN = ["private clinic groups", "hospital outpatient departments",
             "specialist medical centres"]
CLINIC_AR = ["مجموعات العيادات الخاصة", "أقسام العيادات الخارجية في المستشفيات",
             "المراكز الطبية المتخصصة"]
HEALTH_INITS = ["national_health_strategy", "we_the_uae_2031", "nafis"]
MED_SUBJ = {"biology": 92, "chemistry": 88, "math": 72, "physics": 68, "english": 82}
TECH_SUBJ = {"biology": 82, "chemistry": 76, "physics": 78, "math": 70, "english": 76}

# ---------------------------------------------------------------- imaging
C2("radiologist", "Radiologist", "أخصائي الأشعة", "healthcare", "high",
   (25000, 80000),
   "diagnostic_imaging:95 clinical_skills:85 attention_detail:92 life_sciences:80 "
   "problem_solving:82 research_methods:60 english_language:75",
   "40 92 35 55 45 78", "78 88 35 65 22", MED_SUBJ,
   ["medicine", "biomedical_sciences"],
   "Reads medical images — X-ray, CT, MRI and ultrasound — to identify disease, "
   "and writes the report that other doctors act on.",
   "يقرأ الصور الطبية من أشعة سينية ومقطعية ورنين مغناطيسي وموجات فوق صوتية لتحديد "
   "المرض، ويكتب التقرير الذي يبني عليه بقية الأطباء قرارهم.",
   HOSP_EN, HOSP_AR, HEALTH_INITS, years=11,
   envs=["hospital", "teleradiology"], icon="scan-line")

C2("radiographer", "Radiologic Technologist", "فني الأشعة",
   "healthcare", "very_high", (9000, 22000),
   "diagnostic_imaging:90 patient_care:80 attention_detail:88 physics_reasoning:65 "
   "teamwork:70 english_language:65",
   "68 70 30 70 35 72", "60 82 45 72 30", TECH_SUBJ,
   ["radiography"],
   "Operates the imaging equipment and positions patients so the radiologist "
   "receives a picture that can actually be read.",
   "يشغّل أجهزة التصوير ويهيّئ وضعية المريض ليصل إلى أخصائي الأشعة صورة قابلة للقراءة فعلًا.",
   HOSP_EN, HOSP_AR, HEALTH_INITS, years=4,
   envs=["hospital", "clinic"], icon="scan")

C2("sonographer", "Diagnostic Medical Sonographer", "أخصائي التصوير بالموجات فوق الصوتية",
   "healthcare", "very_high", (10000, 24000),
   "diagnostic_imaging:88 patient_care:82 attention_detail:88 life_sciences:70 "
   "problem_solving:70 teamwork:65",
   "65 76 35 72 32 70", "62 84 45 75 28", TECH_SUBJ,
   ["radiography", "biomedical_sciences"],
   "Performs ultrasound scans in real time, deciding while scanning which views "
   "will answer the clinical question.",
   "يجري فحوصات الموجات فوق الصوتية في الوقت الحقيقي، ويقرّر أثناء الفحص أي المقاطع "
   "تجيب عن السؤال السريري.",
   HOSP_EN, HOSP_AR, HEALTH_INITS, years=4, envs=["hospital", "clinic"], icon="activity")

C2("nuclear_medicine_technologist", "Nuclear Medicine Technologist", "فني الطب النووي",
   "healthcare", "high", (11000, 25000),
   "diagnostic_imaging:85 chemistry_lab:75 attention_detail:92 patient_care:70 "
   "physics_reasoning:72 quality_control:70",
   "68 78 25 62 30 78", "58 88 38 68 26", TECH_SUBJ,
   ["radiography", "biomedical_sciences"],
   "Prepares and administers radioactive tracers, then images how they move "
   "through the body to show organ function rather than structure.",
   "يحضّر النظائر المشعة ويعطيها للمريض، ثم يصوّر انتقالها في الجسم لإظهار وظيفة "
   "الأعضاء لا بنيتها فحسب.",
   HOSP_EN, HOSP_AR, HEALTH_INITS, years=4, envs=["hospital", "laboratory"], icon="atom")

C2("radiation_therapist", "Radiation Therapist", "أخصائي العلاج الإشعاعي",
   "healthcare", "high", (12000, 27000),
   "diagnostic_imaging:78 patient_care:88 attention_detail:95 physics_reasoning:75 "
   "counselling:65 quality_control:80",
   "62 74 28 78 32 82", "58 90 42 80 24", TECH_SUBJ,
   ["radiation_therapy", "radiography"],
   "Delivers precisely targeted radiation to treat cancer, working to a plan "
   "where millimetres and repetition both matter.",
   "يقدّم جرعات إشعاعية دقيقة الاستهداف لعلاج السرطان، وفق خطة تُحسب فيها المليمترات "
   "ويُعتمد فيها على الاتساق في التكرار.",
   HOSP_EN, HOSP_AR, HEALTH_INITS, years=4, envs=["hospital"], icon="target")

C2("interventional_radiologist", "Interventional Radiologist", "أخصائي الأشعة التداخلية",
   "healthcare", "high", (30000, 85000),
   "diagnostic_imaging:92 surgical_skills:85 clinical_skills:88 attention_detail:92 "
   "problem_solving:85 emergency_response:70",
   "70 92 35 58 48 76", "78 90 38 62 18", MED_SUBJ,
   ["medicine"],
   "Treats disease through tiny incisions guided by live imaging, replacing "
   "operations that once needed open surgery.",
   "يعالج الأمراض عبر شقوق صغيرة موجّهة بالتصوير الحيّ، فيغني عن عمليات كانت تتطلب "
   "جراحة مفتوحة.",
   HOSP_EN, HOSP_AR, HEALTH_INITS, years=13,
   envs=["hospital", "operating_theatre"], icon="git-branch")

# --------------------------------------------------------------- surgical
C2("general_surgeon", "General Surgeon", "الجراح العام", "healthcare", "high",
   (30000, 80000),
   "surgical_skills:95 clinical_skills:90 attention_detail:90 emergency_response:80 "
   "teamwork:78 leadership:70",
   "82 85 35 65 55 72", "70 92 45 60 15", MED_SUBJ,
   ["medicine"],
   "Operates across the abdomen and soft tissue, and carries the decision of "
   "whether an operation is the right answer at all.",
   "يجري العمليات في البطن والأنسجة الرخوة، ويتحمّل قرار ما إذا كانت الجراحة هي "
   "الخيار الصحيح أصلًا.",
   HOSP_EN, HOSP_AR, HEALTH_INITS, years=12,
   envs=["operating_theatre", "hospital"], icon="scissors")

C2("cardiac_surgeon", "Cardiac Surgeon", "جراح القلب", "healthcare", "moderate",
   (40000, 110000),
   "surgical_skills:98 clinical_skills:92 attention_detail:95 emergency_response:85 "
   "leadership:78 teamwork:82",
   "85 88 32 60 58 75", "72 95 42 58 12", MED_SUBJ,
   ["medicine"],
   "Operates on the heart and great vessels, in a specialty where the margin "
   "between a good and a poor outcome is measured in minutes.",
   "يجري عمليات القلب والأوعية الكبرى، في تخصص يُقاس فيه الفارق بين نتيجة جيدة "
   "وأخرى سيئة بالدقائق.",
   HOSP_EN, HOSP_AR, HEALTH_INITS, years=15,
   envs=["operating_theatre", "hospital"], icon="heart-pulse")

C2("orthopedic_surgeon", "Orthopedic Surgeon", "جراح العظام", "healthcare", "high",
   (32000, 85000),
   "surgical_skills:92 clinical_skills:88 physics_reasoning:70 attention_detail:88 "
   "rehabilitation:65 teamwork:75",
   "88 82 35 66 52 70", "68 90 48 64 16", MED_SUBJ,
   ["medicine"],
   "Repairs bones, joints and the soft tissue around them — a specialty that is "
   "as much mechanical reasoning as it is medicine.",
   "يعالج العظام والمفاصل والأنسجة المحيطة بها، في تخصص يجمع بين التفكير الميكانيكي "
   "والطب بقدر متساوٍ.",
   HOSP_EN, HOSP_AR, HEALTH_INITS, years=13,
   envs=["operating_theatre", "hospital"], icon="bone")

C2("neurosurgeon", "Neurosurgeon", "جراح المخ والأعصاب", "healthcare", "moderate",
   (42000, 115000),
   "surgical_skills:98 clinical_skills:92 attention_detail:98 problem_solving:88 "
   "emergency_response:82 research_methods:65",
   "80 92 35 58 52 80", "75 95 35 58 12", MED_SUBJ,
   ["medicine"],
   "Operates on the brain, spine and nervous system, where the tolerance for "
   "error is the smallest in medicine.",
   "يجري جراحات الدماغ والعمود الفقري والجهاز العصبي، حيث هامش الخطأ هو الأضيق في الطب.",
   HOSP_EN, HOSP_AR, HEALTH_INITS, years=16,
   envs=["operating_theatre", "hospital"], icon="brain")

C2("anesthesiologist", "Anesthesiologist", "طبيب التخدير", "healthcare", "very_high",
   (30000, 78000),
   "clinical_skills:92 attention_detail:95 emergency_response:92 pharmacology:88 "
   "problem_solving:85 teamwork:82",
   "72 88 28 62 48 85", "68 94 38 66 14", MED_SUBJ,
   ["medicine"],
   "Keeps the patient safe and unconscious through surgery, managing the body's "
   "systems minute by minute while someone else operates.",
   "يحافظ على سلامة المريض وفقدانه للوعي أثناء الجراحة، ويدير أجهزة الجسم دقيقةً "
   "بدقيقة بينما يجري غيره العملية.",
   HOSP_EN, HOSP_AR, HEALTH_INITS, years=12,
   envs=["operating_theatre", "hospital"], icon="syringe")

# ------------------------------------------------------------ physicians
C2("cardiologist", "Cardiologist", "طبيب القلب", "healthcare", "high", (32000, 85000),
   "clinical_skills:92 diagnostic_imaging:78 attention_detail:88 problem_solving:85 "
   "pharmacology:80 counselling:65",
   "58 92 32 68 48 78", "72 90 42 68 18", MED_SUBJ,
   ["medicine"],
   "Diagnoses and treats heart disease, combining bedside assessment with imaging "
   "and long-term management of chronic conditions.",
   "يشخّص أمراض القلب ويعالجها، جامعًا بين الفحص السريري والتصوير والإدارة طويلة "
   "الأمد للحالات المزمنة.",
   HOSP_EN, HOSP_AR, HEALTH_INITS, years=12, envs=["hospital", "clinic"], icon="heart")

C2("neurologist", "Neurologist", "طبيب الأعصاب", "healthcare", "high", (30000, 78000),
   "clinical_skills:92 problem_solving:90 attention_detail:88 life_sciences:82 "
   "diagnostic_imaging:70 research_methods:70",
   "45 95 35 68 42 78", "78 88 38 70 20", MED_SUBJ,
   ["medicine"],
   "Diagnoses disorders of the brain and nervous system, a specialty that rewards "
   "careful history-taking more than any single test.",
   "يشخّص اضطرابات الدماغ والجهاز العصبي، وهو تخصص يعتمد على دقة أخذ التاريخ المرضي "
   "أكثر من اعتماده على أي فحص منفرد.",
   HOSP_EN, HOSP_AR, HEALTH_INITS, years=12, envs=["hospital", "clinic"], icon="brain")

C2("emergency_physician", "Emergency Medicine Physician", "طبيب الطوارئ",
   "healthcare", "very_high", (28000, 70000),
   "emergency_response:98 clinical_skills:90 problem_solving:88 teamwork:85 "
   "attention_detail:82 leadership:75",
   "72 85 32 78 58 72", "70 88 58 68 18", MED_SUBJ,
   ["medicine"],
   "Stabilises whatever comes through the door, making decisions with incomplete "
   "information and limited time.",
   "يثبّت حالة كل ما يصل إلى قسم الطوارئ، ويتخذ قراراته بمعلومات ناقصة ووقت محدود.",
   HOSP_EN, HOSP_AR, HEALTH_INITS, years=11, envs=["hospital"], icon="siren")

C2("general_practitioner", "General Practitioner", "طبيب الأسرة", "healthcare",
   "very_high", (22000, 55000),
   "clinical_skills:88 counselling:80 patient_care:88 problem_solving:78 "
   "attention_detail:78 arabic_language:70",
   "48 82 35 88 50 70", "68 85 60 82 22", MED_SUBJ,
   ["medicine"],
   "The first doctor most people see: handles the broad range of everyday illness "
   "and decides what needs a specialist.",
   "الطبيب الأول الذي يقصده معظم الناس: يتعامل مع الطيف الواسع من الأمراض اليومية "
   "ويحدّد ما يحتاج إلى تخصص أدق.",
   CLINIC_EN, CLINIC_AR, HEALTH_INITS, years=8, envs=["clinic"], icon="stethoscope")

C2("pediatrician", "Pediatrician", "طبيب الأطفال", "healthcare", "very_high",
   (25000, 62000),
   "clinical_skills:90 patient_care:90 child_development:85 counselling:78 "
   "attention_detail:82 arabic_language:68",
   "45 85 38 90 45 72", "72 88 62 88 20", MED_SUBJ,
   ["medicine"],
   "Treats children from birth through adolescence, where the patient often "
   "cannot describe the problem and the parent is part of the consultation.",
   "يعالج الأطفال من الولادة حتى المراهقة، حيث لا يستطيع المريض غالبًا وصف مشكلته "
   "ويكون أحد الوالدين جزءًا من الاستشارة.",
   HOSP_EN, HOSP_AR, HEALTH_INITS, years=11, envs=["hospital", "clinic"], icon="baby")

C2("obgyn", "Obstetrician and Gynecologist", "طبيب النساء والتوليد", "healthcare",
   "very_high", (28000, 75000),
   "clinical_skills:90 surgical_skills:82 emergency_response:82 patient_care:88 "
   "counselling:75 attention_detail:85",
   "72 85 32 82 50 75", "68 90 52 78 18", MED_SUBJ,
   ["medicine"],
   "Cares for women through pregnancy, birth and gynaecological conditions, "
   "combining clinic work with unpredictable delivery-room hours.",
   "يرعى المرأة خلال الحمل والولادة والحالات النسائية، جامعًا بين عمل العيادة وساعات "
   "غير متوقعة في غرفة الولادة.",
   HOSP_EN, HOSP_AR, HEALTH_INITS, years=12,
   envs=["hospital", "operating_theatre"], icon="baby")

C2("dermatologist", "Dermatologist", "طبيب الجلدية", "healthcare", "high",
   (28000, 75000),
   "clinical_skills:88 attention_detail:92 diagnostic_imaging:60 patient_care:80 "
   "problem_solving:75 pharmacology:75",
   "52 85 45 70 55 78", "70 88 48 70 20", MED_SUBJ,
   ["medicine"],
   "Diagnoses and treats skin, hair and nail conditions — a highly visual "
   "specialty with a large cosmetic and laser component in this region.",
   "يشخّص أمراض الجلد والشعر والأظافر ويعالجها، وهو تخصص بصري بامتياز وله في هذه "
   "المنطقة جانب تجميلي وليزري كبير.",
   CLINIC_EN, CLINIC_AR, HEALTH_INITS, years=11, envs=["clinic"], icon="sparkles")

C2("ophthalmologist", "Ophthalmologist", "طبيب العيون", "healthcare", "high",
   (30000, 80000),
   "surgical_skills:88 clinical_skills:88 attention_detail:95 diagnostic_imaging:75 "
   "problem_solving:78 patient_care:75",
   "78 85 40 68 50 80", "68 92 42 70 16", MED_SUBJ,
   ["medicine"],
   "Treats eye disease medically and surgically, including some of the most "
   "delicate microsurgery performed anywhere in medicine.",
   "يعالج أمراض العين دوائيًا وجراحيًا، بما يشمل بعضًا من أدق الجراحات المجهرية في الطب.",
   CLINIC_EN, CLINIC_AR, HEALTH_INITS, years=12,
   envs=["clinic", "operating_theatre"], icon="eye")

C2("optometrist", "Optometrist", "أخصائي البصريات", "healthcare", "high",
   (12000, 28000),
   "clinical_skills:78 attention_detail:88 patient_care:85 physics_reasoning:65 "
   "customer_service:70 problem_solving:65",
   "62 75 35 78 45 78", "58 85 55 78 26", TECH_SUBJ,
   ["optometry"],
   "Tests sight, prescribes correction and screens for eye disease — usually the "
   "first professional to spot a problem the patient has not noticed.",
   "يفحص البصر ويصف وسائل التصحيح ويكشف مبكرًا عن أمراض العين، وهو غالبًا أول من "
   "يلاحظ مشكلة لم ينتبه لها المريض.",
   CLINIC_EN, CLINIC_AR, HEALTH_INITS, years=5, envs=["clinic"], icon="glasses")

C2("psychiatrist", "Psychiatrist", "الطبيب النفسي", "healthcare", "very_high",
   (28000, 72000),
   "counselling:92 clinical_skills:85 pharmacology:82 attention_detail:80 "
   "arabic_language:75 research_methods:65",
   "32 85 48 92 50 70", "80 85 55 82 22", MED_SUBJ,
   ["medicine", "psychology"],
   "Diagnoses and treats mental illness as a medical doctor, combining therapy "
   "with medication and long-term follow-up.",
   "يشخّص الأمراض النفسية ويعالجها بصفته طبيبًا، جامعًا بين العلاج النفسي والدواء "
   "والمتابعة طويلة الأمد.",
   HOSP_EN, HOSP_AR, HEALTH_INITS, years=11, envs=["clinic", "hospital"], icon="brain")

C2("clinical_psychologist", "Clinical Psychologist", "الأخصائي النفسي السريري",
   "healthcare", "very_high", (15000, 38000),
   "counselling:95 research_methods:78 attention_detail:78 arabic_language:78 "
   "writing_docs:70 patient_care:80",
   "25 82 52 95 45 68", "82 82 58 88 25",
   {"biology": 75, "english": 82, "arabic": 78, "social": 78, "math": 62},
   ["psychology"],
   "Assesses and treats psychological difficulty through structured therapy "
   "rather than medication.",
   "يقيّم الصعوبات النفسية ويعالجها عبر جلسات علاجية منظمة لا عبر الدواء.",
   CLINIC_EN, CLINIC_AR, HEALTH_INITS, years=6, envs=["clinic", "office"], icon="messages-square")

# ------------------------------------------------------------- dentistry
C2("dentist", "Dentist", "طبيب الأسنان", "healthcare", "very_high", (18000, 55000),
   "dental_skills:95 surgical_skills:75 attention_detail:92 patient_care:85 "
   "customer_service:70 problem_solving:72",
   "88 78 55 75 55 78", "62 90 52 76 20", MED_SUBJ,
   ["dentistry"],
   "Diagnoses and treats disease of the teeth, gums and mouth, doing precise "
   "manual work in a very small field of view.",
   "يشخّص أمراض الأسنان واللثة والفم ويعالجها، بعمل يدوي دقيق في مجال رؤية ضيّق جدًا.",
   CLINIC_EN, CLINIC_AR, HEALTH_INITS, years=6, envs=["clinic"], icon="smile")

C2("orthodontist", "Orthodontist", "أخصائي تقويم الأسنان", "healthcare", "high",
   (25000, 70000),
   "dental_skills:92 attention_detail:95 physics_reasoning:70 patient_care:80 "
   "problem_solving:78 customer_service:72",
   "85 80 62 72 58 82", "66 92 50 74 18", MED_SUBJ,
   ["dentistry"],
   "Moves teeth and jaws into alignment over months and years, planning a result "
   "long before it becomes visible.",
   "ينقل الأسنان والفكين إلى وضعها الصحيح عبر أشهر وسنوات، ويخطط للنتيجة قبل أن تظهر بوقت طويل.",
   CLINIC_EN, CLINIC_AR, HEALTH_INITS, years=9, envs=["clinic"], icon="align-center")

C2("dental_hygienist", "Dental Hygienist", "أخصائي صحة الأسنان", "healthcare",
   "high", (8000, 18000),
   "dental_skills:82 patient_care:88 attention_detail:85 customer_service:78 "
   "teaching:65 teamwork:70",
   "78 68 35 82 42 76", "55 85 60 84 28", TECH_SUBJ,
   ["dentistry", "nursing"],
   "Cleans and maintains oral health and teaches patients how to keep it, "
   "preventing most of what a dentist would otherwise have to treat.",
   "ينظّف الفم ويحافظ على صحته ويعلّم المرضى كيفية العناية به، فيمنع معظم ما كان "
   "سيضطر طبيب الأسنان إلى علاجه.",
   CLINIC_EN, CLINIC_AR, HEALTH_INITS, years=3, envs=["clinic"], icon="sparkles")

# ----------------------------------------------------- nursing and allied
C2("nurse_practitioner", "Nurse Practitioner", "ممارس التمريض المتقدّم",
   "healthcare", "very_high", (16000, 35000),
   "clinical_skills:88 patient_care:92 pharmacology:78 counselling:75 "
   "attention_detail:85 leadership:70",
   "58 80 32 92 52 78", "62 88 60 86 22", MED_SUBJ,
   ["nursing"],
   "An experienced nurse with advanced training who assesses, diagnoses and "
   "manages patients independently within an agreed scope.",
   "ممرض ذو خبرة وتدريب متقدم يقيّم الحالات ويشخّصها ويديرها باستقلالية ضمن نطاق متفق عليه.",
   HOSP_EN, HOSP_AR, HEALTH_INITS, years=6, envs=["hospital", "clinic"], icon="user-plus")

C2("midwife", "Midwife", "القابلة", "healthcare", "high", (12000, 26000),
   "patient_care:95 clinical_skills:85 emergency_response:80 counselling:82 "
   "attention_detail:85 arabic_language:70",
   "62 75 30 95 45 76", "62 88 62 90 20", MED_SUBJ,
   ["midwifery", "nursing"],
   "Supports women through pregnancy and birth, providing continuous care and "
   "recognising the moment a normal labour stops being normal.",
   "ترافق المرأة خلال الحمل والولادة، وتقدّم رعاية متصلة وتدرك اللحظة التي تتوقف فيها "
   "الولادة الطبيعية عن كونها طبيعية.",
   HOSP_EN, HOSP_AR, HEALTH_INITS, years=4, envs=["hospital"], icon="heart")

C2("paramedic", "Paramedic", "المسعف", "healthcare", "very_high", (9000, 20000),
   "emergency_response:98 clinical_skills:80 problem_solving:78 teamwork:88 "
   "patient_care:85 attention_detail:80",
   "88 72 28 85 52 70", "58 88 68 80 18", TECH_SUBJ,
   ["paramedic_science", "nursing"],
   "Delivers emergency care where the patient is — roadside, home or workplace — "
   "and keeps them alive on the way to hospital.",
   "يقدّم الرعاية الطارئة في مكان وجود المريض، على الطريق أو في المنزل أو في موقع "
   "العمل، ويحافظ على حياته في الطريق إلى المستشفى.",
   HOSP_EN, HOSP_AR, HEALTH_INITS, years=3,
   envs=["field", "hospital"], icon="ambulance")

C2("physiotherapist", "Physiotherapist", "أخصائي العلاج الطبيعي", "healthcare",
   "very_high", (12000, 28000),
   "rehabilitation:95 patient_care:88 life_sciences:75 counselling:70 "
   "teaching:72 attention_detail:78",
   "82 75 35 90 48 70", "62 85 62 86 22", TECH_SUBJ,
   ["physiotherapy"],
   "Restores movement after injury, surgery or illness, through assessment and "
   "a programme the patient has to be persuaded to keep doing.",
   "يستعيد للمريض قدرته على الحركة بعد الإصابة أو الجراحة أو المرض، عبر التقييم "
   "وبرنامج علاجي يحتاج إلى إقناع المريض بالمواظبة عليه.",
   CLINIC_EN, CLINIC_AR, HEALTH_INITS, years=4, envs=["clinic", "hospital"], icon="activity")

C2("occupational_therapist", "Occupational Therapist", "أخصائي العلاج الوظيفي",
   "healthcare", "high", (12000, 27000),
   "rehabilitation:90 patient_care:88 counselling:78 creativity:70 "
   "problem_solving:78 child_development:65",
   "70 74 55 92 45 68", "72 84 58 88 22", TECH_SUBJ,
   ["occupational_therapy"],
   "Helps people do the ordinary activities their condition has taken away — "
   "dressing, working, writing — by adapting the task or the person.",
   "يساعد الناس على استعادة الأنشطة اليومية التي سلبها المرض، كارتداء الملابس والعمل "
   "والكتابة، عبر تكييف المهمة أو تكييف الشخص معها.",
   CLINIC_EN, CLINIC_AR, HEALTH_INITS, years=4, envs=["clinic", "hospital"], icon="hand")

C2("speech_therapist", "Speech and Language Therapist", "أخصائي علاج النطق واللغة",
   "healthcare", "very_high", (12000, 28000),
   "rehabilitation:85 counselling:82 arabic_language:88 child_development:82 "
   "patient_care:85 attention_detail:80",
   "42 78 55 92 42 72", "74 85 58 90 24",
   {"biology": 78, "arabic": 88, "english": 82, "social": 72, "math": 58},
   ["speech_therapy"],
   "Treats difficulty with speech, language and swallowing — work that in this "
   "country often means assessing a child across two languages at once.",
   "يعالج صعوبات النطق واللغة والبلع، وهو عمل يعني في هذه الدولة غالبًا تقييم الطفل "
   "بلغتين في آنٍ واحد.",
   CLINIC_EN, CLINIC_AR, HEALTH_INITS, years=4, envs=["clinic", "classroom"], icon="ear")

C2("audiologist", "Audiologist", "أخصائي السمعيات", "healthcare", "high",
   (12000, 27000),
   "diagnostic_imaging:60 attention_detail:88 patient_care:85 physics_reasoning:72 "
   "rehabilitation:78 counselling:70",
   "62 80 32 82 42 80", "62 88 50 84 24", TECH_SUBJ,
   ["audiology"],
   "Tests hearing and balance and fits the devices that correct them, from "
   "newborn screening through to adult hearing loss.",
   "يفحص السمع والاتزان ويركّب الأجهزة المصحّحة لهما، من فحص حديثي الولادة إلى "
   "ضعف السمع لدى البالغين.",
   CLINIC_EN, CLINIC_AR, HEALTH_INITS, years=5, envs=["clinic"], icon="ear")

# ------------------------------------------------------- laboratory work
C2("medical_lab_scientist", "Medical Laboratory Scientist", "أخصائي المختبرات الطبية",
   "healthcare", "very_high", (10000, 24000),
   "lab_diagnostics:95 chemistry_lab:85 attention_detail:95 quality_control:85 "
   "life_sciences:82 problem_solving:70",
   "72 88 22 45 28 92", "58 92 30 62 24",
   {"biology": 88, "chemistry": 90, "math": 70, "physics": 62, "english": 75},
   ["medical_laboratory", "biomedical_sciences", "chemistry"],
   "Runs the tests that most diagnoses actually rest on, and is responsible for "
   "knowing when a result is wrong rather than merely abnormal.",
   "يجري الفحوصات التي يستند إليها معظم التشخيص فعليًا، ويتحمّل مسؤولية تمييز النتيجة "
   "الخاطئة عن النتيجة غير الطبيعية.",
   HOSP_EN, HOSP_AR, HEALTH_INITS, years=4, envs=["laboratory"], icon="test-tube")

C2("pathologist", "Pathologist", "أخصائي علم الأمراض", "healthcare", "high",
   (30000, 78000),
   "lab_diagnostics:92 life_sciences:90 attention_detail:95 research_methods:80 "
   "diagnostic_imaging:65 problem_solving:82",
   "48 95 28 42 32 88", "72 92 25 62 20", MED_SUBJ,
   ["medicine", "biomedical_sciences"],
   "Examines tissue and fluid to establish what a disease actually is — the "
   "doctor whose report decides the treatment other doctors give.",
   "يفحص الأنسجة والسوائل ليحدّد ماهية المرض فعلًا، وهو الطبيب الذي يحدّد تقريرُه "
   "العلاجَ الذي يقدّمه بقية الأطباء.",
   HOSP_EN, HOSP_AR, HEALTH_INITS, years=12, envs=["laboratory", "hospital"], icon="microscope")

C2("genetic_counselor", "Genetic Counselor", "المستشار الوراثي", "healthcare",
   "high", (14000, 32000),
   "life_sciences:90 counselling:92 research_methods:78 arabic_language:75 "
   "attention_detail:82 writing_docs:70",
   "32 90 40 88 45 76", "80 88 50 88 22", MED_SUBJ,
   ["biomedical_sciences", "medicine"],
   "Explains inherited risk to families and helps them decide what to do with "
   "it — a role with particular weight where consanguineous marriage is common.",
   "يشرح للأسر مخاطر الأمراض الوراثية ويساعدها على اتخاذ القرار بشأنها، وهو دور ذو "
   "أهمية خاصة حيث ينتشر زواج الأقارب.",
   HOSP_EN, HOSP_AR, HEALTH_INITS, years=6, envs=["clinic"], icon="dna")

# -------------------------------------------------- prevention and policy
C2("dietitian", "Clinical Dietitian", "أخصائي التغذية السريرية", "healthcare",
   "very_high", (10000, 24000),
   "nutrition_diet:95 counselling:82 life_sciences:75 chemistry_lab:60 "
   "teaching:72 arabic_language:70",
   "45 78 40 88 50 76", "68 85 58 86 24",
   {"biology": 85, "chemistry": 80, "english": 76, "math": 65, "social": 68},
   ["nutrition"],
   "Translates medical conditions into what a person can actually eat — central "
   "in a country with high rates of diabetes and obesity.",
   "يترجم الحالة الطبية إلى نظام غذائي قابل للتطبيق فعلًا، وهو دور محوري في دولة "
   "ترتفع فيها معدلات السكري والسمنة.",
   CLINIC_EN, CLINIC_AR, HEALTH_INITS, years=4, envs=["clinic", "hospital"], icon="apple")

C2("epidemiologist", "Epidemiologist", "أخصائي الوبائيات", "healthcare",
   "high", (16000, 40000),
   "research_methods:95 statistics:92 data_analysis:88 life_sciences:82 "
   "writing_docs:78 law_policy:65",
   "32 95 30 68 45 82", "80 88 40 70 24",
   {"biology": 85, "math": 82, "english": 82, "chemistry": 72, "social": 70},
   ["public_health"],
   "Studies how disease moves through populations and turns that into the advice "
   "that shapes public-health policy.",
   "يدرس انتشار الأمراض بين السكان ويحوّل ذلك إلى توصيات تشكّل سياسات الصحة العامة.",
   HOSP_EN, HOSP_AR, HEALTH_INITS, years=6, envs=["office", "field"], icon="line-chart")

C2("clinical_pharmacologist", "Clinical Pharmacologist", "أخصائي علم الأدوية السريري",
   "healthcare", "moderate", (18000, 45000),
   "pharmacology:95 research_methods:88 lab_diagnostics:75 attention_detail:90 "
   "life_sciences:85 writing_docs:72",
   "42 95 28 55 38 85", "78 90 32 66 22", MED_SUBJ,
   ["pharmacy", "medicine"],
   "Studies how drugs behave in the body and advises on dosing and interactions "
   "in the difficult cases where the standard answer does not apply.",
   "يدرس سلوك الأدوية في الجسم ويقدّم المشورة في الجرعات والتداخلات الدوائية في "
   "الحالات المعقّدة التي لا تنفع فيها الإجابة القياسية.",
   HOSP_EN, HOSP_AR, HEALTH_INITS, years=8, envs=["hospital", "laboratory"], icon="pill")

# ------------------------------------------------------------ technology
C2("biomedical_engineer", "Biomedical Engineer", "المهندس الطبي الحيوي",
   "healthcare", "high", (14000, 34000),
   "electronics:85 mechanical_design:78 life_sciences:80 problem_solving:85 "
   "quality_control:80 project_management:65",
   "88 88 45 58 42 80", "76 86 40 66 24",
   {"physics": 88, "biology": 82, "math": 85, "chemistry": 72, "computer_science": 75},
   ["biomedical_engineering"],
   "Designs and maintains the equipment clinical care depends on, and is the "
   "person who works out why a device is giving an impossible reading.",
   "يصمّم الأجهزة التي تعتمد عليها الرعاية السريرية ويصونها، وهو من يكتشف سبب إعطاء "
   "الجهاز قراءة مستحيلة.",
   HOSP_EN, HOSP_AR, HEALTH_INITS + ["industrial_strategy"], years=4,
   envs=["hospital", "laboratory"], icon="cpu")

C2("prosthetist", "Prosthetist and Orthotist", "أخصائي الأطراف الصناعية والتقويم",
   "healthcare", "moderate", (11000, 26000),
   "rehabilitation:85 mechanical_design:80 patient_care:85 attention_detail:90 "
   "creativity:70 problem_solving:78",
   "92 76 62 82 42 74", "70 88 48 84 22", TECH_SUBJ,
   ["prosthetics_orthotics", "biomedical_engineering"],
   "Designs and fits artificial limbs and supportive braces, fitting a mechanical "
   "solution to one specific body.",
   "يصمّم الأطراف الصناعية والدعامات ويركّبها، فيلائم حلًا ميكانيكيًا مع جسد بعينه.",
   CLINIC_EN, CLINIC_AR, HEALTH_INITS, years=4, envs=["clinic", "laboratory"], icon="wrench")

C2("veterinarian", "Veterinarian", "الطبيب البيطري", "healthcare", "high",
   (15000, 40000),
   "veterinary_care:95 clinical_skills:85 surgical_skills:75 life_sciences:85 "
   "patient_care:70 problem_solving:80",
   "85 88 35 70 48 72", "72 88 48 80 20",
   {"biology": 92, "chemistry": 85, "math": 68, "english": 78, "physics": 62},
   ["veterinary"],
   "Treats animals across pets, livestock, camels and equine work — a broad "
   "practice in a country with a significant racing and farming sector.",
   "يعالج الحيوانات من حيوانات أليفة وماشية وإبل وخيول، وهي ممارسة واسعة في دولة "
   "ذات قطاع سباقات وزراعة معتبر.",
   ["veterinary clinics", "equine and camel hospitals", "agriculture authorities"],
   ["العيادات البيطرية", "مستشفيات الخيل والإبل", "هيئات الزراعة"],
   ["food_security_2051", "we_the_uae_2031"], years=6,
   envs=["clinic", "field"], icon="paw-print")
