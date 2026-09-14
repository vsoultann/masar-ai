"""UAE scholarship and study-funding routes.

Accuracy note, which the UI repeats on every card and in every mentor answer
that cites this file:

    These records describe the **kind** of programme each provider runs -- who
    it is open to, roughly what it covers, and what it asks for in return.
    They are not quotations from an application form. Award values, cut-offs,
    quotas and deadlines change every intake, and several of these programmes
    open and close by announcement rather than on a fixed calendar.

So the schema deliberately has no field for an amount and no field for a
deadline. It carries a coverage *band* and an indicative eligibility shape,
exactly as `universities.py` carries an indicative admission shape, and every
record carries the provider's official URL because that is the only page that
can answer "what is it this year".

`minHighSchoolPercent` is the same kind of number as the one on a university
record: the shape of a typical requirement, not a threshold anyone published.
Where a programme's selection is genuinely not a percentage -- an aptitude and
medical assessment for a cadet pilot, a portfolio for a design award -- the
field is None and the UI shows the note instead of a bar.

No logos, crests or provider imagery are shipped -- see docs/DECISIONS.md.
"""

from v2.majors import MAJOR_IDS

# --- Field bundles -------------------------------------------------------
# Programmes are scoped to a family of majors far more often than to one, and
# naming the bundles keeps the rows readable.

STEM_CORE = ["computer_science", "software_engineering", "data_science",
             "artificial_intelligence", "cybersecurity_major", "mathematics",
             "physics", "electrical_engineering", "mechanical_engineering",
             "civil_engineering", "chemical_engineering", "computer_engineering"]
ENERGY_FIELDS = ["petroleum_engineering", "chemical_engineering",
                 "mechanical_engineering", "electrical_engineering",
                 "geology", "environmental_engineering", "materials_engineering",
                 "nuclear_engineering", "industrial_engineering", "mechatronics"]
HEALTH_FIELDS = ["medicine", "dentistry", "pharmacy", "nursing", "public_health",
                 "medical_laboratory", "physiotherapy", "radiography",
                 "biomedical_sciences", "midwifery", "nutrition",
                 "radiation_therapy", "occupational_therapy", "speech_therapy",
                 "audiology", "optometry", "prosthetics_orthotics",
                 "paramedic_science", "health_informatics"]
AVIATION_FIELDS = ["pilot_training", "aviation_management", "aircraft_maintenance",
                   "aerospace_engineering", "air_traffic_management"]
SPACE_FIELDS = ["space_engineering", "aerospace_engineering", "physics",
                "astronomy", "mechanical_engineering", "electrical_engineering",
                "meteorology"]
COMPUTING = ["computer_science", "software_engineering", "artificial_intelligence",
             "data_science", "cybersecurity_major", "information_systems",
             "network_engineering", "robotics", "game_development",
             "interaction_design"]
BUSINESS_FIELDS = ["business_administration", "accounting", "finance", "marketing",
                   "economics", "human_resources", "islamic_finance", "supply_chain"]
EDUCATION_FIELDS = ["education_primary", "education_secondary", "special_education",
                    "curriculum_design", "educational_counselling"]
CREATIVE_FIELDS = ["graphic_design", "digital_media", "film_production", "animation",
                   "fashion_design", "photography", "interior_design",
                   "industrial_design", "mass_communication", "journalism",
                   "sound_engineering", "museum_studies"]
MARITIME_FIELDS = ["maritime_studies", "marine_engineering", "supply_chain",
                   "marine_science", "geomatics"]
PUBLIC_FIELDS = ["public_administration", "public_policy", "political_science",
                 "international_relations", "law", "homeland_security",
                 "criminology", "military_science", "social_work"]

SCHOLARSHIPS: list[dict] = []

INDICATIVE_EN = ("Indicative only — terms, coverage and deadlines change every intake. "
                 "Confirm with the provider before you plan around this.")
INDICATIVE_AR = ("إرشادي فقط — تتغيّر الشروط والتغطية والمواعيد في كل دورة قبول. "
                 "يُرجى التأكد من الجهة المانحة قبل البناء على هذه المعلومات.")


def S(sid, en, ar, provider_en, provider_ar, kind, audience, coverage, levels,
      emirate, fields, min_pct, tracks, website, about_en, about_ar,
      obligation_en=None, obligation_ar=None, universities=(), note_en="", note_ar=""):
    """Expand a compact scholarship row into a full record."""
    unknown = [f for f in fields if f not in MAJOR_IDS]
    assert not unknown, f"{sid}: unknown majors {unknown}"
    SCHOLARSHIPS.append({
        "id": sid,
        "name": {"en": en, "ar": ar},
        "provider": {"en": provider_en, "ar": provider_ar},
        "kind": kind,
        "audience": audience,
        "coverage": coverage,
        "levels": list(levels),
        "emirate": emirate,
        "fields": sorted(set(fields)),
        "about": {"en": about_en, "ar": about_ar},
        "eligibility": {
            "minHighSchoolPercent": min_pct,
            "trackRequired": list(tracks),
            "notes": {"en": note_en or INDICATIVE_EN, "ar": note_ar or INDICATIVE_AR},
        },
        # What the programme asks for in return. A sponsored place with a
        # multi-year service bond is a different decision from a grant, and
        # burying that under "full tuition" would be the one genuinely
        # misleading thing this catalog could do.
        "obligation": (
            {"en": obligation_en, "ar": obligation_ar} if obligation_en else None
        ),
        "relatedUniversities": list(universities),
        "website": website,
        "indicative": {"en": INDICATIVE_EN, "ar": INDICATIVE_AR},
    })


# ======================= Federal government ==============================

S("moe_national", "National Higher Education Scholarships",
  "بعثات التعليم العالي الوطنية",
  "Ministry of Education", "وزارة التربية والتعليم",
  "government", "uae_nationals", "full_plus_stipend",
  ["undergraduate", "postgraduate"], "all", STEM_CORE + HEALTH_FIELDS + PUBLIC_FIELDS,
  90, ["advanced", "elite"],
  "https://www.moe.gov.ae",
  "The federal scholarship route for Emirati students, covering study inside the UAE and, "
  "for a smaller number of places, at universities abroad. Selection weighs the high-school "
  "average, EmSAT results and the national priority of the field applied for.",
  "المسار الاتحادي للبعث للطلبة الإماراتيين، ويشمل الدراسة داخل الدولة وعددًا أقل من المقاعد "
  "في جامعات خارجها. يُرجّح الاختيار المعدل الثانوي ونتائج الإمسات والأولوية الوطنية للتخصص "
  "المتقدَّم إليه.",
  note_en="Open to UAE nationals. Fields on the national priority list are funded first, "
          "and the priority list is reissued — check it for the year you apply. " + INDICATIVE_EN,
  note_ar="مفتوح لمواطني الدولة. تُموَّل التخصصات المدرجة على قائمة الأولويات الوطنية أولًا، "
          "وتُحدَّث القائمة سنويًا — راجعها للعام الذي تتقدّم فيه. " + INDICATIVE_AR)

S("presidential_affairs", "Overseas Study Scholarships",
  "بعثات الدراسة في الخارج",
  "Ministry of Presidential Affairs", "وزارة شؤون الرئاسة",
  "government", "uae_nationals", "full_plus_stipend",
  ["undergraduate", "postgraduate"], "all",
  STEM_CORE + HEALTH_FIELDS + PUBLIC_FIELDS + ["law", "economics"],
  92, ["advanced", "elite"],
  "https://www.mopa.ae",
  "Long-running scholarships sending Emirati students to universities abroad, with living "
  "costs and travel covered alongside tuition. Highly selective, and placement depends on "
  "securing an offer from a recognised institution.",
  "بعثات قائمة منذ سنوات تُوفد الطلبة الإماراتيين إلى جامعات خارج الدولة، وتغطي نفقات المعيشة "
  "والسفر إلى جانب الرسوم الدراسية. تنافسية للغاية، ويتوقف الابتعاث على الحصول على قبول من "
  "مؤسسة معترف بها.")

S("sandooq_al_watan", "Sandooq Al Watan Education Programmes",
  "برامج صندوق الوطن التعليمية",
  "Sandooq Al Watan", "صندوق الوطن",
  "foundation", "uae_nationals", "partial_tuition",
  ["undergraduate", "postgraduate"], "all",
  COMPUTING + HEALTH_FIELDS + EDUCATION_FIELDS + ["entrepreneurship_major"],
  80, [],
  "https://www.sandooqalwatan.ae",
  "A national fund backing education and capability-building for Emiratis, running study "
  "support, upskilling programmes and partnerships with universities rather than a single "
  "fixed scholarship.",
  "صندوق وطني يدعم التعليم وبناء القدرات للمواطنين، ويدير برامج دعم دراسي وتأهيل وشراكات مع "
  "الجامعات بدلًا من منحة واحدة ثابتة.",
  note_en="Programmes are announced individually rather than run on one annual cycle. "
          + INDICATIVE_EN,
  note_ar="تُعلَن البرامج فرادى ولا تسير على دورة سنوية واحدة. " + INDICATIVE_AR)

S("adek_abu_dhabi", "Abu Dhabi Student Support and Scholarships",
  "دعم الطلبة والمنح في أبوظبي",
  "Department of Education and Knowledge (ADEK)",
  "دائرة التعليم والمعرفة (أبوظبي)",
  "government", "uae_nationals", "partial_tuition",
  ["undergraduate"], "abu_dhabi", STEM_CORE + EDUCATION_FIELDS + HEALTH_FIELDS,
  85, [],
  "https://www.adek.gov.ae",
  "Abu Dhabi's education authority funds scholarship and student-support schemes for Emirati "
  "students in the emirate, including places at partner universities and support for "
  "high-achieving school leavers.",
  "تموّل هيئة التعليم في أبوظبي برامج منح ودعم للطلبة الإماراتيين في الإمارة، وتشمل مقاعد لدى "
  "جامعات شريكة ودعمًا للمتفوقين من خريجي الثانوية.",
  universities=("uaeu", "ku", "zu_ad", "nyuad", "sorbonne_ad"))

S("ksa_dubai_hamdan", "Hamdan Bin Rashid Al Maktoum Awards for Distinguished Academic Performance",
  "جوائز حمدان بن راشد آل مكتوم للأداء التعليمي المتميز",
  "Hamdan Bin Rashid Al Maktoum Foundation", "مؤسسة حمدان بن راشد آل مكتوم",
  "foundation", "all", "partial_tuition",
  ["undergraduate", "postgraduate"], "dubai",
  EDUCATION_FIELDS + HEALTH_FIELDS + ["public_health", "biomedical_sciences"],
  88, [],
  "https://www.hbrf.ae",
  "A Dubai foundation that recognises outstanding students, teachers and researchers, with "
  "awards and study support concentrated in education and the medical sciences.",
  "مؤسسة في دبي تكرّم المتميزين من الطلبة والمعلمين والباحثين، وتتركّز جوائزها ودعمها الدراسي "
  "في التعليم والعلوم الطبية.")

# ======================= Universities ====================================

S("ku_merit", "Khalifa University Scholarships",
  "منح جامعة خليفة",
  "Khalifa University of Science and Technology", "جامعة خليفة للعلوم والتكنولوجيا",
  "university", "all", "full_plus_stipend",
  ["undergraduate", "postgraduate"], "abu_dhabi",
  STEM_CORE + ["aerospace_engineering", "biomedical_engineering", "nuclear_engineering",
               "petroleum_engineering", "robotics", "medicine"],
  90, ["advanced", "elite"],
  "https://www.ku.ac.ae",
  "Khalifa University has historically admitted strong undergraduates onto a funded basis, "
  "with tuition covered and support toward living costs, and funds research assistantships "
  "at master's and doctoral level. Admission and the award are decided together.",
  "دأبت جامعة خليفة على قبول الطلبة المتفوقين في المرحلة الجامعية ضمن مقاعد مموّلة تغطي الرسوم "
  "وتدعم نفقات المعيشة، كما تموّل مساعدات بحثية في الماجستير والدكتوراه. ويُبَتّ في القبول "
  "والمنحة معًا.",
  universities=("ku",))

S("mbzuai_funded", "MBZUAI Fully Funded Study",
  "الدراسة الممولة بالكامل في جامعة محمد بن زايد للذكاء الاصطناعي",
  "Mohamed bin Zayed University of Artificial Intelligence",
  "جامعة محمد بن زايد للذكاء الاصطناعي",
  "university", "all", "full_plus_stipend",
  ["postgraduate"], "abu_dhabi",
  ["artificial_intelligence", "computer_science", "data_science", "robotics",
   "software_engineering", "mathematics", "statistics"],
  None, [],
  "https://mbzuai.ac.ae",
  "A graduate-only university dedicated to artificial intelligence. Admitted students have "
  "been funded on a full basis — tuition, accommodation and a monthly stipend — which makes "
  "it one of the few routes into a research career with no tuition cost at all.",
  "جامعة للدراسات العليا فقط متخصصة في الذكاء الاصطناعي. جرى تمويل الطلبة المقبولين تمويلًا "
  "كاملًا يشمل الرسوم والسكن ومخصصًا شهريًا، ما يجعلها من المسارات القليلة إلى مهنة بحثية "
  "دون أي كلفة دراسية.",
  universities=("mbzuai",),
  note_en="Master's and PhD only — there is no undergraduate route here. Plan a bachelor's "
          "in computing or mathematics first. " + INDICATIVE_EN,
  note_ar="ماجستير ودكتوراه فقط — لا يوجد مسار للبكالوريوس هنا. خطّط لدرجة جامعية في الحوسبة "
          "أو الرياضيات أولًا. " + INDICATIVE_AR)

S("nyuad_aid", "NYU Abu Dhabi Financial Aid and Scholarships",
  "المساعدات المالية والمنح في جامعة نيويورك أبوظبي",
  "New York University Abu Dhabi", "جامعة نيويورك أبوظبي",
  "university", "all", "full_plus_stipend",
  ["undergraduate"], "abu_dhabi",
  STEM_CORE + CREATIVE_FIELDS + PUBLIC_FIELDS + ["biology", "psychology", "economics"],
  92, ["advanced", "elite"],
  "https://nyuad.nyu.edu",
  "Admission is need-blind for the strongest applicants and the university has met "
  "demonstrated financial need, so a place is not decided by what a family can pay. "
  "Extremely competitive, and the application is a holistic one rather than a score cut-off.",
  "القبول لا ينظر إلى القدرة المالية بالنسبة لأقوى المتقدمين، وقد التزمت الجامعة بتغطية "
  "الحاجة المالية المثبتة، فلا يتحدد المقعد بما تستطيع الأسرة دفعه. المنافسة شديدة، والتقديم "
  "شامل لا يقوم على حدّ أدنى من الدرجات.",
  universities=("nyuad",))

S("uaeu_chancellor", "UAEU Merit and Chancellor's Scholarships",
  "منح التفوق ومنحة المدير في جامعة الإمارات",
  "United Arab Emirates University", "جامعة الإمارات العربية المتحدة",
  "university", "all", "full_tuition",
  ["undergraduate", "postgraduate"], "abu_dhabi",
  STEM_CORE + HEALTH_FIELDS + BUSINESS_FIELDS + EDUCATION_FIELDS,
  90, ["advanced", "elite"],
  "https://www.uaeu.ac.ae",
  "The national university is free for UAE nationals, and runs merit awards and graduate "
  "assistantships that open the same route to expatriate students with a strong record.",
  "الجامعة الوطنية مجانية لمواطني الدولة، وتقدّم منح تفوّق ومساعدات دراسات عليا تفتح المسار "
  "نفسه أمام الطلبة الوافدين ذوي السجل القوي.",
  universities=("uaeu",))

S("zu_scholarships", "Zayed University Scholarships",
  "منح جامعة زايد",
  "Zayed University", "جامعة زايد",
  "university", "all", "full_tuition",
  ["undergraduate"], "all",
  BUSINESS_FIELDS + CREATIVE_FIELDS + EDUCATION_FIELDS + COMPUTING + ["psychology"],
  85, [],
  "https://www.zu.ac.ae",
  "Free for UAE nationals, with merit scholarships for expatriate students on both the Dubai "
  "and Abu Dhabi campuses. Strong in communication, design, education and business.",
  "مجانية لمواطني الدولة، مع منح تفوّق للطلبة الوافدين في حرمي دبي وأبوظبي. قوية في الاتصال "
  "والتصميم والتربية وإدارة الأعمال.",
  universities=("zu_ad", "zu_dubai"))

S("hct_nationals", "Higher Colleges of Technology Places",
  "مقاعد كليات التقنية العليا",
  "Higher Colleges of Technology", "كليات التقنية العليا",
  "university", "uae_nationals", "free_for_nationals",
  ["undergraduate"], "all",
  COMPUTING + BUSINESS_FIELDS + ["health_informatics", "nursing", "education_primary",
                                 "mechanical_engineering", "electrical_engineering",
                                 "aviation_management", "supply_chain"],
  70, [],
  "https://www.hct.ac.ae",
  "The applied federal system, free to UAE nationals across seven campuses. The most "
  "accessible funded route in the country: entry thresholds are lower than the research "
  "universities and the programmes are built around employment.",
  "المنظومة التطبيقية الاتحادية، مجانية لمواطني الدولة في سبعة حرم جامعية. أيسر المسارات "
  "الممولة في الدولة: عتبات القبول أدنى من الجامعات البحثية والبرامج مبنية على التوظيف.",
  universities=("hct_abu_dhabi", "hct_dubai", "hct_sharjah", "hct_al_ain",
                "hct_ras_al_khaimah", "hct_fujairah", "hct_madinat_zayed", "hct_ruwais"))

S("aus_merit", "AUS Merit and Need-Based Awards",
  "منح التفوق والمساعدة المالية في الجامعة الأمريكية بالشارقة",
  "American University of Sharjah", "الجامعة الأمريكية في الشارقة",
  "university", "all", "partial_tuition",
  ["undergraduate", "postgraduate"], "sharjah",
  STEM_CORE + BUSINESS_FIELDS + CREATIVE_FIELDS + ["architecture", "interior_design",
                                                   "urban_planning", "international_relations"],
  88, [],
  "https://www.aus.edu",
  "Awards scaled to the high-school average and to financial need, renewable on a maintained "
  "university GPA. Architecture, engineering and design are the flagship programmes.",
  "منح تتدرّج بحسب المعدل الثانوي والحاجة المالية، وتُجدَّد بشرط الحفاظ على معدل جامعي محدد. "
  "العمارة والهندسة والتصميم هي البرامج الرائدة.",
  universities=("aus",))

S("sharjah_univ_awards", "University of Sharjah Scholarships",
  "منح جامعة الشارقة",
  "University of Sharjah", "جامعة الشارقة",
  "university", "all", "partial_tuition",
  ["undergraduate", "postgraduate"], "sharjah",
  HEALTH_FIELDS + STEM_CORE + ["sharia_law", "law", "islamic_studies", "architecture"],
  85, [],
  "https://www.sharjah.ac.ae",
  "A broad award system covering academic excellence, financial hardship, Quran memorisation "
  "and sports, across one of the largest programme ranges in the country.",
  "منظومة منح واسعة تشمل التفوق الدراسي والحالة المادية وحفظ القرآن الكريم والرياضة، ضمن واحدة "
  "من أوسع قوائم البرامج في الدولة.",
  universities=("sharjah_univ",))

S("sorbonne_ad_merit", "Sorbonne Abu Dhabi Excellence Scholarships",
  "منح التميز في جامعة السوربون أبوظبي",
  "Sorbonne University Abu Dhabi", "جامعة السوربون أبوظبي",
  "university", "all", "partial_tuition",
  ["undergraduate", "postgraduate"], "abu_dhabi",
  ["law", "economics", "international_relations", "political_science", "sociology",
   "museum_studies", "journalism", "mass_communication", "translation"],
  85, [],
  "https://www.sorbonne.ae",
  "A French public university's Abu Dhabi campus, awarding excellence scholarships against "
  "the French and international curricula it teaches in. Unusually strong in law, humanities "
  "and languages rather than engineering.",
  "حرم أبوظبي لجامعة فرنسية حكومية، تمنح منح تميز وفق المناهج الفرنسية والدولية التي تدرّسها. "
  "قوية بشكل لافت في القانون والعلوم الإنسانية واللغات أكثر منها في الهندسة.",
  universities=("sorbonne_ad",))

S("mbru_health", "MBRU Medical and Health Sciences Scholarships",
  "منح كليات الطب والعلوم الصحية في جامعة محمد بن راشد",
  "Mohammed Bin Rashid University of Medicine and Health Sciences",
  "جامعة محمد بن راشد للطب والعلوم الصحية",
  "university", "all", "partial_tuition",
  ["undergraduate", "postgraduate"], "dubai",
  HEALTH_FIELDS + ["biomedical_sciences", "health_informatics"],
  90, ["advanced", "elite"],
  "https://www.mbru.ac.ae",
  "Dubai's dedicated health-sciences university, with scholarship support for medicine, "
  "dentistry and the allied health programmes, and a hospital network attached for clinical "
  "placement.",
  "جامعة دبي المتخصصة في العلوم الصحية، مع دعم بالمنح لبرامج الطب وطب الأسنان والعلوم الصحية "
  "المساندة، وشبكة مستشفيات ملحقة للتدريب السريري.",
  universities=("mbru",))

S("ajman_merit", "Ajman University Merit Scholarships",
  "منح التفوق في جامعة عجمان",
  "Ajman University", "جامعة عجمان",
  "university", "all", "partial_tuition",
  ["undergraduate"], "ajman",
  HEALTH_FIELDS + STEM_CORE + BUSINESS_FIELDS + CREATIVE_FIELDS + ["architecture", "law"],
  80, [],
  "https://www.ajman.ac.ae",
  "Tiered tuition discounts keyed to the high-school average, plus sibling and alumni "
  "reductions. One of the more predictable award structures — the tier is published rather "
  "than negotiated.",
  "خصومات على الرسوم متدرجة حسب المعدل الثانوي، إضافة إلى خصومات للإخوة والخريجين. من أوضح "
  "هياكل المنح — إذ تُنشر الشرائح ولا يجري التفاوض عليها.",
  universities=("ajman_univ",))

S("aurak_merit", "AURAK Scholarships",
  "منح الجامعة الأمريكية في رأس الخيمة",
  "American University of Ras Al Khaimah", "الجامعة الأمريكية في رأس الخيمة",
  "university", "all", "partial_tuition",
  ["undergraduate"], "ras_al_khaimah",
  STEM_CORE + BUSINESS_FIELDS + ["architecture", "biotechnology", "environmental_science"],
  80, [],
  "https://aurak.ac.ae",
  "Merit and hardship awards at a government-backed American-curriculum university in the "
  "northern emirates, where the cost base is lower than Dubai or Abu Dhabi to begin with.",
  "منح تفوّق ومنح حالة مادية في جامعة مدعومة حكوميًا تتبع المنهج الأمريكي في الإمارات الشمالية، "
  "حيث تكون الكلفة أساسًا أقل منها في دبي أو أبوظبي.",
  universities=("aurak",))

S("branch_campus_merit", "International Branch Campus Scholarships",
  "منح الفروع الجامعية الدولية",
  "UK, Australian and Indian branch campuses", "الفروع البريطانية والأسترالية والهندية",
  "university", "all", "partial_tuition",
  ["undergraduate", "postgraduate"], "dubai",
  STEM_CORE + BUSINESS_FIELDS + CREATIVE_FIELDS + ["psychology", "law"],
  85, [],
  "https://www.khda.gov.ae",
  "Heriot-Watt, Birmingham, Middlesex, Manipal, BITS Pilani and the other Dubai branch "
  "campuses each run academic-excellence scholarships, typically a percentage off tuition "
  "renewable on results. The award is usually decided at offer stage, not applied for later.",
  "تدير فروع هيريوت وات وبرمنغهام وميدلسكس ومانيبال وبيتس بيلاني وغيرها في دبي منحًا للتفوق "
  "الأكاديمي، وهي عادةً نسبة خصم على الرسوم تُجدَّد بحسب النتائج. ويُبَتّ في المنحة عند تقديم "
  "عرض القبول لا بطلب لاحق.",
  universities=("hw_dubai", "birmingham_dubai", "middlesex_dubai", "manipal_dubai",
                "bits_dubai", "amity_dubai", "cud"))

# ======================= Employer-sponsored ==============================

S("adnoc_sponsorship", "ADNOC Scholarship and Sponsorship Programme",
  "برنامج المنح والابتعاث في أدنوك",
  "ADNOC", "أدنوك",
  "employer", "uae_nationals", "sponsored_with_bond",
  ["undergraduate", "postgraduate"], "abu_dhabi", ENERGY_FIELDS + COMPUTING,
  85, ["advanced", "elite"],
  "https://www.adnoc.ae",
  "Sponsored study for Emirati students in the disciplines the group hires into, with tuition "
  "and a monthly allowance, internships during study and a job at the end of it.",
  "ابتعاث مموّل للطلبة الإماراتيين في التخصصات التي توظّف فيها المجموعة، مع تغطية الرسوم "
  "ومخصص شهري وتدريب أثناء الدراسة ووظيفة عند التخرج.",
  obligation_en="Sponsorship carries a commitment to work for the group for a set period "
                "after graduation. Read the length of that commitment before signing.",
  obligation_ar="يترتب على الابتعاث التزام بالعمل لدى المجموعة لمدة محددة بعد التخرج. اطّلع "
                "على مدة هذا الالتزام قبل التوقيع.",
  universities=("ku", "adnoc_academy", "uaeu"))

S("enec_energy_pioneers", "Energy Pioneers Scholarship",
  "منحة روّاد الطاقة",
  "Emirates Nuclear Energy Corporation (ENEC)", "مؤسسة الإمارات للطاقة النووية",
  "employer", "uae_nationals", "sponsored_with_bond",
  ["undergraduate"], "abu_dhabi",
  ["nuclear_engineering", "mechanical_engineering", "electrical_engineering",
   "chemical_engineering", "physics", "industrial_engineering", "materials_engineering"],
  85, ["advanced", "elite"],
  "https://www.enec.gov.ae",
  "Sponsored study for Emirati students heading into the nuclear energy programme, one of "
  "the few routes in the region into nuclear engineering with employment attached.",
  "ابتعاث مموّل للطلبة الإماراتيين المتجهين إلى برنامج الطاقة النووية، وهو من المسارات القليلة "
  "في المنطقة إلى الهندسة النووية مع ارتباط بالتوظيف.",
  obligation_en="A service commitment follows graduation, as with other national-programme "
                "sponsorships.",
  obligation_ar="يعقب التخرجَ التزامٌ بالخدمة، شأن سائر ابتعاثات البرامج الوطنية.",
  universities=("ku",))

S("emirates_cadet", "Emirates National Cadet Pilot Programme",
  "برنامج طيارو الإمارات الوطنيون",
  "Emirates Group", "مجموعة الإمارات",
  "employer", "uae_nationals", "sponsored_with_bond",
  ["undergraduate"], "dubai", AVIATION_FIELDS,
  None, [],
  "https://www.emiratesgroupcareers.com",
  "Fully sponsored flight training for Emirati cadets, from zero hours to a commercial "
  "licence and a first officer's seat. Selection is by aptitude testing, assessment days and "
  "a Class 1 medical rather than by academic average alone.",
  "تدريب طيران مموّل بالكامل للمتدربين الإماراتيين، من الصفر حتى رخصة الطيران التجاري ومقعد "
  "مساعد الطيار. الاختيار عبر اختبارات القدرات وأيام التقييم والفحص الطبي من الفئة الأولى، "
  "لا بالمعدل الأكاديمي وحده.",
  obligation_en="Sponsored cadets commit to fly for the airline for a fixed period. Failing "
                "the medical at any stage ends the route, so treat it as one option, never "
                "the only one.",
  obligation_ar="يلتزم المتدربون المبتعثون بالطيران لدى الناقل لمدة محددة. ويؤدي عدم اجتياز "
                "الفحص الطبي في أي مرحلة إلى إنهاء المسار، فتعامل معه كخيار من عدة خيارات لا "
                "كخيار وحيد.",
  universities=("eau",),
  note_en="Entry is by aptitude, assessment and medical rather than a percentage. "
          + INDICATIVE_EN,
  note_ar="القبول عبر القدرات والتقييم والفحص الطبي لا عبر نسبة مئوية. " + INDICATIVE_AR)

S("etihad_cadet", "Etihad Cadet Pilot Programme",
  "برنامج الاتحاد لتأهيل الطيارين",
  "Etihad Aviation Group", "مجموعة الاتحاد للطيران",
  "employer", "uae_nationals", "sponsored_with_bond",
  ["undergraduate"], "abu_dhabi", AVIATION_FIELDS,
  None, [],
  "https://www.etihad.com",
  "Abu Dhabi's sponsored route to an airline flight deck, training Emirati cadets through "
  "the airline's own academy. Same shape as the Emirates programme: aptitude and medical "
  "first, academics second.",
  "مسار أبوظبي المموّل إلى قمرة قيادة الطائرة، ويدرّب المتدربين الإماراتيين عبر أكاديمية "
  "الناقل. بنية مماثلة لبرنامج الإمارات: القدرات والفحص الطبي أولًا، ثم الجانب الأكاديمي.",
  obligation_en="A service commitment to the airline follows qualification.",
  obligation_ar="يعقب التأهيلَ التزامٌ بالخدمة لدى الناقل.",
  note_en="Entry is by aptitude, assessment and medical rather than a percentage. "
          + INDICATIVE_EN,
  note_ar="القبول عبر القدرات والتقييم والفحص الطبي لا عبر نسبة مئوية. " + INDICATIVE_AR)

S("mubadala_programmes", "Mubadala Development and Study Programmes",
  "برامج مبادلة للتطوير والدراسة",
  "Mubadala Investment Company", "شركة مبادلة للاستثمار",
  "employer", "uae_nationals", "sponsored_with_bond",
  ["undergraduate", "postgraduate"], "abu_dhabi",
  ENERGY_FIELDS + COMPUTING + BUSINESS_FIELDS + ["aerospace_engineering"],
  85, ["advanced", "elite"],
  "https://www.mubadala.com",
  "Sponsorship and graduate development schemes across the group's portfolio — aerospace, "
  "semiconductors, energy, healthcare and technology — aimed at Emirati students and early "
  "graduates.",
  "برامج ابتعاث وتطوير للخريجين عبر محفظة المجموعة — الفضاء وأشباه الموصلات والطاقة والرعاية "
  "الصحية والتقنية — وتستهدف الطلبة الإماراتيين وحديثي التخرج.",
  obligation_en="Sponsored places carry a service commitment to a group company.",
  obligation_ar="تترتب على المقاعد المموّلة التزامات بالخدمة لدى إحدى شركات المجموعة.")

S("dewa_sponsorship", "DEWA Scholarship and Sponsorship",
  "منح وابتعاث هيئة كهرباء ومياه دبي",
  "Dubai Electricity and Water Authority", "هيئة كهرباء ومياه دبي",
  "employer", "uae_nationals", "sponsored_with_bond",
  ["undergraduate"], "dubai",
  ["electrical_engineering", "mechanical_engineering", "civil_engineering",
   "environmental_engineering", "water_resources", "computer_engineering",
   "cybersecurity_major", "industrial_engineering", "structural_engineering",
   "quantity_surveying", "construction_management", "architecture"],
  80, ["advanced", "elite"],
  "https://www.dewa.gov.ae",
  "Sponsored engineering study for Emirati students entering Dubai's utility, with placement "
  "into the authority's own graduate scheme. A stable, infrastructure-side route rather than "
  "a corporate one.",
  "ابتعاث هندسي مموّل للطلبة الإماراتيين المتجهين إلى مرفق دبي، مع التحاق ببرنامج الخريجين "
  "لدى الهيئة. مسار بنية تحتية مستقر لا مسار شركات.",
  obligation_en="A service commitment follows graduation.",
  obligation_ar="يعقب التخرجَ التزامٌ بالخدمة.")

S("etisalat_du_graduate", "Telecom Graduate and Sponsorship Programmes",
  "برامج الاتصالات للخريجين والابتعاث",
  "e& and du", "اتصالات من e& ودو",
  "employer", "uae_nationals", "sponsored_with_bond",
  ["undergraduate"], "all",
  COMPUTING + ["electrical_engineering", "network_engineering", "marketing",
               "business_administration"],
  80, [],
  "https://www.eand.com",
  "The national telecom operators run Emiratisation-led sponsorship and graduate schemes in "
  "networks, cybersecurity, data and the commercial functions around them.",
  "يدير مشغّلا الاتصالات الوطنيان برامج ابتعاث وخريجين ضمن التوطين في الشبكات والأمن السيبراني "
  "والبيانات والوظائف التجارية المرتبطة بها.",
  obligation_en="Sponsored study is tied to employment with the operator.",
  obligation_ar="يرتبط الابتعاث بالعمل لدى المشغّل.",
  universities=("etisalat_academy",))

S("banking_finance_sponsorship", "Banking and Finance Sponsorships",
  "ابتعاث القطاع المصرفي والمالي",
  "Emirates Institute of Finance and UAE banks", "معهد الإمارات المالي والبنوك الوطنية",
  "employer", "uae_nationals", "sponsored_with_bond",
  ["undergraduate", "postgraduate"], "all",
  BUSINESS_FIELDS + ["actuarial_science", "data_science", "cybersecurity_major"],
  80, [],
  "https://www.eif.gov.ae",
  "The sector's national training institute and the major banks sponsor Emirati students into "
  "banking, Islamic finance, risk and compliance, usually with a job at the end.",
  "يبتعث المعهد الوطني للقطاع والبنوك الكبرى الطلبة الإماراتيين إلى الصيرفة والتمويل الإسلامي "
  "وإدارة المخاطر والامتثال، وعادةً مع وظيفة عند التخرج.",
  obligation_en="Sponsored places are tied to employment with the sponsoring bank.",
  obligation_ar="ترتبط المقاعد المموّلة بالعمل لدى البنك الراعي.",
  universities=("eif",))

# ======================= Sector programmes ===============================

S("uae_space_agency", "UAE Space Sector Scholarships",
  "منح قطاع الفضاء الإماراتي",
  "UAE Space Agency and MBRSC", "وكالة الإمارات للفضاء ومركز محمد بن راشد للفضاء",
  "sector", "uae_nationals", "full_plus_stipend",
  ["undergraduate", "postgraduate"], "all", SPACE_FIELDS,
  88, ["advanced", "elite"],
  "https://www.space.gov.ae",
  "Scholarships, research placements and training programmes feeding the national space "
  "programme — satellite engineering, remote sensing, planetary science and mission "
  "operations. A small number of places against a very specific national need.",
  "منح وفرص بحثية وبرامج تدريب تغذّي برنامج الفضاء الوطني — هندسة الأقمار الصناعية والاستشعار "
  "عن بُعد وعلوم الكواكب وعمليات المهام. عدد مقاعد صغير مقابل حاجة وطنية محددة جدًا.",
  universities=("ku", "uaeu", "aurak"))

S("rabdan_security", "Rabdan Academy Sponsored Programmes",
  "البرامج المموّلة في أكاديمية ربدان",
  "Rabdan Academy", "أكاديمية ربدان",
  "sector", "uae_nationals", "sponsored_with_bond",
  ["undergraduate", "postgraduate"], "abu_dhabi",
  ["homeland_security", "criminology", "public_administration", "public_policy",
   "military_science", "paramedic_science", "supply_chain"],
  75, [],
  "https://www.ra.ac.ae",
  "The safety, security and emergency-preparedness academy, with places sponsored by the "
  "entities its graduates join — policing, civil defence, defence and crisis management.",
  "أكاديمية السلامة والأمن والاستعداد للطوارئ، ومقاعدها ممولة من الجهات التي يلتحق بها "
  "الخريجون — الشرطة والدفاع المدني والدفاع وإدارة الأزمات.",
  obligation_en="Most places are tied to service with the sponsoring entity.",
  obligation_ar="ترتبط معظم المقاعد بالخدمة لدى الجهة الراعية.",
  universities=("rabdan",))

S("police_academy", "Policing and Civil Defence Sponsored Study",
  "الدراسة المموّلة في الشرطة والدفاع المدني",
  "UAE police academies", "أكاديميات الشرطة في الدولة",
  "sector", "uae_nationals", "sponsored_with_bond",
  ["undergraduate"], "all",
  ["criminology", "law", "homeland_security", "military_science", "psychology",
   "cybersecurity_major", "paramedic_science"],
  75, [],
  "https://www.moi.gov.ae",
  "Cadet routes that pay a salary from the first year rather than charging tuition, combining "
  "a degree with service training. Entry includes fitness and medical assessment.",
  "مسارات للطلبة الضباط تدفع راتبًا من السنة الأولى بدل تحصيل رسوم، وتجمع بين الدرجة العلمية "
  "والتدريب الخدمي. ويشمل القبول تقييمًا للياقة والفحص الطبي.",
  obligation_en="These are employment routes with a service commitment, not grants.",
  obligation_ar="هذه مسارات توظيف مرتبطة بالتزام خدمة، وليست منحًا.")

S("maritime_cadet", "Maritime Cadet Sponsorship",
  "ابتعاث الضباط البحريين",
  "Abu Dhabi Maritime Academy and UAE shipping operators",
  "أكاديمية أبوظبي البحرية ومشغّلو الشحن في الدولة",
  "sector", "all", "sponsored_with_bond",
  ["undergraduate"], "abu_dhabi", MARITIME_FIELDS,
  70, [],
  "https://www.admaritimeacademy.ae",
  "Deck and engine cadetships sponsored by shipping and port operators, with sea time built "
  "into the qualification. An under-subscribed route into a licensed profession with a global "
  "labour market.",
  "برامج تدريب لضباط سطح ومحركات ممولة من شركات الشحن ومشغّلي الموانئ، مع فترة إبحار مدمجة في "
  "المؤهل. مسار قليل الإقبال إلى مهنة مرخّصة ذات سوق عمل عالمية.",
  obligation_en="Cadetships carry a commitment to sail with the sponsoring operator.",
  obligation_ar="ترتبط برامج التدريب بالتزام الإبحار مع المشغّل الراعي.",
  universities=("khalifa_maritime",))

S("teaching_fellowship", "Teacher Preparation Scholarships",
  "منح إعداد المعلمين",
  "Emirates College for Advanced Education and the Ministry of Education",
  "كلية الإمارات للتعليم العالي ووزارة التربية والتعليم",
  "sector", "uae_nationals", "full_plus_stipend",
  ["undergraduate", "postgraduate"], "abu_dhabi", EDUCATION_FIELDS,
  75, [],
  "https://www.ecae.ac.ae",
  "Funded teacher-preparation places for Emirati students, with a school placement attached. "
  "Teaching is a declared national shortage, so this is one of the more reliably available "
  "funded routes.",
  "مقاعد ممولة لإعداد المعلمين الإماراتيين، مع تكليف مدرسي مرتبط بها. والتعليم نقص وطني معلن، "
  "ما يجعل هذا من المسارات الممولة الأكثر توافرًا.",
  universities=("ecae", "uaeu", "zu_ad"))

S("health_workforce", "Health Workforce Scholarships",
  "منح الكوادر الصحية",
  "UAE health authorities and hospital groups", "الجهات الصحية والمجموعات الاستشفائية في الدولة",
  "sector", "uae_nationals", "sponsored_with_bond",
  ["undergraduate", "postgraduate"], "all", HEALTH_FIELDS,
  85, ["advanced", "elite"],
  "https://www.mohap.gov.ae",
  "The health authorities and the large hospital groups fund nursing, medicine and allied "
  "health study for Emirati students, with clinical placement and employment attached. "
  "Nursing in particular is a standing national priority.",
  "تموّل الجهات الصحية والمجموعات الاستشفائية الكبرى دراسة التمريض والطب والعلوم الصحية "
  "المساندة للطلبة الإماراتيين، مع تدريب سريري وتوظيف. والتمريض تحديدًا أولوية وطنية دائمة.",
  obligation_en="Sponsored study is normally tied to a service period in the funding system.",
  obligation_ar="يرتبط الابتعاث عادةً بفترة خدمة داخل المنظومة المموِّلة.",
  universities=("mbru", "uaeu", "gmu", "rakmhsu"))

S("creative_industries", "Creative and Cultural Sector Grants",
  "منح القطاع الإبداعي والثقافي",
  "UAE cultural authorities and media zones", "الجهات الثقافية والمناطق الإعلامية في الدولة",
  "sector", "all", "partial_tuition",
  ["undergraduate", "postgraduate"], "all",
  CREATIVE_FIELDS + ["museum_studies", "architecture", "library_science"],
  None, [],
  "https://www.mcy.gov.ae",
  "Cultural authorities, film commissions and the media free zones fund study, residencies "
  "and production grants in design, film, heritage and the visual arts. Selection is usually "
  "on portfolio rather than on grades.",
  "تموّل الجهات الثقافية ولجان الأفلام والمناطق الإعلامية الحرة الدراسة والإقامات الفنية ومنح "
  "الإنتاج في التصميم والسينما والتراث والفنون البصرية. والاختيار عادةً بالملف الفني لا بالدرجات.",
  note_en="Portfolio-assessed rather than percentage-assessed. Start building the portfolio "
          "in grade 11. " + INDICATIVE_EN,
  note_ar="يُقيَّم بالملف الفني لا بالنسبة المئوية. ابدأ ببناء الملف في الصف الحادي عشر. "
          + INDICATIVE_AR)

S("need_based_hardship", "Need-Based and Hardship Support",
  "الدعم على أساس الحاجة والحالة المادية",
  "Most UAE universities", "معظم جامعات الدولة",
  "university", "all", "partial_tuition",
  ["undergraduate", "postgraduate"], "all",
  sorted(set(STEM_CORE + BUSINESS_FIELDS + HEALTH_FIELDS + EDUCATION_FIELDS
             + CREATIVE_FIELDS + PUBLIC_FIELDS)),
  None, [],
  "https://www.khda.gov.ae",
  "Nearly every institution in the country holds a hardship or need-based fund, and it is the "
  "least applied-for money in the system because students assume they will not qualify. Ask "
  "the admissions office directly — this is not always advertised on the website.",
  "تحتفظ كل مؤسسة تقريبًا في الدولة بصندوق للحالات المادية أو الحاجة، وهو أقل التمويل طلبًا في "
  "المنظومة لأن الطلبة يفترضون أنهم لن يستوفوا الشروط. اسأل مكتب القبول مباشرة — فهذا لا يُعلن "
  "دائمًا على الموقع.",
  note_en="Assessed on family circumstances, not on your average. A refusal one year does "
          "not bar an application the next. " + INDICATIVE_EN,
  note_ar="يُقيَّم بظروف الأسرة لا بمعدلك. ولا يمنع الرفض في سنة من التقديم في السنة التالية. "
          + INDICATIVE_AR)

S("postgrad_assistantship", "Graduate Teaching and Research Assistantships",
  "مساعدات التدريس والبحث للدراسات العليا",
  "Research universities in the UAE", "الجامعات البحثية في الدولة",
  "university", "all", "full_plus_stipend",
  ["postgraduate"], "all",
  sorted(set(STEM_CORE + ["biology", "chemistry", "biotechnology", "environmental_science",
                          "psychology", "economics", "statistics"])),
  None, [],
  "https://www.ku.ac.ae",
  "The standard way a master's or PhD is paid for anywhere in the world, and it exists here "
  "too: the department waives tuition and pays a stipend in exchange for teaching or research "
  "work. Applied for through the department, not the scholarships office.",
  "الطريقة المعتادة لتمويل الماجستير أو الدكتوراه في العالم، وهي قائمة هنا أيضًا: يعفي القسم "
  "من الرسوم ويدفع مخصصًا مقابل عمل تدريسي أو بحثي. ويُقدَّم الطلب عبر القسم لا عبر مكتب المنح.",
  universities=("ku", "uaeu", "mbzuai", "aus", "sharjah_univ"),
  note_en="Decided by a supervisor who wants you on their project, so contact academics "
          "directly and early. " + INDICATIVE_EN,
  note_ar="يقرّرها مشرف يرغب في انضمامك إلى مشروعه، لذا تواصل مع الأكاديميين مباشرة وفي وقت "
          "مبكر. " + INDICATIVE_AR)


S("hospitality_tourism", "Hospitality and Tourism Industry Scholarships",
  "منح قطاع الضيافة والسياحة",
  "UAE hospitality groups and tourism authorities",
  "مجموعات الضيافة وهيئات السياحة في الدولة",
  "sector", "all", "partial_tuition",
  ["undergraduate"], "dubai",
  ["hospitality_management", "tourism_management", "culinary_arts", "event_management",
   "business_administration", "marketing", "sports_science"],
  70, [],
  "https://www.visitdubai.com",
  "Hotel groups, tourism authorities and the specialist academies fund study in hospitality, "
  "culinary arts and event management, usually with paid placement inside the business from "
  "the first year. Entry thresholds are among the lowest of any funded route in the country.",
  "تموّل المجموعات الفندقية وهيئات السياحة والأكاديميات المتخصصة الدراسة في الضيافة وفنون "
  "الطهي وإدارة الفعاليات، وعادةً مع تدريب مدفوع داخل المنشأة من السنة الأولى. وعتبات القبول "
  "من أدنى ما يوجد بين المسارات الممولة في الدولة.",
  universities=("eahm", "ecc_culinary", "hct_dubai"))


S("agri_food_security", "Food Security and Agriculture Scholarships",
  "منح الأمن الغذائي والزراعة",
  "UAE food security and environment authorities", "جهات الأمن الغذائي والبيئة في الدولة",
  "sector", "all", "partial_tuition",
  ["undergraduate", "postgraduate"], "all",
  ["agriculture", "environmental_science", "biotechnology", "veterinary",
   "environmental_engineering", "water_resources", "nutrition"],
  75, [],
  "https://www.moccae.gov.ae",
  "Food security is a declared national priority and the agricultural sciences are chronically "
  "under-subscribed, so funded places in agri-tech, veterinary science and water resources "
  "compete against far fewer applicants than medicine or engineering do.",
  "الأمن الغذائي أولوية وطنية معلنة، والعلوم الزراعية يقل الإقبال عليها باستمرار، لذا تتنافس "
  "المقاعد الممولة في التقنية الزراعية والعلوم البيطرية وموارد المياه أمام عدد أقل بكثير من "
  "المتقدمين مقارنةً بالطب أو الهندسة.",
  universities=("uaeu", "aurak", "sharjah_univ"))
