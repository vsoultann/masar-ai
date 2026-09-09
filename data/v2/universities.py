"""UAE higher-education institutions.

Accuracy note, which the UI repeats to the student on every card and table:
admission thresholds, EmSAT bands and tuition bands here are **indicative**.
They are the shape of a typical requirement, not a quotation from an admissions
office, and they move year to year. Every institution record therefore carries
its official website, and the UI never phrases a comparison as a rejection.

Coordinates are approximate campus centroids, good enough to sort institutions
by travel distance and to place a map pin, not survey data.

No logos, crests or brand imagery are shipped -- see docs/DECISIONS.md.
"""

from v2.majors import MAJOR_IDS

# --- Major bundles -------------------------------------------------------
# Institutions offer overlapping families; naming the families keeps the rows
# readable and stops a 40-item list being retyped per campus.

ENG_CORE = ["civil_engineering", "mechanical_engineering", "electrical_engineering",
            "chemical_engineering", "industrial_engineering", "computer_engineering"]
ENG_WIDE = ENG_CORE + ["architecture", "environmental_engineering", "materials_engineering",
                       "mechatronics", "structural_engineering", "urban_planning"]
COMPUTING = ["computer_science", "software_engineering", "information_systems",
             "cybersecurity_major", "data_science", "artificial_intelligence"]
BUSINESS = ["business_administration", "accounting", "finance", "marketing",
            "human_resources", "economics"]
HEALTH_CORE = ["nursing", "pharmacy", "medical_laboratory", "public_health"]
# Allied health: taught by the health-sciences universities and the applied
# colleges rather than the medical schools.
ALLIED_HEALTH = ["radiography", "physiotherapy", "occupational_therapy",
                 "speech_therapy", "audiology", "optometry", "nutrition",
                 "health_informatics"]
HOSPITALITY = ["hospitality_management", "tourism_management", "culinary_arts",
               "event_management"]
MEDICAL = ["medicine", "dentistry"] + HEALTH_CORE
SCIENCE = ["mathematics", "physics", "chemistry", "biology", "statistics"]
EDUCATION = ["education_primary", "education_secondary", "special_education",
             "curriculum_design", "educational_counselling"]
MEDIA = ["mass_communication", "journalism", "graphic_design", "digital_media"]
LAW = ["law", "sharia_law"]

UNIVERSITIES: list[dict] = []


def U(uid, en, ar, short_en, short_ar, utype, emirate, city, lat, lng,
      website, established, langs, majors, min_pct, emsat, tracks,
      tuition, life_en, life_ar, addr_en, addr_ar,
      accreditation="CAA licensed"):
    """Expand a compact institution row into a full record."""
    unknown = [m for m in majors if m not in MAJOR_IDS]
    assert not unknown, f"{uid}: unknown majors {unknown}"
    UNIVERSITIES.append({
        "id": uid,
        "name": {"en": en, "ar": ar},
        "shortName": {"en": short_en, "ar": short_ar},
        "type": utype,
        "emirate": emirate,
        "city": city,
        "coordinates": {"lat": lat, "lng": lng},
        "address": {"en": addr_en, "ar": addr_ar},
        "website": website,
        "established": established,
        "accreditation": accreditation,
        "languageOfInstruction": langs,
        "majorsOffered": sorted(set(majors)),
        "admission": {
            "minHighSchoolPercent": min_pct,
            "emsatRequirements": emsat,
            "trackRequired": tracks,
            "notes": {
                "en": "Indicative only — confirm current requirements with the university.",
                "ar": "إرشادي فقط — يُرجى تأكيد المتطلبات الحالية مع الجامعة.",
            },
        },
        "tuitionBand": tuition,
        "campusLife": {"en": life_en, "ar": life_ar},
        "media": {
            "hero": f"/images/universities/{uid}.jpg",
            "thumbnail": f"/images/universities/{uid}-thumb.jpg",
            "gallery": [],
            "credit": None,
        },
    })


# ============================ Abu Dhabi =================================
U("uaeu", "United Arab Emirates University", "جامعة الإمارات العربية المتحدة",
  "UAEU", "جامعة الإمارات", "federal_public", "abu_dhabi", "al_ain",
  24.2039, 55.6764, "https://www.uaeu.ac.ae", 1976, ["en", "ar"],
  ENG_WIDE + COMPUTING + BUSINESS + MEDICAL + SCIENCE + EDUCATION + LAW +
  ["agriculture", "veterinary", "nutrition", "environmental_science", "geology",
   "translation", "islamic_studies", "psychology", "sociology",
   "biomedical_sciences"],
  80, {"english": 1250, "math": 900, "physics": 900}, ["advanced", "elite", "general"],
  "public_subsidised",
  "The country's oldest federal university, on a large purpose-built campus in Al Ain with separate men's and women's colleges, extensive laboratories and a teaching hospital link.",
  "أقدم جامعة اتحادية في الدولة، في حرم جامعي واسع بمدينة العين يضم كليات منفصلة للطلاب والطالبات ومختبرات واسعة وارتباطًا بمستشفى تعليمي.",
  "Sheikh Khalifa Bin Zayed Street, Al Ain", "شارع الشيخ خليفة بن زايد، العين")

U("ku", "Khalifa University of Science and Technology", "جامعة خليفة للعلوم والتكنولوجيا",
  "Khalifa University", "جامعة خليفة", "federal_public", "abu_dhabi", "abu_dhabi_city",
  24.4419, 54.6103, "https://www.ku.ac.ae", 2007, ["en"],
  ENG_WIDE + COMPUTING + SCIENCE +
  ["aerospace_engineering", "nuclear_engineering", "petroleum_engineering",
   "biomedical_engineering", "robotics", "space_engineering", "medicine"],
  85, {"english": 1400, "math": 1100, "physics": 1100}, ["advanced", "elite"],
  "public_subsidised",
  "Research-intensive and heavily engineering-weighted, with laboratories in robotics, nuclear energy and space systems, and strong graduate-research pathways.",
  "جامعة بحثية ذات ثقل هندسي كبير، تضم مختبرات في الروبوتات والطاقة النووية وأنظمة الفضاء، ومسارات قوية للدراسات العليا.",
  "Zone 1, Abu Dhabi", "المنطقة الأولى، أبوظبي")

U("mbzuai", "Mohamed bin Zayed University of Artificial Intelligence", "جامعة محمد بن زايد للذكاء الاصطناعي",
  "MBZUAI", "جامعة محمد بن زايد", "federal_public", "abu_dhabi", "abu_dhabi_city",
  24.4231, 54.6156, "https://mbzuai.ac.ae", 2019, ["en"],
  ["artificial_intelligence", "computer_science", "data_science", "robotics",
   "statistics", "mathematics"],
  90, {"english": 1400, "math": 1250}, ["advanced", "elite"],
  "free_for_nationals",
  "A graduate-focused AI institute; undergraduates normally enter after a first degree elsewhere, but its outreach and research programmes are open to strong school leavers.",
  "معهد متخصص في الذكاء الاصطناعي يركز على الدراسات العليا؛ يلتحق به الطلبة عادةً بعد درجة جامعية أولى، مع برامج تواصل وبحث متاحة للمتفوقين.",
  "Masdar City, Abu Dhabi", "مدينة مصدر، أبوظبي")

U("zu_ad", "Zayed University — Abu Dhabi", "جامعة زايد — أبوظبي",
  "Zayed University", "جامعة زايد", "federal_public", "abu_dhabi", "abu_dhabi_city",
  24.4093, 54.5089, "https://www.zu.ac.ae", 1998, ["en", "ar"],
  BUSINESS + COMPUTING + MEDIA + EDUCATION +
  ["public_administration", "international_relations", "psychology",
   "interior_design", "graphic_design", "tourism_management", "sociology"],
  75, {"english": 1100, "math": 700}, ["general", "advanced", "elite"],
  "public_subsidised",
  "Federal university with a strong communication, business and education profile, and a well-known emphasis on graduate employability.",
  "جامعة اتحادية ذات حضور قوي في الاتصال وإدارة الأعمال والتربية، مع تركيز معروف على تأهيل الخريجين لسوق العمل.",
  "Khalifa City, Abu Dhabi", "مدينة خليفة، أبوظبي")

U("adu", "Abu Dhabi University", "جامعة أبوظبي",
  "ADU", "جامعة أبوظبي", "private", "abu_dhabi", "abu_dhabi_city",
  24.3006, 54.5322, "https://www.adu.ac.ae", 2003, ["en"],
  ENG_WIDE + COMPUTING + BUSINESS + HEALTH_CORE + LAW +
  ["aviation_management", "public_health", "biotechnology", "psychology"],
  70, {"english": 1100, "math": 800}, ["general", "advanced", "elite"],
  "mid",
  "Large private university with campuses in Abu Dhabi, Al Ain and Dubai and a broad professional-degree portfolio.",
  "جامعة خاصة كبيرة لها فروع في أبوظبي والعين ودبي، وتقدّم مجموعة واسعة من البرامج المهنية.",
  "Al Ain Road, Abu Dhabi", "طريق العين، أبوظبي")

U("nyuad", "New York University Abu Dhabi", "جامعة نيويورك أبوظبي",
  "NYUAD", "نيويورك أبوظبي", "international_branch", "abu_dhabi", "abu_dhabi_city",
  24.5238, 54.4348, "https://nyuad.nyu.edu", 2010, ["en"],
  COMPUTING + SCIENCE + BUSINESS +
  ["economics", "political_science", "international_relations", "psychology",
   "film_production", "civil_engineering", "mechanical_engineering",
   "electrical_engineering", "biology", "environmental_science"],
  90, {"english": 1400, "math": 1100}, ["advanced", "elite"],
  "premium",
  "Highly selective liberal-arts and sciences campus on Saadiyat Island, with need-based aid and a strongly international student body.",
  "حرم جامعي شديد الانتقائية للعلوم والفنون الحرة في جزيرة السعديات، يقدّم مساعدات مالية قائمة على الحاجة ويضم طلبة من جنسيات متعددة.",
  "Saadiyat Island, Abu Dhabi", "جزيرة السعديات، أبوظبي")

U("sorbonne_ad", "Sorbonne University Abu Dhabi", "جامعة السوربون أبوظبي",
  "Sorbonne AD", "السوربون أبوظبي", "international_branch", "abu_dhabi", "abu_dhabi_city",
  24.4672, 54.3266, "https://www.sorbonne.ae", 2006, ["en", "ar"],
  BUSINESS + LAW +
  ["economics", "international_relations", "political_science", "sociology",
   "museum_studies", "translation", "photography"],
  75, {"english": 1100}, ["general", "advanced", "elite"],
  "premium",
  "French-model humanities, law and management degrees taught on Al Reem Island, with French language study built into most programmes.",
  "برامج في العلوم الإنسانية والقانون والإدارة وفق النموذج الفرنسي في جزيرة الريم، مع دراسة اللغة الفرنسية ضمن معظم البرامج.",
  "Al Reem Island, Abu Dhabi", "جزيرة الريم، أبوظبي")

U("rabdan", "Rabdan Academy", "أكاديمية ربدان",
  "Rabdan", "ربدان", "local_public", "abu_dhabi", "abu_dhabi_city",
  24.4008, 54.5695, "https://www.ra.ac.ae", 2013, ["en", "ar"],
  ["homeland_security", "public_administration", "business_administration",
   "criminology", "military_science", "paramedic_science", "public_policy"],
  70, {"english": 1100}, ["general", "advanced", "elite"],
  "public_subsidised",
  "Specialises in safety, security, defence and emergency preparedness, with programmes designed around serving professionals as well as school leavers.",
  "متخصصة في السلامة والأمن والدفاع والتأهب للطوارئ، ببرامج مصمّمة للمهنيين العاملين وخريجي الثانوية على حد سواء.",
  "Al Dhafra, Abu Dhabi", "الظفرة، أبوظبي")

U("adnoc_academy", "ADNOC Technical Academy", "أكاديمية أدنوك التقنية",
  "ATA", "أكاديمية أدنوك", "technical", "abu_dhabi", "ruwais",
  24.1103, 52.7306, "https://www.adnoc.ae", 1978, ["en"],
  ["petroleum_engineering", "chemical_engineering", "mechanical_engineering",
   "electrical_engineering", "industrial_engineering"],
  70, {"english": 1000, "math": 800, "physics": 800}, ["advanced", "elite"],
  "free_for_nationals",
  "Technical academy feeding the national energy sector, combining classroom study with plant-based training and a strong employment pathway.",
  "أكاديمية تقنية تغذّي قطاع الطاقة الوطني، تجمع بين الدراسة النظرية والتدريب داخل المنشآت مع مسار توظيف قوي.",
  "Ruwais, Al Dhafra", "الرويس، الظفرة")

U("ecae", "Emirates College for Advanced Education", "كلية الإمارات للتطوير التربوي",
  "ECAE", "كلية الإمارات", "local_public", "abu_dhabi", "abu_dhabi_city",
  24.4112, 54.5478, "https://www.ecae.ac.ae", 2007, ["en", "ar"],
  EDUCATION + ["psychology", "islamic_studies"],
  70, {"english": 1100, "math": 700}, ["general", "advanced", "elite"],
  "public_subsidised",
  "Dedicated teacher-education college with classroom placements from the first year.",
  "كلية متخصصة في إعداد المعلمين مع تدريب ميداني في المدارس منذ السنة الأولى.",
  "Al Muroor, Abu Dhabi", "المرور، أبوظبي")

U("kic", "Khawarizmi International College", "كلية الخوارزمي الدولية",
  "KIC", "الخوارزمي", "private", "abu_dhabi", "abu_dhabi_city",
  24.4275, 54.4453, "https://www.khawarizmi.com", 1985, ["en"],
  BUSINESS + COMPUTING + ["graphic_design", "interior_design", "health_informatics"],
  65, {"english": 1000}, ["general", "advanced", "elite"],
  "mid",
  "Applied college with small cohorts and a vocational, employment-first emphasis.",
  "كلية تطبيقية بأعداد طلابية صغيرة وتركيز مهني موجّه نحو التوظيف.",
  "Al Zahiyah, Abu Dhabi", "الزاهية، أبوظبي")

U("aau_alain", "Al Ain University", "جامعة العين",
  "AAU", "جامعة العين", "private", "abu_dhabi", "al_ain",
  24.1985, 55.7186, "https://www.aau.ac.ae", 1999, ["en", "ar"],
  BUSINESS + COMPUTING + LAW + ENG_CORE +
  ["pharmacy", "education_primary", "mass_communication", "psychology"],
  65, {"english": 1000, "math": 700}, ["general", "advanced", "elite"],
  "mid",
  "Private university with campuses in Al Ain and Abu Dhabi and a well-established pharmacy and law profile.",
  "جامعة خاصة لها حرمان في العين وأبوظبي، وتشتهر ببرامج الصيدلة والقانون.",
  "Al Ain University Street, Al Ain", "شارع جامعة العين، العين")


# ==================== Higher Colleges of Technology =====================
# HCT is one institution with many campuses. The brief asks for each campus as
# its own entry, which is also what the matching algorithm needs: a student in
# Fujairah should see the Fujairah campus, not a federal head office.

_HCT_MAJORS = (COMPUTING + BUSINESS + HOSPITALITY +
               ["nursing", "health_informatics", "mechanical_engineering",
                "electrical_engineering", "civil_engineering", "aviation_management",
                "education_primary", "graphic_design", "supply_chain",
                "radiography", "paramedic_science"])

_HCT_CAMPUSES = [
    ("hct_abu_dhabi", "Abu Dhabi", "أبوظبي", "abu_dhabi", "abu_dhabi_city", 24.4256, 54.4451),
    ("hct_al_ain", "Al Ain", "العين", "abu_dhabi", "al_ain", 24.2075, 55.7447),
    ("hct_madinat_zayed", "Madinat Zayed", "مدينة زايد", "abu_dhabi", "al_dhafra", 23.6503, 53.7006),
    ("hct_ruwais", "Ruwais", "الرويس", "abu_dhabi", "al_dhafra", 24.0906, 52.7300),
    ("hct_dubai", "Dubai", "دبي", "dubai", "dubai_city", 25.2166, 55.3647),
    ("hct_sharjah", "Sharjah", "الشارقة", "sharjah", "sharjah_city", 25.2937, 55.4756),
    ("hct_fujairah", "Fujairah", "الفجيرة", "fujairah", "fujairah_city", 25.1288, 56.3265),
    ("hct_ras_al_khaimah", "Ras Al Khaimah", "رأس الخيمة", "ras_al_khaimah", "rak_city", 25.6741, 55.9804),
]

for _cid, _campus_en, _campus_ar, _emirate, _city, _lat, _lng in _HCT_CAMPUSES:
    U(_cid,
      f"Higher Colleges of Technology — {_campus_en}", f"كليات التقنية العليا — {_campus_ar}",
      f"HCT {_campus_en}", f"كليات التقنية — {_campus_ar}",
      "federal_public", _emirate, _city, _lat, _lng,
      "https://www.hct.ac.ae", 1988, ["en"],
      _HCT_MAJORS, 70, {"english": 1100, "math": 700}, ["general", "advanced", "elite"],
      "public_subsidised",
      "Applied, employment-focused federal college. Programmes are built around work placements, and the campus network means most students can study close to home.",
      "كلية اتحادية تطبيقية موجّهة نحو التوظيف. تُبنى البرامج حول التدريب العملي، وتتيح شبكة الفروع لمعظم الطلبة الدراسة قرب مكان سكنهم.",
      f"{_campus_en} Campus", f"حرم {_campus_ar}")


# ============================== Dubai ===================================
U("zu_dubai", "Zayed University — Dubai", "جامعة زايد — دبي",
  "Zayed University", "جامعة زايد", "federal_public", "dubai", "dubai_city",
  25.1195, 55.3903, "https://www.zu.ac.ae", 1998, ["en", "ar"],
  BUSINESS + COMPUTING + MEDIA + EDUCATION +
  ["public_administration", "psychology", "interior_design", "tourism_management"],
  75, {"english": 1100, "math": 700}, ["general", "advanced", "elite"],
  "public_subsidised",
  "The Dubai campus of the federal university, in Academic City, with the same communication, business and education strengths.",
  "الحرم الجامعي في دبي التابع للجامعة الاتحادية، في المدينة الأكاديمية، بالتخصصات ذاتها في الاتصال والأعمال والتربية.",
  "Academic City, Dubai", "المدينة الأكاديمية، دبي")

U("mbru", "Mohammed Bin Rashid University of Medicine and Health Sciences", "جامعة محمد بن راشد للطب والعلوم الصحية",
  "MBRU", "جامعة محمد بن راشد", "local_public", "dubai", "dubai_city",
  25.1279, 55.2444, "https://www.mbru.ac.ae", 2016, ["en"],
  ["medicine", "dentistry", "nursing", "biomedical_sciences", "public_health",
   "medical_laboratory", "psychology", "health_informatics"] + ALLIED_HEALTH
  + ["radiation_therapy"],
  88, {"english": 1400, "math": 900, "physics": 900}, ["advanced", "elite"],
  "premium",
  "Dedicated medical and health-sciences university in Dubai Healthcare City, with teaching hospital placements from early in the programme.",
  "جامعة متخصصة في الطب والعلوم الصحية في مدينة دبي الطبية، مع تدريب في المستشفيات التعليمية منذ مراحل مبكرة من البرنامج.",
  "Dubai Healthcare City", "مدينة دبي الطبية")

U("aud", "American University in Dubai", "الجامعة الأمريكية في دبي",
  "AUD", "الأمريكية في دبي", "private", "dubai", "dubai_city",
  25.0964, 55.1631, "https://www.aud.edu", 1995, ["en"],
  BUSINESS + COMPUTING + MEDIA +
  ["architecture", "interior_design", "graphic_design", "mechanical_engineering",
   "electrical_engineering", "international_relations"],
  70, {"english": 1100}, ["general", "advanced", "elite"],
  "premium",
  "American-curriculum private university in Al Sufouh, known for architecture, design and communication.",
  "جامعة خاصة تتبع المنهج الأمريكي في الصفوح، معروفة ببرامج العمارة والتصميم والاتصال.",
  "Al Sufouh, Dubai", "الصفوح، دبي")

U("ud", "University of Dubai", "جامعة دبي",
  "UD", "جامعة دبي", "private", "dubai", "dubai_city",
  25.2285, 55.3906, "https://www.ud.ac.ae", 1997, ["en"],
  BUSINESS + COMPUTING + LAW + ["cybersecurity_major", "supply_chain"],
  70, {"english": 1100, "math": 700}, ["general", "advanced", "elite"],
  "mid",
  "Business and IT focused university beside Dubai Academic City, with accredited business programmes.",
  "جامعة تركّز على الأعمال وتقنية المعلومات بجوار المدينة الأكاديمية بدبي، ببرامج أعمال معتمدة.",
  "Academic City, Dubai", "المدينة الأكاديمية، دبي")

U("hw_dubai", "Heriot-Watt University Dubai", "جامعة هيريوت وات دبي",
  "Heriot-Watt Dubai", "هيريوت وات", "international_branch", "dubai", "dubai_city",
  25.0966, 55.1607, "https://www.hw.ac.uk/dubai", 2005, ["en"],
  ENG_CORE + COMPUTING + BUSINESS +
  ["architecture", "construction_management", "quantity_surveying",
   "interior_design", "psychology", "actuarial_science"],
  70, {"english": 1100, "math": 800}, ["general", "advanced", "elite"],
  "premium",
  "Dubai campus of the Scottish university, strongest in the built environment, engineering and actuarial subjects.",
  "الحرم الجامعي في دبي للجامعة الاسكتلندية، وأقوى برامجه في البيئة العمرانية والهندسة والعلوم الاكتوارية.",
  "Dubai Knowledge Park", "مجمع دبي للمعرفة")

U("middlesex_dubai", "Middlesex University Dubai", "جامعة ميدلسكس دبي",
  "Middlesex Dubai", "ميدلسكس", "international_branch", "dubai", "dubai_city",
  25.1122, 55.3865, "https://www.mdx.ac.ae", 2005, ["en"],
  BUSINESS + COMPUTING + MEDIA +
  ["psychology", "law", "mechanical_engineering", "electrical_engineering",
   "animation", "film_production", "sports_science"],
  65, {"english": 1000}, ["general", "advanced", "elite"],
  "mid",
  "Broad British-curriculum campus in Dubai Knowledge Park, with a wide spread of humanities and creative programmes.",
  "حرم جامعي بريطاني المنهج في مجمع دبي للمعرفة، بتنوع واسع في البرامج الإنسانية والإبداعية.",
  "Dubai Knowledge Park", "مجمع دبي للمعرفة")

U("bits_dubai", "BITS Pilani Dubai Campus", "بيتس بيلاني دبي",
  "BITS Dubai", "بيتس دبي", "international_branch", "dubai", "dubai_city",
  25.1290, 55.4131, "https://www.bits-pilani.ac.in/dubai", 2000, ["en"],
  ENG_CORE + COMPUTING + ["mechatronics", "biotechnology"],
  75, {"english": 1100, "math": 900, "physics": 900}, ["advanced", "elite"],
  "mid",
  "Engineering-focused Indian institute campus in Dubai International Academic City, with a competitive entrance route.",
  "فرع لمعهد هندسي هندي في المدينة الأكاديمية الدولية بدبي، بمسار قبول تنافسي.",
  "Dubai International Academic City", "المدينة الأكاديمية الدولية، دبي")

U("cud", "Canadian University Dubai", "الجامعة الكندية في دبي",
  "CUD", "الكندية في دبي", "international_branch", "dubai", "dubai_city",
  25.2048, 55.2708, "https://www.cud.ac.ae", 2006, ["en"],
  BUSINESS + COMPUTING + MEDIA +
  ["architecture", "interior_design", "environmental_science", "psychology",
   "electrical_engineering", "public_health"],
  65, {"english": 1000}, ["general", "advanced", "elite"],
  "mid",
  "Canadian-curriculum university on Sheikh Zayed Road, with design, business and health programmes.",
  "جامعة كندية المنهج على شارع الشيخ زايد، تقدّم برامج في التصميم والأعمال والصحة.",
  "City Walk, Sheikh Zayed Road, Dubai", "سيتي ووك، شارع الشيخ زايد، دبي")

U("amity_dubai", "Amity University Dubai", "جامعة أميتي دبي",
  "Amity Dubai", "أميتي", "international_branch", "dubai", "dubai_city",
  25.1178, 55.4090, "https://www.amityuniversity.ae", 2011, ["en"],
  BUSINESS + COMPUTING + ["biotechnology", "psychology", "fashion_design",
                          "mass_communication", "mechanical_engineering"],
  65, {"english": 1000}, ["general", "advanced", "elite"],
  "mid",
  "Indian-founded campus in Dubai International Academic City with business, IT and biotechnology programmes.",
  "حرم جامعي هندي النشأة في المدينة الأكاديمية الدولية بدبي، ببرامج في الأعمال وتقنية المعلومات والتقنية الحيوية.",
  "Dubai International Academic City", "المدينة الأكاديمية الدولية، دبي")

U("manipal_dubai", "Manipal Academy of Higher Education Dubai", "جامعة مانيبال دبي",
  "Manipal Dubai", "مانيبال", "international_branch", "dubai", "dubai_city",
  25.1245, 55.4045, "https://www.manipaldubai.com", 2000, ["en"],
  COMPUTING + BUSINESS +
  ["mechanical_engineering", "electrical_engineering", "civil_engineering",
   "biotechnology", "graphic_design", "interior_design", "fashion_design",
   "mass_communication"],
  65, {"english": 1000, "math": 700}, ["general", "advanced", "elite"],
  "mid",
  "Broad campus in Dubai International Academic City covering engineering, design and media.",
  "حرم جامعي واسع في المدينة الأكاديمية الدولية بدبي يغطي الهندسة والتصميم والإعلام.",
  "Dubai International Academic City", "المدينة الأكاديمية الدولية، دبي")

U("birmingham_dubai", "University of Birmingham Dubai", "جامعة برمنغهام دبي",
  "Birmingham Dubai", "برمنغهام", "international_branch", "dubai", "dubai_city",
  25.1078, 55.3805, "https://www.birmingham.ac.uk/dubai", 2018, ["en"],
  COMPUTING + BUSINESS + SCIENCE + EDUCATION +
  ["mechanical_engineering", "civil_engineering", "electrical_engineering",
   "economics", "psychology", "international_relations"],
  75, {"english": 1250, "math": 900}, ["advanced", "elite"],
  "premium",
  "Russell Group campus in Dubai International Academic City, teaching the same degrees as the UK parent.",
  "حرم جامعي لمجموعة راسل في المدينة الأكاديمية الدولية بدبي، يمنح الدرجات ذاتها الممنوحة في الجامعة الأم بالمملكة المتحدة.",
  "Dubai International Academic City", "المدينة الأكاديمية الدولية، دبي")

U("eau", "Emirates Aviation University", "جامعة الإمارات للطيران",
  "EAU", "الإمارات للطيران", "private", "dubai", "dubai_city",
  25.2532, 55.3657, "https://www.eau.ac.ae", 1991, ["en"],
  ["aerospace_engineering", "aircraft_maintenance", "aviation_management",
   "pilot_training", "air_traffic_management", "business_administration",
   "supply_chain", "mechanical_engineering"],
  70, {"english": 1100, "math": 800, "physics": 800}, ["advanced", "elite"],
  "mid",
  "Aviation-specialist university linked to the Dubai aviation sector, covering engineering, operations and flight training pathways.",
  "جامعة متخصصة في الطيران مرتبطة بقطاع الطيران في دبي، تغطي الهندسة والعمليات ومسارات التدريب على الطيران.",
  "Dubai International Airport area", "منطقة مطار دبي الدولي")

U("hbmsu", "Hamdan Bin Mohammed Smart University", "جامعة حمدان بن محمد الذكية",
  "HBMSU", "الجامعة الذكية", "local_public", "dubai", "dubai_city",
  25.1006, 55.1739, "https://www.hbmsu.ac.ae", 2002, ["en", "ar"],
  BUSINESS + COMPUTING + ["public_health", "health_informatics",
                          "education_primary", "public_administration"],
  70, {"english": 1000}, ["general", "advanced", "elite"],
  "public_subsidised",
  "Blended and online-first university, useful for students who need to study alongside work or family commitments.",
  "جامعة تعتمد التعلّم المدمج والإلكتروني أولًا، ومناسبة للطلبة الذين يجمعون بين الدراسة والعمل أو الالتزامات الأسرية.",
  "Dubai Academic City", "المدينة الأكاديمية، دبي")


# ============================= Sharjah ==================================
U("aus", "American University of Sharjah", "الجامعة الأمريكية في الشارقة",
  "AUS", "الأمريكية بالشارقة", "private", "sharjah", "sharjah_city",
  25.3113, 55.4919, "https://www.aus.edu", 1997, ["en"],
  ENG_WIDE + COMPUTING + BUSINESS + SCIENCE + MEDIA +
  ["international_relations", "psychology", "interior_design",
   "environmental_science", "translation"],
  80, {"english": 1250, "math": 900, "physics": 900}, ["advanced", "elite"],
  "premium",
  "Selective American-curriculum university in University City, consistently strong in engineering, architecture and business.",
  "جامعة انتقائية تتبع المنهج الأمريكي في المدينة الجامعية، وتتميّز باستمرار في الهندسة والعمارة وإدارة الأعمال.",
  "University City, Sharjah", "المدينة الجامعية، الشارقة")

U("sharjah_univ", "University of Sharjah", "جامعة الشارقة",
  "UoS", "جامعة الشارقة", "local_public", "sharjah", "sharjah_city",
  25.2903, 55.4830, "https://www.sharjah.ac.ae", 1997, ["en", "ar"],
  ENG_WIDE + COMPUTING + BUSINESS + MEDICAL + SCIENCE + LAW + MEDIA + EDUCATION +
  ["islamic_studies", "sharia_law", "dentistry", "physiotherapy", "nutrition",
   "psychology", "sociology", "translation", "architecture", "geology"]
  + ALLIED_HEALTH,
  75, {"english": 1100, "math": 800}, ["general", "advanced", "elite"],
  "public_subsidised",
  "Large comprehensive university with medical, dental and health colleges alongside engineering, sharia and humanities faculties.",
  "جامعة شاملة كبيرة تضم كليات الطب وطب الأسنان والعلوم الصحية إلى جانب الهندسة والشريعة والعلوم الإنسانية.",
  "University City, Sharjah", "المدينة الجامعية، الشارقة")

U("alqasimia", "Al Qasimia University", "جامعة القاسمية",
  "AQU", "القاسمية", "local_public", "sharjah", "sharjah_city",
  25.2951, 55.4735, "https://alqasimia.ac.ae", 2013, ["ar", "en"],
  ["islamic_studies", "sharia_law", "translation", "education_primary",
   "business_administration", "law"],
  70, {"english": 900}, ["general", "advanced", "elite"],
  "free_for_nationals",
  "Arabic-first university focused on Islamic studies, sharia and Arabic language, with a strongly international student body.",
  "جامعة تعتمد العربية أولًا وتركّز على الدراسات الإسلامية والشريعة واللغة العربية، وتضم طلبة من جنسيات متعددة.",
  "Al Rahmaniya, Sharjah", "الرحمانية، الشارقة")

U("skyline", "Skyline University College", "كلية سكاي لاين الجامعية",
  "Skyline", "سكاي لاين", "private", "sharjah", "sharjah_city",
  25.2874, 55.4692, "https://www.skylineuniversity.ac.ae", 1990, ["en"],
  BUSINESS + ["information_systems", "marketing", "supply_chain",
              "graphic_design", "digital_media"],
  60, {"english": 1000}, ["general", "advanced", "elite"],
  "mid",
  "Business-focused college with small classes and a practical, industry-linked teaching style.",
  "كلية تركّز على إدارة الأعمال بأعداد صغيرة في الصفوف وأسلوب تدريس عملي مرتبط بالقطاع.",
  "University City Road, Sharjah", "شارع المدينة الجامعية، الشارقة")

# ============================== Ajman ===================================
U("ajman_univ", "Ajman University", "جامعة عجمان",
  "AU", "جامعة عجمان", "private", "ajman", "ajman_city",
  25.3960, 55.4795, "https://www.ajman.ac.ae", 1988, ["en", "ar"],
  ENG_CORE + COMPUTING + BUSINESS + LAW + MEDIA +
  ["dentistry", "pharmacy", "architecture", "interior_design", "physiotherapy",
   "mass_communication", "education_primary"],
  70, {"english": 1100, "math": 700}, ["general", "advanced", "elite"],
  "mid",
  "Long-established private university with dentistry, pharmacy and engineering colleges and a compact single campus.",
  "جامعة خاصة عريقة تضم كليات طب الأسنان والصيدلة والهندسة في حرم جامعي واحد متقارب.",
  "University Street, Ajman", "شارع الجامعة، عجمان")

U("gmu", "Gulf Medical University", "جامعة الخليج الطبية",
  "GMU", "الخليج الطبية", "private", "ajman", "ajman_city",
  25.4051, 55.5136, "https://www.gmu.ac.ae", 1998, ["en"],
  ["medicine", "dentistry", "pharmacy", "nursing", "physiotherapy",
   "medical_laboratory", "public_health", "biomedical_sciences", "nutrition",
   "health_informatics", "psychology"] + ALLIED_HEALTH
  + ["radiation_therapy", "prosthetics_orthotics"],
  80, {"english": 1250, "math": 800, "physics": 800}, ["advanced", "elite"],
  "premium",
  "Private health-sciences university with its own teaching hospital network across the northern emirates.",
  "جامعة خاصة للعلوم الصحية لها شبكة مستشفيات تعليمية خاصة بها في الإمارات الشمالية.",
  "Al Jurf, Ajman", "الجرف، عجمان")

U("cua", "City University Ajman", "جامعة المدينة عجمان",
  "CUA", "المدينة عجمان", "private", "ajman", "ajman_city",
  25.3873, 55.4451, "https://www.cua.ac.ae", 2005, ["en"],
  BUSINESS + COMPUTING + ["architecture", "interior_design", "law",
                          "mass_communication"],
  60, {"english": 1000}, ["general", "advanced", "elite"],
  "mid",
  "Small private university offering business, IT and design degrees at accessible fee levels.",
  "جامعة خاصة صغيرة تقدّم برامج في الأعمال وتقنية المعلومات والتصميم برسوم في المتناول.",
  "Al Tallah 2, Ajman", "الطلة 2، عجمان")

# ========================= Umm Al Quwain ================================
U("uaq_univ", "University of Umm Al Quwain", "جامعة أم القيوين",
  "UAQU", "أم القيوين", "private", "umm_al_quwain", "uaq_city",
  25.5514, 55.5530, "https://uaqu.ac.ae", 2013, ["en", "ar"],
  BUSINESS + COMPUTING + ["law", "mass_communication", "interior_design",
                          "education_primary"],
  60, {"english": 1000}, ["general", "advanced", "elite"],
  "mid",
  "The emirate's own university, small and locally focused, serving students in the northern emirates.",
  "جامعة الإمارة، صغيرة الحجم وذات توجّه محلي، تخدم طلبة الإمارات الشمالية.",
  "Umm Al Quwain", "أم القيوين")

# ========================= Ras Al Khaimah ===============================
U("rakmhsu", "RAK Medical and Health Sciences University", "جامعة رأس الخيمة للطب والعلوم الصحية",
  "RAKMHSU", "رأس الخيمة الطبية", "private", "ras_al_khaimah", "rak_city",
  25.6741, 55.9432, "https://www.rakmhsu.ac.ae", 2006, ["en"],
  ["medicine", "dentistry", "pharmacy", "nursing", "medical_laboratory",
   "public_health", "biomedical_sciences"] + ALLIED_HEALTH,
  78, {"english": 1250, "math": 800, "physics": 800}, ["advanced", "elite"],
  "premium",
  "Health-sciences university in the northern emirates, with clinical placements in RAK hospitals.",
  "جامعة للعلوم الصحية في الإمارات الشمالية، مع تدريب سريري في مستشفيات رأس الخيمة.",
  "Al Juwais, Ras Al Khaimah", "الجويس، رأس الخيمة")

U("aurak", "American University of Ras Al Khaimah", "الجامعة الأمريكية في رأس الخيمة",
  "AURAK", "الأمريكية برأس الخيمة", "private", "ras_al_khaimah", "rak_city",
  25.7433, 55.9231, "https://aurak.ac.ae", 2009, ["en"],
  ENG_CORE + COMPUTING + BUSINESS +
  ["architecture", "international_relations", "biotechnology", "psychology",
   "mass_communication", "petroleum_engineering"],
  70, {"english": 1100, "math": 800}, ["general", "advanced", "elite"],
  "mid",
  "American-curriculum university with engineering, business and arts programmes and a quiet campus setting.",
  "جامعة تتبع المنهج الأمريكي ببرامج في الهندسة والأعمال والآداب في حرم جامعي هادئ.",
  "Al Jazeerah Al Hamra, Ras Al Khaimah", "الجزيرة الحمراء، رأس الخيمة")

# ============================= Fujairah =================================
U("uof", "University of Fujairah", "جامعة الفجيرة",
  "UoF", "جامعة الفجيرة", "private", "fujairah", "fujairah_city",
  25.1279, 56.3264, "https://uof.ac.ae", 2006, ["en", "ar"],
  BUSINESS + COMPUTING + ["law", "education_primary", "mass_communication",
                          "environmental_science"],
  60, {"english": 1000}, ["general", "advanced", "elite"],
  "mid",
  "The emirate's university on the east coast, giving Fujairah students a local option across business, IT and law.",
  "جامعة الإمارة على الساحل الشرقي، تتيح لطلبة الفجيرة خيارًا محليًا في الأعمال وتقنية المعلومات والقانون.",
  "Fujairah City", "مدينة الفجيرة")

# ===================== Specialist and sector institutes =================
U("eif", "Emirates Institute of Finance", "معهد الإمارات للتمويل",
  "EIF", "معهد التمويل", "technical", "sharjah", "sharjah_city",
  25.3462, 55.4209, "https://www.eibfs.ae", 1983, ["en", "ar"],
  ["finance", "accounting", "islamic_finance", "business_administration",
   "economics", "information_systems"],
  65, {"english": 1000, "math": 700}, ["general", "advanced", "elite"],
  "public_subsidised",
  "Banking and finance institute training much of the sector's national workforce, with campuses in Sharjah, Abu Dhabi and Dubai.",
  "معهد للمصارف والتمويل يدرّب جزءًا كبيرًا من الكوادر الوطنية في القطاع، وله فروع في الشارقة وأبوظبي ودبي.",
  "Al Nahda, Sharjah", "النهدة، الشارقة")

U("etisalat_academy", "Etisalat Academy", "أكاديمية اتصالات",
  "Etisalat Academy", "أكاديمية اتصالات", "technical", "dubai", "dubai_city",
  25.1786, 55.3862, "https://www.etisalatacademy.ae", 1983, ["en"],
  ["network_engineering", "cybersecurity_major", "information_systems",
   "computer_science", "business_administration"],
  65, {"english": 1000, "math": 700}, ["general", "advanced", "elite"],
  "mid",
  "Telecommunications and ICT training institute, oriented to professional certification and sector entry rather than long degrees.",
  "معهد تدريب في الاتصالات وتقنية المعلومات، موجّه نحو الشهادات المهنية ودخول القطاع أكثر من الدرجات الطويلة.",
  "Muhaisnah, Dubai", "محيصنة، دبي")

U("adsg", "Abu Dhabi School of Government", "مدرسة أبوظبي للحكومة",
  "ADSG", "أبوظبي للحكومة", "technical", "abu_dhabi", "abu_dhabi_city",
  24.4539, 54.3773, "https://www.adsg.abudhabi.ae", 2019, ["en", "ar"],
  ["public_administration", "public_policy", "business_administration",
   "human_resources", "data_science"],
  65, {"english": 1000}, ["general", "advanced", "elite"],
  "free_for_nationals",
  "Government-sector training school rather than a degree university: short professional programmes for public-service careers.",
  "مدرسة تدريب للقطاع الحكومي وليست جامعة تمنح درجات: برامج مهنية قصيرة لمهن الخدمة العامة.",
  "Abu Dhabi", "أبوظبي")

U("khalifa_maritime", "Abu Dhabi Maritime Academy", "أكاديمية أبوظبي البحرية",
  "ADMA", "البحرية", "technical", "abu_dhabi", "abu_dhabi_city",
  24.5028, 54.3826, "https://www.ports.ae", 2010, ["en"],
  ["maritime_studies", "marine_engineering", "supply_chain", "marine_science"],
  65, {"english": 1000, "math": 700, "physics": 700}, ["general", "advanced", "elite"],
  "public_subsidised",
  "Maritime training academy covering deck, engineering and port-operations pathways, with sea-time placements.",
  "أكاديمية تدريب بحري تغطي مسارات الملاحة والهندسة وعمليات الموانئ، مع تدريب بحري ميداني.",
  "Mina Zayed, Abu Dhabi", "ميناء زايد، أبوظبي")


# Hospitality and culinary degrees had no provider in the catalog at all, which
# left every chef and hotel career with an empty "where to study this" section.
U("eahm", "The Emirates Academy of Hospitality Management", "أكاديمية الإمارات للضيافة",
  "EAHM", "أكاديمية الضيافة", "private", "dubai", "dubai_city",
  25.1305, 55.1908, "https://www.emiratesacademy.edu", 2001, ["en"],
  HOSPITALITY + ["business_administration", "marketing", "event_management"],
  70, {"english": 1100}, ["general", "advanced", "elite"], "premium",
  "Specialist hospitality school with industry placements built into every year of the programme.",
  "مدرسة متخصصة في الضيافة يتضمن برنامجها تدريبًا عمليًا في القطاع كل سنة دراسية.",
  "Umm Suqeim, Dubai", "أم سقيم، دبي")

U("ecc_culinary", "International Centre for Culinary Arts", "المركز الدولي لفنون الطهي",
  "ICCA", "فنون الطهي", "technical", "dubai", "dubai_city",
  25.1867, 55.2635, "https://www.iccadubai.ae", 2005, ["en"],
  ["culinary_arts", "hospitality_management"],
  60, {"english": 900}, ["general", "advanced", "elite"], "mid",
  "Vocational culinary school running professional kitchen programmes and apprenticeship routes.",
  "مدرسة مهنية لفنون الطهي تقدّم برامج المطبخ الاحترافي ومسارات التلمذة الصناعية.",
  "Al Quoz, Dubai", "القوز، دبي")
