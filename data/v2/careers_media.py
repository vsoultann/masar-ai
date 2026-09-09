"""Media, design, culture — and the hospitality and services family."""

from v2.careers_base import C2

MEDIA_EN = ["broadcasters and production houses", "media free-zone companies", "government communication offices"]
MEDIA_AR = ["المحطات ودور الإنتاج", "شركات المناطق الإعلامية الحرة", "المكاتب الحكومية للاتصال"]
DESIGN_EN = ["design studios", "agencies", "in-house brand teams"]
DESIGN_AR = ["استوديوهات التصميم", "الوكالات", "فرق العلامة التجارية الداخلية"]
ART_SUBJ = {"english": 82, "arabic": 78, "social": 75, "computer_science": 70, "math": 58}
MEDIA_INITS = ["culture_strategy", "digital_economy_strategy", "nafis"]

C2("broadcast_presenter", "Broadcast Presenter", "مقدّم البرامج", "media", "moderate",
   (12000, 40000),
   "public_speaking:98 arabic_language:92 journalism_reporting:75 creativity:75 "
   "english_language:80 attention_detail:70",
   "22 62 82 82 88 62", "78 82 92 70 22", ART_SUBJ,
   ["mass_communication", "journalism"],
   "Presents news or programming live, holding an audience while working to the "
   "second and absorbing changes as they happen.",
   "يقدّم الأخبار أو البرامج على الهواء، محافظًا على انتباه الجمهور بينما يعمل وفق "
   "توقيت بالثانية ويستوعب التغييرات فور حدوثها.",
   MEDIA_EN, MEDIA_AR, MEDIA_INITS, years=4, envs=["studio"], icon="mic")

C2("content_creator", "Content Creator", "صانع المحتوى", "media", "very_high",
   (8000, 35000),
   "creativity:92 marketing_comm:88 photography_video:82 writing_docs:78 "
   "arabic_language:78 sales_negotiation:65",
   "35 58 92 72 85 55", "88 74 82 66 28", ART_SUBJ,
   ["digital_media", "mass_communication"],
   "Produces and distributes original content across platforms, and is "
   "responsible for both the making and the audience.",
   "ينتج محتوى أصليًا ويوزّعه عبر المنصات، وهو مسؤول عن الصناعة والجمهور معًا.",
   MEDIA_EN, MEDIA_AR, MEDIA_INITS, years=3, envs=["studio", "remote"], icon="video")

C2("video_editor", "Video Editor", "محرّر الفيديو", "media", "high", (9000, 26000),
   "photography_video:88 creativity:85 attention_detail:92 sound_audio:70 "
   "animation_3d:60 teamwork:70",
   "48 62 90 52 45 78", "84 86 42 68 26", ART_SUBJ,
   ["film_production", "digital_media"],
   "Assembles raw footage into a finished piece, making the pacing and structure "
   "decisions that determine whether it holds attention.",
   "يجمع اللقطات الخام في عمل نهائي، متخذًا قرارات الإيقاع والبنية التي تحدّد قدرته "
   "على شدّ الانتباه.",
   MEDIA_EN, MEDIA_AR, MEDIA_INITS, years=3, envs=["studio", "remote"], icon="film")

C2("cinematographer", "Cinematographer", "مدير التصوير", "media", "moderate",
   (12000, 38000),
   "photography_video:98 creativity:90 visual_design:82 teamwork:80 "
   "attention_detail:85 leadership:70",
   "78 62 92 62 65 68", "88 86 55 66 24", ART_SUBJ,
   ["film_production", "photography"],
   "Designs how a film looks — camera, lens and lighting — translating a "
   "director's intent into images.",
   "يصمّم الشكل البصري للفيلم من كاميرا وعدسة وإضاءة، فيترجم رؤية المخرج إلى صور.",
   MEDIA_EN, MEDIA_AR, MEDIA_INITS, years=4, envs=["studio", "field"], icon="camera")

C2("film_director", "Film Director", "المخرج", "media", "moderate", (14000, 50000),
   "creativity:98 leadership:88 public_speaking:75 photography_video:80 "
   "project_management:78 writing_docs:75",
   "45 68 98 72 82 58", "94 82 72 62 26", ART_SUBJ,
   ["film_production", "mass_communication"],
   "Makes the creative decisions across a production and directs everyone "
   "delivering them, from script through to final cut.",
   "يتخذ القرارات الإبداعية في العمل ويوجّه كل من ينفّذها، من النص حتى المونتاج النهائي.",
   MEDIA_EN, MEDIA_AR, MEDIA_INITS, years=5, envs=["studio", "field"], icon="clapperboard")

C2("photographer", "Photographer", "المصوّر الفوتوغرافي", "media", "moderate",
   (8000, 28000),
   "photography_video:98 creativity:90 visual_design:80 attention_detail:85 "
   "customer_service:70 marketing_comm:65",
   "72 58 95 62 68 62", "90 82 58 68 26", ART_SUBJ,
   ["photography", "digital_media"],
   "Makes images to a brief across editorial, commercial and event work, "
   "handling both the shoot and the post-production.",
   "ينتج الصور وفق متطلبات محددة في العمل الصحفي والتجاري والفعاليات، ويتولى التصوير "
   "والمعالجة اللاحقة معًا.",
   DESIGN_EN, DESIGN_AR, MEDIA_INITS, years=3, envs=["studio", "field"], icon="camera")

C2("graphic_designer", "Graphic Designer", "المصمّم الجرافيكي", "media", "very_high",
   (8000, 26000),
   "visual_design:95 creativity:92 attention_detail:85 marketing_comm:70 "
   "arabic_language:72 teamwork:72",
   "38 58 95 58 58 72", "90 84 48 70 26", ART_SUBJ,
   ["graphic_design", "digital_media"],
   "Designs visual communication across print and screen — and in this market "
   "must make Arabic and Latin type work together in one layout.",
   "يصمّم الاتصال البصري للمطبوع والشاشة، وعليه في هذا السوق أن يجعل الخطوط العربية "
   "واللاتينية تتناغم في تصميم واحد.",
   DESIGN_EN, DESIGN_AR, MEDIA_INITS, years=4, envs=["studio", "office"], icon="palette")

C2("motion_graphics_designer", "Motion Graphics Designer", "مصمّم الموشن جرافيك",
   "media", "high", (10000, 30000),
   "animation_3d:88 visual_design:88 creativity:90 photography_video:72 "
   "attention_detail:82 sound_audio:60",
   "45 62 95 52 55 75", "90 84 45 66 26", ART_SUBJ,
   ["animation", "graphic_design"],
   "Animates type, graphics and interface elements for broadcast, advertising "
   "and product work.",
   "يحرّك النصوص والرسومات وعناصر الواجهة للبث والإعلان وأعمال المنتجات.",
   DESIGN_EN, DESIGN_AR, MEDIA_INITS, years=4, envs=["studio", "remote"], icon="wand")

C2("three_d_artist", "3D Artist", "فنان ثلاثي الأبعاد", "media", "high", (11000, 32000),
   "animation_3d:95 visual_design:85 creativity:88 attention_detail:85 "
   "programming:55 problem_solving:70",
   "62 68 92 45 48 78", "90 84 38 62 26", ART_SUBJ,
   ["animation", "game_development"],
   "Builds and textures three-dimensional models for film, games, product "
   "visualisation and architectural presentation.",
   "يبني النماذج ثلاثية الأبعاد ويكسوها للأفلام والألعاب وعرض المنتجات والعروض المعمارية.",
   DESIGN_EN, DESIGN_AR, MEDIA_INITS, years=4, envs=["studio", "remote"], icon="box")

C2("animator", "Animator", "الرسّام المتحرك", "media", "high", (10000, 30000),
   "animation_3d:92 creativity:95 visual_design:85 attention_detail:85 "
   "arabic_language:60 teamwork:72",
   "48 58 98 58 48 72", "94 84 45 70 26", ART_SUBJ,
   ["animation", "film_production"],
   "Creates movement and performance frame by frame or through rigs, in a field "
   "with growing Arabic-language children's production.",
   "يصنع الحركة والأداء إطارًا بإطار أو عبر الهياكل التحريكية، في مجال ينمو فيه "
   "إنتاج محتوى الأطفال باللغة العربية.",
   MEDIA_EN, MEDIA_AR, MEDIA_INITS, years=4, envs=["studio"], icon="clapperboard")

C2("industrial_designer", "Industrial / Product Designer", "المصمّم الصناعي",
   "media", "moderate", (12000, 34000),
   "visual_design:88 creativity:92 mechanical_design:75 problem_solving:82 "
   "manufacturing_ops:65 project_management:65",
   "82 78 92 52 58 72", "92 86 45 62 24",
   {"math": 75, "physics": 78, "english": 80, "computer_science": 70, "social": 65},
   ["industrial_design", "mechanical_engineering"],
   "Designs physical products so they can be made, used and manufactured "
   "economically — form and production constraints together.",
   "يصمّم المنتجات المادية لتكون قابلة للتصنيع والاستخدام بكلفة معقولة، جامعًا بين "
   "الشكل وقيود الإنتاج.",
   DESIGN_EN + ["manufacturing groups"], DESIGN_AR + ["المجموعات الصناعية"],
   MEDIA_INITS + ["industrial_strategy"], years=4, envs=["studio", "office"], icon="box")

C2("interior_designer", "Interior Designer", "المصمّم الداخلي", "media", "very_high",
   (10000, 32000),
   "spatial_design:95 visual_design:88 creativity:90 project_management:72 "
   "customer_service:75 attention_detail:80",
   "62 62 95 68 68 75", "90 86 58 72 24", ART_SUBJ,
   ["interior_design", "architecture"],
   "Designs interior space for how it will actually be lived and worked in, "
   "coordinating with contractors through to handover.",
   "يصمّم الفراغ الداخلي بحسب طريقة استخدامه فعليًا للسكن أو العمل، وينسّق مع "
   "المقاولين حتى التسليم.",
   DESIGN_EN, DESIGN_AR, MEDIA_INITS, years=4, envs=["studio", "site"], icon="sofa")

C2("fashion_designer", "Fashion Designer", "مصمّم الأزياء", "media", "moderate",
   (8000, 30000),
   "fashion_textiles:95 creativity:95 visual_design:85 marketing_comm:70 "
   "attention_detail:82 sales_negotiation:60",
   "68 52 98 58 72 68", "94 82 58 66 28", ART_SUBJ,
   ["fashion_design", "graphic_design"],
   "Designs garments from concept through pattern and fitting, in a market with "
   "a strong modest-fashion and occasion-wear segment.",
   "يصمّم الملابس من الفكرة إلى الباترون والقياس، في سوق يمتاز بقطاع قوي للأزياء "
   "المحتشمة وملابس المناسبات.",
   DESIGN_EN + ["fashion houses and retail groups"], DESIGN_AR + ["دور الأزياء ومجموعات التجزئة"],
   MEDIA_INITS, years=4, envs=["studio"], icon="shirt")

C2("sound_engineer", "Sound Engineer", "مهندس الصوت", "media", "high", (9000, 28000),
   "sound_audio:98 attention_detail:92 electronics:70 creativity:78 "
   "teamwork:75 problem_solving:75",
   "82 72 82 52 45 82", "82 88 42 66 24",
   {"physics": 80, "math": 72, "english": 78, "computer_science": 75},
   ["sound_engineering", "film_production"],
   "Records, mixes and masters audio for music, film, broadcast and live events, "
   "where problems must be solved during the take, not after.",
   "يسجّل الصوت ويمزجه ويعالجه للموسيقى والأفلام والبث والفعاليات المباشرة، حيث "
   "تُحلّ المشكلات أثناء التسجيل لا بعده.",
   MEDIA_EN, MEDIA_AR, MEDIA_INITS, years=3, envs=["studio", "field"], icon="audio-lines")

C2("museum_curator", "Museum Curator", "أمين المتحف", "media", "moderate", (12000, 32000),
   "curation_heritage:95 research_methods:88 writing_docs:85 arabic_language:80 "
   "public_speaking:72 project_management:72",
   "35 88 85 72 55 82", "90 88 52 72 22", ART_SUBJ,
   ["museum_studies", "library_science"],
   "Researches, selects and interprets collections, and shapes what visitors "
   "understand from an exhibition.",
   "يبحث في المقتنيات وينتقيها ويفسّرها، ويشكّل ما يخرج به الزائر من فهم للمعرض.",
   ["museums and cultural foundations", "heritage authorities"],
   ["المتاحف والمؤسسات الثقافية", "هيئات التراث"],
   ["culture_strategy", "tourism_strategy_2031"], years=6, envs=["office", "field"],
   icon="landmark")

C2("heritage_conservation_specialist", "Heritage Conservation Specialist", "أخصائي حفظ التراث",
   "media", "moderate", (11000, 30000),
   "curation_heritage:95 chemistry_lab:70 attention_detail:98 research_methods:82 "
   "civil_structures:60 writing_docs:72",
   "78 85 78 62 42 88", "84 92 38 72 22", ART_SUBJ,
   ["museum_studies", "architecture"],
   "Stabilises and repairs historic buildings and objects, working to the "
   "principle that intervention should be reversible.",
   "يثبّت المباني والقطع التاريخية ويرمّمها، وفق مبدأ أن يكون التدخل قابلًا للعكس.",
   ["heritage authorities", "museums", "conservation consultancies"],
   ["هيئات التراث", "المتاحف", "مكاتب استشارات الترميم"],
   ["culture_strategy", "tourism_strategy_2031"], years=5, envs=["site", "laboratory"],
   icon="hammer")

# ------------------------------------------- hospitality, sport, services
C2("chef", "Chef", "الطاهي", "tourism", "very_high", (7000, 30000),
   "culinary:98 creativity:82 teamwork:88 quality_control:85 leadership:72 "
   "attention_detail:85",
   "92 52 88 68 68 78", "78 86 58 66 24",
   {"chemistry": 68, "english": 72, "arabic": 68, "biology": 65, "math": 60},
   ["culinary_arts", "hospitality_management"],
   "Runs a kitchen section or an entire kitchen, producing consistent food at "
   "volume under time pressure.",
   "يدير قسمًا في المطبخ أو المطبخ بأكمله، وينتج طعامًا متسق الجودة بكميات كبيرة "
   "تحت ضغط الوقت.",
   ["hotel groups", "restaurant operators", "catering companies"],
   ["مجموعات الفنادق", "مشغّلو المطاعم", "شركات التموين"],
   ["tourism_strategy_2031", "nafis"], years=3, envs=["kitchen"], icon="chef-hat")

C2("cabin_crew", "Airline Cabin Crew", "طاقم الضيافة الجوية", "tourism", "very_high",
   (8000, 20000),
   "customer_service:95 emergency_response:85 teamwork:92 english_language:88 "
   "arabic_language:70 attention_detail:78",
   "58 52 45 92 68 78", "72 88 82 82 20",
   {"english": 85, "arabic": 72, "social": 78, "biology": 60},
   ["hospitality_management", "aviation_management"],
   "Responsible for passenger safety first and service second, on a roster that "
   "crosses time zones continuously.",
   "مسؤول عن سلامة الركاب أولًا وعن الخدمة ثانيًا، وفق جدول عمل يعبر المناطق الزمنية باستمرار.",
   ["national airlines"], ["شركات الطيران الوطنية"],
   ["tourism_strategy_2031", "nafis"], years=1, envs=["aircraft"], icon="plane")

C2("sports_coach", "Sports Coach", "المدرّب الرياضي", "tourism", "high", (8000, 25000),
   "sports_coaching:95 teaching:85 leadership:85 counselling:70 teamwork:85 "
   "rehabilitation:60",
   "88 62 48 92 78 68", "70 88 82 78 20",
   {"biology": 78, "english": 72, "social": 78, "math": 58},
   ["sports_science", "education_secondary"],
   "Develops athletes technically and physically, and manages the motivation "
   "that determines whether training actually happens.",
   "يطوّر الرياضيين تقنيًا وبدنيًا، ويدير الدافعية التي تحدّد ما إذا كان التدريب "
   "سيحدث فعلًا.",
   ["sports clubs and academies", "school sports programmes", "national federations"],
   ["الأندية والأكاديميات الرياضية", "برامج الرياضة المدرسية", "الاتحادات الوطنية"],
   ["we_the_uae_2031", "nafis"], years=4, envs=["field"], icon="whistle")

C2("fitness_specialist", "Fitness and Wellness Specialist", "أخصائي اللياقة والعافية",
   "tourism", "very_high", (7000, 22000),
   "sports_coaching:88 nutrition_diet:75 counselling:75 teaching:80 "
   "customer_service:82 patient_care:65",
   "85 62 48 90 75 68", "72 86 82 80 22",
   {"biology": 80, "english": 74, "social": 74, "chemistry": 62},
   ["sports_science", "nutrition"],
   "Designs and delivers individual training and lifestyle programmes, in a "
   "market where preventive health is a growing public priority.",
   "يصمّم برامج التدريب الفردي وأنماط الحياة ويقدّمها، في سوق تتصاعد فيه أولوية "
   "الصحة الوقائية.",
   ["fitness groups", "hotel and resort operators", "corporate wellness programmes"],
   ["مجموعات اللياقة", "مشغّلو الفنادق والمنتجعات", "برامج العافية المؤسسية"],
   ["national_health_strategy", "we_the_uae_2031"], years=2, envs=["field"],
   icon="dumbbell")

C2("agriculture_specialist", "Agriculture and Food Security Specialist", "أخصائي الزراعة والأمن الغذائي",
   "energy", "high", (11000, 30000),
   "agriculture_food:95 sustainability:88 life_sciences:82 data_analysis:70 "
   "research_methods:75 problem_solving:78",
   "88 85 32 62 48 78", "78 88 40 70 22",
   {"biology": 90, "chemistry": 82, "math": 72, "english": 76, "physics": 65},
   ["agriculture", "environmental_science", "biotechnology"],
   "Develops food production that works in a desert climate — controlled "
   "environments, salt-tolerant crops and water-efficient systems.",
   "يطوّر إنتاجًا غذائيًا يصلح لمناخ صحراوي، عبر البيئات المحكومة والمحاصيل المتحملة "
   "للملوحة والأنظمة الموفّرة للمياه.",
   ["agriculture authorities", "agritech companies", "food security programmes"],
   ["هيئات الزراعة", "شركات التقنية الزراعية", "برامج الأمن الغذائي"],
   ["food_security_2051", "net_zero_2050", "we_the_uae_2031"], years=4,
   envs=["field", "laboratory"], icon="sprout")

C2("aquaculture_specialist", "Aquaculture Specialist", "أخصائي الاستزراع المائي",
   "energy", "moderate", (10000, 28000),
   "agriculture_food:88 life_sciences:88 sustainability:85 quality_control:78 "
   "lab_diagnostics:65 problem_solving:75",
   "90 85 28 55 45 78", "76 88 38 68 22",
   {"biology": 92, "chemistry": 80, "math": 70, "english": 74, "physics": 62},
   ["marine_science", "agriculture", "biology"],
   "Farms fish and marine species in controlled systems, managing water quality "
   "and stock health as a single problem.",
   "يستزرع الأسماك والكائنات البحرية في أنظمة محكومة، ويدير جودة المياه وصحة "
   "المخزون بوصفهما مشكلة واحدة.",
   ["aquaculture operators", "marine research centres", "food security programmes"],
   ["مشغّلو الاستزراع المائي", "مراكز البحوث البحرية", "برامج الأمن الغذائي"],
   ["food_security_2051", "we_the_uae_2031"], years=4,
   envs=["field", "laboratory"], icon="fish")

C2("travel_experience_designer", "Travel Experience Designer", "مصمّم تجارب السفر",
   "tourism", "high", (11000, 30000),
   "creativity:88 hospitality_ops:85 marketing_comm:80 project_management:75 "
   "curation_heritage:70 customer_service:82",
   "42 68 88 82 78 68", "90 84 72 76 24", ART_SUBJ,
   ["tourism_management", "hospitality_management", "event_management"],
   "Designs itineraries and destination experiences, increasingly built around "
   "heritage, desert and cultural tourism rather than shopping alone.",
   "يصمّم البرامج السياحية وتجارب الوجهات، ويبنيها بصورة متزايدة حول التراث "
   "والصحراء والثقافة لا التسوّق وحده.",
   ["tour operators", "destination management companies", "tourism authorities"],
   ["منظمو الرحلات", "شركات إدارة الوجهات", "هيئات السياحة"],
   ["tourism_strategy_2031", "culture_strategy", "nafis"], years=4,
   envs=["office", "field"], icon="map-pinned")

# Chef had no true neighbours in the catalog: `culinary` and `hospitality_ops`
# were held by one or two careers each, so relatedness fell back on generic
# skills and paired a chef with a cinematographer. These fill the family out.
C2("pastry_chef", "Pastry Chef", "طاهي المعجنات والحلويات", "tourism", "high",
   (7000, 26000),
   "culinary:95 creativity:88 attention_detail:92 quality_control:82 "
   "teamwork:75 fashion_textiles:20",
   "90 55 92 62 58 85", "84 90 48 66 24",
   {"chemistry": 72, "math": 65, "english": 70, "arabic": 66},
   ["culinary_arts", "hospitality_management"],
   "Produces desserts, breads and viennoiserie, where recipes behave like "
   "chemistry and a small error does not survive the oven.",
   "ينتج الحلويات والخبز والمعجنات، حيث تتصرف الوصفات كتفاعلات كيميائية ولا ينجو "
   "الخطأ الصغير من الفرن.",
   ["hotel groups", "restaurant operators", "specialist patisseries"],
   ["مجموعات الفنادق", "مشغّلو المطاعم", "محال الحلويات المتخصصة"],
   ["tourism_strategy_2031", "nafis"], years=3, envs=["kitchen"], icon="cake-slice")

C2("restaurant_manager", "Restaurant Manager", "مدير المطعم", "tourism", "very_high",
   (9000, 28000),
   "hospitality_ops:92 customer_service:90 leadership:85 culinary:45 "
   "finance_accounting:60 teamwork:85",
   "62 58 52 88 82 78", "68 88 82 74 24",
   {"english": 78, "arabic": 76, "math": 70, "social": 78},
   ["hospitality_management", "business_administration"],
   "Runs a restaurant's floor, staff, cost lines and guest experience, and "
   "carries the result of a bad service personally.",
   "يدير صالة المطعم وفريقه وبنود التكلفة وتجربة الضيوف، ويتحمّل شخصيًا نتيجة "
   "أي خدمة سيئة.",
   ["hotel groups", "restaurant operators", "hospitality investors"],
   ["مجموعات الفنادق", "مشغّلو المطاعم", "المستثمرون في الضيافة"],
   ["tourism_strategy_2031", "nafis"], years=3, envs=["hotel", "kitchen"], icon="utensils")

C2("food_safety_officer", "Food Safety Officer", "مسؤول سلامة الأغذية", "tourism",
   "very_high", (9000, 24000),
   "quality_control:95 agriculture_food:70 culinary:50 law_policy:75 "
   "attention_detail:95 lab_diagnostics:55",
   "72 82 25 62 52 95", "58 94 45 66 22",
   {"biology": 82, "chemistry": 80, "english": 76, "math": 65},
   ["nutrition", "public_health", "agriculture"],
   "Inspects kitchens and food businesses against hygiene regulation, and has "
   "the authority to stop a service that is unsafe.",
   "يفتّش المطابخ ومنشآت الأغذية وفق أنظمة السلامة الصحية، ويملك صلاحية إيقاف "
   "أي خدمة غير آمنة.",
   ["municipality food-control departments", "hotel groups", "catering companies"],
   ["إدارات الرقابة الغذائية في البلديات", "مجموعات الفنادق", "شركات التموين"],
   ["food_security_2051", "national_health_strategy", "we_the_uae_2031"],
   years=4, envs=["field", "kitchen"], icon="clipboard-check")

C2("front_office_manager", "Hotel Front Office Manager", "مدير مكتب الاستقبال",
   "tourism", "high", (9000, 26000),
   "hospitality_ops:92 customer_service:95 leadership:80 english_language:82 "
   "arabic_language:70 problem_solving:75",
   "42 58 48 92 80 82", "66 88 85 80 24",
   {"english": 82, "arabic": 76, "social": 80, "math": 66},
   ["hospitality_management", "tourism_management"],
   "Runs reception, reservations and guest relations, and is the person who "
   "resolves the complaint before it becomes a review.",
   "يدير الاستقبال والحجوزات وعلاقات الضيوف، وهو من يعالج الشكوى قبل أن تتحول "
   "إلى تقييم منشور.",
   ["hotel groups", "resort operators", "serviced-residence companies"],
   ["مجموعات الفنادق", "مشغّلو المنتجعات", "شركات الشقق الفندقية"],
   ["tourism_strategy_2031", "nafis"], years=3, envs=["hotel"], icon="concierge-bell")
