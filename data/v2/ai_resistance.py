"""AI-resistance: how exposed each career is to being displaced by AI.

Why this exists
---------------
"Will AI take this job?" is the single question students ask most about a
career in 2026, and until now the app had no answer to it. The mentor said so
explicitly -- "I cannot tell you what a technology will do to a profession" --
which was honest but a dead end for the student who came to ask exactly that.

What this module is, stated plainly
-----------------------------------
It is a **structural exposure index**, not a forecast. It answers a narrower
question than the one students ask, and the UI says so in those words:

    Not: "will this job exist in 2040?"
    But: "how much of this job is the kind of work machines are currently
          good at, and how much of it is the kind they are not?"

The score is derived entirely from fields the app already displays -- the
skill weights, the work environments, whether the role is licensed, how long
the training is -- so it can never contradict the data shown next to it, and a
student can audit every point of it. `drivers` carries that audit trail: each
component with its signed contribution, rendered in the UI as a breakdown
rather than hidden behind a number.

Nothing here is measured labour-market data. It is a weighted restatement of
the catalog, and `docs/DECISIONS.md` says so.

The model
---------
Every score starts at 50 -- "as exposed as an average job" -- and moves on five
components:

  1. Skill exposure     +/-22  What the role's weighted skills are made of.
  2. Physical presence  +/-12  Whether the work needs a body in a place.
  3. Accountability      0/+9  Whether a licensed human carries legal liability.
  4. Human stakes        0/+9  Whether the outcome turns on another person.
  5. Training depth      -3/+5 How long the supervised route in is.

And one subtraction that is applied on top, because it cuts across all five:

  6. Digital output     -13/0  Roles whose *product* is a file -- text, code,
                               an image, a model, a spreadsheet -- are the
                               most directly exposed, regardless of how
                               skilled the work is.

Determinism
-----------
No randomness, no network, no clock. The same catalog produces the same scores
byte for byte, so a rebuild diff only ever shows a real content change.
"""

from __future__ import annotations

# --------------------------------------------------------------------------
# 1. Per-skill exposure
# --------------------------------------------------------------------------
# automatability in [-1, +1]:
#   -1  the machine is already better at this than most practitioners
#    0  neutral -- AI changes the tooling, not the task
#   +1  the task resists automation for reasons that are not about capability
#       (physical presence, legal liability, or another person's trust)
#
# `group` selects the authored phrasing used to explain the skill in the UI.

SKILL_EXPOSURE: dict[str, tuple[float, str]] = {
    # --- generation: what current models do best -------------------------
    "programming":          (-0.70, "code"),
    "writing_docs":         (-0.75, "desk_synthesis"),
    "translation_skill":    (-0.80, "desk_synthesis"),
    "marketing_comm":       (-0.55, "desk_synthesis"),
    "journalism_reporting": (-0.30, "desk_synthesis"),
    "visual_design":        (-0.60, "visual"),
    "animation_3d":         (-0.55, "visual"),
    "photography_video":    (-0.35, "visual"),
    "fashion_textiles":     (-0.20, "visual"),
    "sound_audio":          (-0.40, "visual"),

    # --- pattern work over structured data -------------------------------
    "data_analysis":        (-0.60, "data"),
    "statistics":           (-0.35, "data"),
    "machine_learning":     (-0.30, "code"),
    "finance_accounting":   (-0.50, "routine_admin"),
    "quality_control":      (-0.30, "data"),
    "lab_diagnostics":      (-0.25, "diagnostic_pattern"),
    "diagnostic_imaging":   (-0.30, "diagnostic_pattern"),
    "geospatial_gis":       (-0.30, "data"),
    "logistics_ops":        (-0.25, "routine_admin"),
    "networking":           (-0.20, "code"),
    "cloud_infrastructure": (-0.25, "code"),
    "economics":            (-0.20, "inquiry"),
    "research_methods":     (-0.10, "inquiry"),
    "mathematics":          (-0.15, "inquiry"),
    "english_language":     (-0.30, "language_context"),
    "arabic_language":      (-0.10, "language_context"),

    # --- neutral: the tooling changes, the job does not ------------------
    "systems_design":       (0.00, "code"),
    "cybersecurity":        (0.10, "code"),
    "business_strategy":    (0.05, "inquiry"),
    "project_management":   (0.10, "persuasion_authority"),
    "problem_solving":      (0.05, "inquiry"),
    "attention_detail":     (-0.10, "data"),
    "creativity":           (0.15, "creative_direction"),
    "curation_heritage":    (0.30, "creative_direction"),
    "spatial_design":       (0.15, "creative_direction"),
    "sustainability":       (0.10, "inquiry"),
    "islamic_studies_skill": (0.35, "human_relationship"),
    "law_policy":           (0.15, "persuasion_authority"),
    "physics_reasoning":    (0.05, "inquiry"),
    "life_sciences":        (0.10, "inquiry"),
    "chemistry_lab":        (0.30, "hands_on"),

    # --- engineering with a physical consequence -------------------------
    "civil_structures":     (0.45, "physical_judgement"),
    "mechanical_design":    (0.30, "physical_judgement"),
    "electronics":          (0.35, "physical_judgement"),
    "energy_systems":       (0.40, "physical_judgement"),
    "manufacturing_ops":    (0.35, "hands_on"),
    "maritime_ops":         (0.55, "hands_on"),
    "aviation_ops":         (0.50, "physical_judgement"),
    "agriculture_food":     (0.45, "hands_on"),

    # --- a body, in a place, doing something irreversible ----------------
    "clinical_skills":      (0.70, "hands_on"),
    "surgical_skills":      (0.85, "hands_on"),
    "dental_skills":        (0.80, "hands_on"),
    "patient_care":         (0.80, "human_relationship"),
    "rehabilitation":       (0.75, "hands_on"),
    "veterinary_care":      (0.75, "hands_on"),
    "emergency_response":   (0.85, "hands_on"),
    "pharmacology":         (0.35, "hands_on"),
    "nutrition_diet":       (0.45, "human_relationship"),
    "culinary":             (0.70, "hands_on"),
    "hospitality_ops":      (0.55, "human_relationship"),
    "sports_coaching":      (0.70, "human_relationship"),

    # --- another person has to trust you ---------------------------------
    "counselling":          (0.80, "human_relationship"),
    "teaching":             (0.55, "human_relationship"),
    "child_development":    (0.80, "human_relationship"),
    "customer_service":     (0.25, "human_relationship"),
    "hr_people":            (0.40, "human_relationship"),
    "sales_negotiation":    (0.50, "persuasion_authority"),
    "public_speaking":      (0.55, "persuasion_authority"),
    "leadership":           (0.60, "persuasion_authority"),
    "teamwork":             (0.35, "human_relationship"),
}

# --------------------------------------------------------------------------
# 2. Work environment
# --------------------------------------------------------------------------
# Where the work happens is the cheapest honest signal there is. A job that can
# be done from a laptop is reachable by software; a job that needs a person in
# an operating theatre is not, whatever the software can do.

ENVIRONMENT_EXPOSURE: dict[str, float] = {
    "remote":            -1.00,
    "office":            -0.65,
    "teleradiology":     -0.55,
    "studio":            -0.10,
    "control_room":      -0.10,
    "classroom":          0.45,
    "laboratory":         0.55,
    "court":              0.55,
    "hotel":              0.60,
    "kitchen":            0.80,
    "plant":              0.80,
    "site":               0.85,
    "field":              0.85,
    "clinic":             0.85,
    "hospital":           0.90,
    "aircraft":           0.95,
    "vessel":             0.95,
    "operating_theatre":  1.00,
}

# --------------------------------------------------------------------------
# 3. The skills whose *output is a file*
# --------------------------------------------------------------------------
# Separate from the exposure table on purpose. A radiologist and a copywriter
# both score badly on "pattern work over structured data", but only one of them
# delivers a document as the product. Where the deliverable itself is something
# a model emits, exposure is higher than the skill mix alone suggests.

DIGITAL_OUTPUT_SKILLS = {
    "programming", "writing_docs", "translation_skill", "visual_design",
    "animation_3d", "data_analysis", "marketing_comm", "finance_accounting",
    "machine_learning", "geospatial_gis", "sound_audio", "statistics",
}

# --------------------------------------------------------------------------
# 4. Human-stakes skills
# --------------------------------------------------------------------------
# Not "soft skills". These are the skills where the work fails if the other
# person does not accept the outcome -- which is a constraint on deployment,
# not on capability.

HUMAN_STAKES_SKILLS = {
    "patient_care", "counselling", "teaching", "child_development",
    "customer_service", "hr_people", "sales_negotiation", "public_speaking",
    "leadership", "emergency_response", "sports_coaching", "hospitality_ops",
    "islamic_studies_skill", "nutrition_diet",
}

# --------------------------------------------------------------------------
# 5. Authored phrasing, by skill group
# --------------------------------------------------------------------------
# Two sentence pairs per group: what a model can already do to that kind of
# work, and what it cannot. Written once per group rather than per skill --
# seventy careers' worth of hand-written pairs would drift in tone and go stale
# the moment a skill weight changed.

GROUP_PHRASES: dict[str, dict[str, tuple[str, str]]] = {
    "code": {
        "exposed": (
            "Writing, completing and refactoring routine code — models now produce "
            "working implementations from a description faster than a person can type them",
            "كتابة الشيفرة الاعتيادية وإكمالها وإعادة هيكلتها — تنتج النماذج اليوم تنفيذًا عاملًا "
            "انطلاقًا من وصف نصي أسرع مما يكتبه الإنسان",
        ),
        "protected": (
            "Deciding what should be built and why, and owning the failure when a system "
            "behaves correctly and still does the wrong thing",
            "تقرير ما الذي ينبغي بناؤه ولماذا، وتحمّل المسؤولية حين يعمل النظام كما صُمّم "
            "ويؤدي مع ذلك إلى نتيجة خاطئة",
        ),
    },
    "desk_synthesis": {
        "exposed": (
            "First drafts, summaries, translations and routine correspondence — this is the "
            "task current models were built for and the one they do most cheaply",
            "المسودات الأولى والملخصات والترجمة والمراسلات الاعتيادية — وهي المهمة التي بُنيت "
            "لها النماذج الحالية وتؤديها بأقل كلفة",
        ),
        "protected": (
            "Knowing what is worth saying to this particular audience, and standing behind it "
            "when it is contested",
            "معرفة ما يستحق أن يُقال لهذا الجمهور تحديدًا، والدفاع عنه حين يُعترض عليه",
        ),
    },
    "data": {
        "exposed": (
            "Cleaning, joining and summarising structured data, and producing the standard "
            "charts and reports that follow from it",
            "تنظيف البيانات المهيكلة ودمجها وتلخيصها، وإنتاج الرسوم والتقارير المعيارية "
            "المترتبة عليها",
        ),
        "protected": (
            "Choosing the question the data is meant to answer, and recognising when the "
            "answer it gives is an artefact of how it was collected",
            "اختيار السؤال الذي يُفترض أن تجيب عنه البيانات، وإدراك متى تكون الإجابة نتيجةً "
            "لطريقة الجمع لا للواقع",
        ),
    },
    "visual": {
        "exposed": (
            "Generating concepts, variations and finished assets from a brief — the volume "
            "of production work that used to fill a junior's week",
            "توليد المفاهيم والبدائل والأصول النهائية انطلاقًا من موجز — أي حجم العمل الإنتاجي "
            "الذي كان يملأ أسبوع المصمّم المبتدئ",
        ),
        "protected": (
            "Art direction: holding a coherent point of view across a body of work, and "
            "defending a choice a client did not ask for",
            "الإدارة الفنية: الحفاظ على رؤية متماسكة عبر مجموعة أعمال، والدفاع عن خيار لم "
            "يطلبه العميل",
        ),
    },
    "routine_admin": {
        "exposed": (
            "Reconciliation, scheduling, classification and the rule-following parts of "
            "compliance — high-volume, well-specified, already largely software",
            "التسويات والجدولة والتصنيف والأجزاء القائمة على القواعد في الامتثال — عمل كبير "
            "الحجم ومحدّد بدقة وقد صار في معظمه برمجيًا",
        ),
        "protected": (
            "Judgement at the exception, where the rule does not fit the case and someone "
            "has to sign for the decision",
            "الحكم عند الاستثناء، حيث لا تنطبق القاعدة على الحالة ويتعيّن على شخص أن يوقّع "
            "على القرار",
        ),
    },
    "diagnostic_pattern": {
        "exposed": (
            "First-pass detection and triage on images and specimens — a genuinely strong "
            "machine task, and already deployed as a second reader",
            "الكشف الأولي والفرز على الصور والعينات — مهمة تتفوّق فيها الآلة فعليًا، وتُستخدم "
            "بالفعل كقارئ ثانٍ",
        ),
        "protected": (
            "Correlating the finding with the patient in front of you, and carrying the "
            "clinical and legal responsibility for the call",
            "ربط النتيجة بالمريض الماثل أمامك، وتحمّل المسؤولية السريرية والقانونية عن القرار",
        ),
    },
    "hands_on": {
        "exposed": (
            "Planning, documentation and the paperwork around the procedure — the parts that "
            "happen on a screen rather than on the patient, the plant or the plate",
            "التخطيط والتوثيق والأعمال الورقية المحيطة بالإجراء — أي الأجزاء التي تجري على "
            "الشاشة لا على المريض أو المنشأة أو الطبق",
        ),
        "protected": (
            "The procedure itself. This is skilled physical work in an unforgiving "
            "environment, and robotics — not language models — is its constraint",
            "الإجراء نفسه. هذا عمل بدني ماهر في بيئة لا تحتمل الخطأ، وقيده هو الروبوتات "
            "لا النماذج اللغوية",
        ),
    },
    "human_relationship": {
        "exposed": (
            "Preparation, note-taking, record-keeping and routine follow-up messages",
            "التحضير وتدوين الملاحظات وحفظ السجلات ورسائل المتابعة الاعتيادية",
        ),
        "protected": (
            "The relationship itself — this work only succeeds if another person trusts the "
            "human doing it, which is a constraint on deployment, not on capability",
            "العلاقة ذاتها — لا ينجح هذا العمل إلا إذا وثق شخص آخر بالإنسان الذي يؤديه، "
            "وهو قيد على التطبيق لا على القدرة",
        ),
    },
    "persuasion_authority": {
        "exposed": (
            "Research, briefing packs, first-draft arguments and meeting summaries",
            "البحث وحزم الإحاطة والحجج في مسوّدتها الأولى وملخصات الاجتماعات",
        ),
        "protected": (
            "Standing in the room with the authority to commit, and being the party the "
            "other side holds to the agreement",
            "الحضور في القاعة بصلاحية الالتزام، وأن تكون الطرف الذي يُحاسبه الطرف الآخر "
            "على الاتفاق",
        ),
    },
    "physical_judgement": {
        "exposed": (
            "Calculation, modelling, drawing production and code-compliance checking",
            "الحسابات والنمذجة وإنتاج الرسومات والتحقق من مطابقة الأكواد الهندسية",
        ),
        "protected": (
            "Signing the design. A stamped drawing carries personal liability for what "
            "happens if it is wrong, and liability does not transfer to a model",
            "التوقيع على التصميم. يحمل المخطط المختوم مسؤولية شخصية عمّا يحدث إن كان خاطئًا، "
            "والمسؤولية لا تنتقل إلى نموذج",
        ),
    },
    "creative_direction": {
        "exposed": (
            "Idea volume — a model will produce a hundred plausible directions before you "
            "finish describing the brief",
            "كمّ الأفكار — سينتج النموذج مئة اتجاه معقول قبل أن تنتهي من وصف الموجز",
        ),
        "protected": (
            "Taste and editing: choosing the one direction that is right for this context, "
            "which is a judgement about people rather than about options",
            "الذائقة والتحرير: اختيار الاتجاه الصحيح لهذا السياق تحديدًا، وهو حكم على الناس "
            "لا على الخيارات",
        ),
    },
    "inquiry": {
        "exposed": (
            "Literature review, background synthesis and the first pass at a method",
            "مراجعة الأدبيات وتجميع الخلفية والمحاولة الأولى لصياغة المنهج",
        ),
        "protected": (
            "Framing a question no one has asked yet, and being accountable for what is "
            "concluded from a weak result",
            "صياغة سؤال لم يطرحه أحد بعد، وتحمّل المسؤولية عمّا يُستنتج من نتيجة ضعيفة",
        ),
    },
    "language_context": {
        "exposed": (
            "Straight translation and routine bilingual production, including Arabic — "
            "machine translation is no longer the weak point it was",
            "الترجمة المباشرة والإنتاج ثنائي اللغة الاعتيادي، بما في ذلك العربية — لم تعد "
            "الترجمة الآلية نقطة الضعف التي كانت عليها",
        ),
        "protected": (
            "Register, dialect and cultural judgement: knowing what a phrase will mean to "
            "this audience in this country",
            "المستوى اللغوي واللهجة والحكم الثقافي: معرفة ما ستعنيه العبارة لهذا الجمهور في "
            "هذا البلد",
        ),
    },
}

# Skills worth building to raise a career's resistance, in priority order.
# Deliberately not "learn to prompt": these are the capabilities the exposure
# model itself scores highly, so the advice is consistent with the number.
HEDGE_POOL = [
    "leadership", "sales_negotiation", "public_speaking", "counselling",
    "teaching", "project_management", "systems_design", "cybersecurity",
    "problem_solving", "business_strategy", "creativity", "law_policy",
]

BANDS = [
    (75, "anchored"),
    (60, "resilient"),
    (45, "mixed"),
    (0, "exposed"),
]


def _weighted_exposure(skills: list[tuple[str, int]]) -> float:
    """Mean per-skill automatability, weighted by how much the role needs it."""
    total = sum(weight for _s, weight in skills)
    if total == 0:
        return 0.0
    score = 0.0
    for skill_id, weight in skills:
        value, _group = SKILL_EXPOSURE.get(skill_id, (0.0, "inquiry"))
        score += value * weight
    return score / total


def _environment_exposure(environments: list[str]) -> float:
    if not environments:
        return 0.0
    values = [ENVIRONMENT_EXPOSURE.get(env, 0.0) for env in environments]
    # The most physical environment dominates rather than being averaged away:
    # a surgeon who also does clinic paperwork is not half a desk job.
    return (max(values) * 2 + sum(values) / len(values)) / 3


def _digital_output_share(skills: list[tuple[str, int]]) -> float:
    total = sum(weight for _s, weight in skills)
    if total == 0:
        return 0.0
    hit = sum(weight for skill_id, weight in skills if skill_id in DIGITAL_OUTPUT_SKILLS)
    return hit / total


def _human_stakes_share(skills: list[tuple[str, int]]) -> float:
    total = sum(weight for _s, weight in skills)
    if total == 0:
        return 0.0
    hit = sum(weight for skill_id, weight in skills if skill_id in HUMAN_STAKES_SKILLS)
    return hit / total


def _band(score: int) -> str:
    for threshold, name in BANDS:
        if score >= threshold:
            return name
    return "exposed"


def _groups(skills: list[tuple[str, int]], limit: int) -> list[str]:
    """The distinct phrasing groups the role leans on, in its own weight order.

    Weight order matters: the first phrase a student reads should be about the
    skill the job is actually mostly made of.
    """
    seen: list[str] = []
    for skill_id, _weight in skills:
        _value, group = SKILL_EXPOSURE.get(skill_id, (0.0, "inquiry"))
        if group not in seen and group in GROUP_PHRASES:
            seen.append(group)
    return seen[:limit]


BAND_LABELS = {
    "anchored":  ("Anchored",  "راسخ"),
    "resilient": ("Resilient", "صامد"),
    "mixed":     ("Mixed",     "متفاوت"),
    "exposed":   ("Exposed",   "معرّض"),
}

SUMMARY = {
    "anchored": (
        "Most of this role is work that has to be done by a person, in a place, who can be "
        "held responsible for it. AI changes the tooling around it rather than the job "
        "itself.",
        "معظم هذا الدور عمل يجب أن يؤديه إنسان، في مكان محدّد، ويمكن مساءلته عنه. يغيّر الذكاء "
        "الاصطناعي الأدوات المحيطة به لا العمل نفسه.",
    ),
    "resilient": (
        "The routine and documentary parts of this role are already being automated, but its "
        "core — the judgement, the presence or the responsibility — is not the kind of thing "
        "current systems can take over.",
        "تُؤتمت بالفعل الأجزاء الروتينية والتوثيقية من هذا الدور، لكن جوهره — الحكم أو الحضور "
        "أو المسؤولية — ليس مما تستطيع الأنظمة الحالية تولّيه.",
    ),
    "mixed": (
        "This role splits roughly in half. A substantial part of it is work current systems "
        "do well, and the part that is left is where the career goes — so what you specialise "
        "in matters more here than in most jobs.",
        "ينقسم هذا الدور إلى نصفين تقريبًا. جزء كبير منه عمل تتقنه الأنظمة الحالية، والجزء "
        "المتبقي هو حيث يتجه المسار — لذا فإن ما تتخصّص فيه هنا أهم منه في معظم المهن.",
    ),
    "exposed": (
        "Much of what this role produces is the kind of output current systems generate "
        "directly. That does not mean the job disappears — it means the entry level thins "
        "first, and the work that remains sits further up, in direction and responsibility.",
        "كثير مما ينتجه هذا الدور من النوع الذي تولّده الأنظمة الحالية مباشرة. لا يعني ذلك "
        "اختفاء المهنة — بل أن المستوى المبتدئ يتقلّص أولًا، ويرتفع العمل المتبقي نحو التوجيه "
        "والمسؤولية.",
    ),
}

DRIVER_LABELS = {
    "skills":         ("What the work is made of", "مما يتكوّن العمل"),
    "presence":       ("Where it has to happen", "أين يجب أن يجري"),
    "accountability": ("Licensed responsibility", "المسؤولية المهنية المرخّصة"),
    "human":          ("Another person has to agree", "اشتراط قبول شخص آخر"),
    "training":       ("Depth of the training route", "عمق مسار التأهيل"),
    "digital":        ("Output is a file", "المُخرَج ملف رقمي"),
}

BASIS = (
    "A structural index derived from this catalog's skill weights, work settings, licensing "
    "and training length — not a labour-market forecast.",
    "مؤشر بنيوي مشتقّ من أوزان المهارات وبيئات العمل والترخيص وطول التأهيل في هذا الكتالوج — "
    "وليس تنبؤًا بسوق العمل.",
)

METHOD = (
    "Every career starts at 50 — as exposed as an average job — and moves on six components: "
    "what the work is made of (the weighted skill mix), where it has to happen, whether a "
    "licensed human carries legal responsibility for it, whether the outcome depends on "
    "another person agreeing, how long the training route is, and whether the thing the job "
    "produces is a file. Each component's contribution is shown on the career page, so the "
    "score can be checked rather than believed. It answers a narrow question — how much of "
    "this job is the kind of work machines are currently good at — and not the broad one "
    "students usually mean, which is whether the job will exist in twenty years. No one can "
    "answer that, and a number that pretended to would be worse than no number.",
    "تبدأ كل مهنة من 50 — أي بقدر تعرّض الوظيفة المتوسطة — ثم تتحرك وفق ستة عناصر: مما يتكوّن "
    "العمل (مزيج المهارات المرجّح)، وأين يجب أن يجري، وهل يتحمّل إنسان مرخَّص مسؤولية قانونية "
    "عنه، وهل تتوقف النتيجة على قبول شخص آخر، وكم يطول مسار التأهيل، وهل ما تنتجه المهنة ملف "
    "رقمي. ويُعرض إسهام كل عنصر في صفحة المهنة، كي يُتحقَّق من الدرجة لا أن تُصدَّق. وهو يجيب عن "
    "سؤال ضيّق — ما مقدار ما في هذه المهنة من عمل تتقنه الآلات اليوم — لا عن السؤال الواسع الذي "
    "يقصده الطلبة عادةً، وهو هل ستبقى المهنة بعد عشرين عامًا. لا أحد يستطيع الإجابة عن ذلك، "
    "ورقمٌ يدّعي الإجابة أسوأ من لا رقم.",
)


def _pair(pair: tuple[str, str]) -> dict[str, str]:
    return {"en": pair[0], "ar": pair[1]}


def glossary() -> dict:
    """The shared copy, written once to its own catalog file.

    The phrasing, the band summaries and the driver labels are identical across
    all 184 careers. Repeating them inside every career record grew careers.json
    by half a megabyte -- a file that a phone downloads to read one detail page.
    They live here instead, and a career record carries only the keys.
    """
    return {
        "basis": _pair(BASIS),
        "method": _pair(METHOD),
        "bands": {
            band: {"label": _pair(BAND_LABELS[band]), "summary": _pair(SUMMARY[band])}
            for band in BAND_LABELS
        },
        "groups": {
            group: {kind: _pair(phrases[kind]) for kind in ("exposed", "protected")}
            for group, phrases in GROUP_PHRASES.items()
        },
        "drivers": {key: _pair(value) for key, value in DRIVER_LABELS.items()},
        # The thresholds, so the UI can draw the scale rather than hard-code it.
        "thresholds": [{"from": threshold, "band": band} for threshold, band in BANDS],
    }


def assess(career: dict) -> dict:
    """Build the aiResistance block for one career record.

    `career` is a built v2 career (post-`build_career`), so this reads the same
    fields the UI renders. Copy lives in `glossary()`; this carries only the
    number and the keys that select the copy.
    """
    skills = [(entry["skill"], entry["requiredLevel"]) for entry in career["requiredSkills"]]
    environments = career["workEnvironment"]
    licensed = bool(career["educationPath"]["licensingBodies"])
    years = career["educationPath"]["typicalYears"]

    skill_component = _weighted_exposure(skills) * 22
    environment_component = _environment_exposure(environments) * 12
    accountability_component = 9.0 if licensed else 0.0
    human_component = min(_human_stakes_share(skills) * 9 * 2.2, 9.0)

    if years >= 6:
        training_component = 5.0
    elif years >= 5:
        training_component = 2.0
    elif years <= 2:
        training_component = -3.0
    else:
        training_component = 0.0

    digital_component = -_digital_output_share(skills) * 13

    raw = (
        50
        + skill_component
        + environment_component
        + accountability_component
        + human_component
        + training_component
        + digital_component
    )
    score = max(5, min(95, round(raw)))

    # The audit trail. Ordered by absolute size so the UI's first row is the
    # reason the score is what it is.
    drivers = [
        {"id": "skills", "effect": round(skill_component, 1)},
        {"id": "presence", "effect": round(environment_component, 1)},
        {"id": "accountability", "effect": round(accountability_component, 1)},
        {"id": "human", "effect": round(human_component, 1)},
        {"id": "training", "effect": round(training_component, 1)},
        {"id": "digital", "effect": round(digital_component, 1)},
    ]
    drivers.sort(key=lambda row: -abs(row["effect"]))

    # Hedge skills: the protective capabilities this role already touches come
    # first (they are realistic next steps, not a career change), then the
    # general pool. Never suggests a skill the role is already top-weighted on.
    already = {skill_id for skill_id, _w in skills[:4]}
    in_role = [
        skill_id for skill_id, _w in skills
        if skill_id in HEDGE_POOL and skill_id not in already
    ]
    general = [s for s in HEDGE_POOL if s not in already and s not in in_role]
    hedge = (in_role + general)[:4]

    exposed_skills = sorted(
        [(s, w) for s, w in skills if SKILL_EXPOSURE.get(s, (0.0, ""))[0] < -0.1],
        key=lambda row: -row[1],
    )
    protected_skills = sorted(
        [(s, w) for s, w in skills if SKILL_EXPOSURE.get(s, (0.0, ""))[0] > 0.1],
        key=lambda row: -row[1],
    )

    return {
        "score": score,
        "band": _band(score),
        # Both sides fall back to the role's overall skill order when one side
        # is empty, and for the anchored careers that is not a fudge -- it is
        # the most useful thing the panel can say. A surgeon has no skill in
        # this taxonomy that scores as exposed, but the `hands_on` group's
        # exposed phrasing ("planning, documentation and the paperwork around
        # the procedure") is exactly right for one, and a blank column would
        # have said nothing at all while looking broken.
        "exposedGroups": _groups(exposed_skills, 3) or _groups(skills, 2),
        "protectedGroups": _groups(protected_skills, 3) or _groups(skills, 2),
        "hedgeSkills": hedge,
        "drivers": drivers,
    }
