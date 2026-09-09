"""Composition of the repetitive parts of a career record.

Why this exists
---------------
v2 needs 170 careers, each with a two-to-three paragraph description, a
"day in the life" passage and a UAE-relevance note -- in English *and* Modern
Standard Arabic. Hand-writing 170 x 6 passages is not a realistic authoring
task, and the attempt would produce worse text than this does: it would drift in
tone, contradict the structured fields, and go stale the moment a salary band or
a skill weight changed.

So the distinctive facts are authored per career -- title, skills and weights,
ideal profile, education path, employers, initiatives -- and the connective
prose is assembled from them here. Every sentence this module emits is derived
from a field that is displayed elsewhere in the app, so the prose cannot
contradict the data next to it.

This is the same honesty the brief asks for around the synthetic dataset:
`docs/ML_METHODOLOGY.md` and `docs/DECISIONS.md` state plainly that long-form
career prose is generated from structured data rather than written by hand.

Determinism
-----------
Sentence-frame choice is keyed to a hash of the career id, never to random(),
so rebuilding the catalog produces byte-identical output and a diff only ever
shows real content changes.
"""

from __future__ import annotations

import hashlib

# --------------------------------------------------------------------------
# Sector framing
# --------------------------------------------------------------------------
# One authored sentence pair per sector, describing why the sector matters in
# the UAE. Used as the spine of the third paragraph.

SECTOR_CONTEXT: dict[str, tuple[str, str]] = {
    "ai_data": (
        "artificial intelligence is a declared national priority, and demand runs "
        "well ahead of the number of graduates the country produces",
        "يُعدّ الذكاء الاصطناعي أولوية وطنية معلنة، ويفوق الطلب عليه عدد الخريجين الذين تنتجهم الدولة",
    ),
    "cybersecurity": (
        "the rapid move of government and banking services online has made "
        "security work a standing national requirement rather than a specialism",
        "جعل الانتقال السريع للخدمات الحكومية والمصرفية إلى الإنترنت من العمل الأمني متطلبًا وطنيًا دائمًا لا تخصصًا هامشيًا",
    ),
    "software": (
        "almost every sector in the country now runs on software it commissions "
        "or builds, which keeps demand for engineers broad rather than confined "
        "to technology firms",
        "تعتمد معظم القطاعات في الدولة اليوم على برمجيات تطلبها أو تبنيها بنفسها، ما يبقي الطلب على المهندسين واسعًا لا محصورًا في شركات التقنية",
    ),
    "energy": (
        "the country is running a conventional energy industry and a large "
        "renewable and nuclear programme at the same time, so both skill sets are "
        "in demand",
        "تدير الدولة صناعة طاقة تقليدية وبرنامجًا كبيرًا للطاقة المتجددة والنووية في آنٍ واحد، ما يجعل المهارتين مطلوبتين معًا",
    ),
    "aviation": (
        "two of the world's busiest international hubs sit inside the country, "
        "and they sustain a deep local market for aviation skills",
        "يقع داخل الدولة اثنان من أكثر مراكز الطيران الدولية ازدحامًا في العالم، وهما يغذّيان سوقًا محليًا عميقًا لمهارات الطيران",
    ),
    "space": (
        "the national space programme has moved from ambition to launched "
        "missions, and it now needs engineers and analysts rather than only "
        "planners",
        "انتقل برنامج الفضاء الوطني من الطموح إلى مهمات أُطلقت فعلًا، وصار يحتاج إلى مهندسين ومحللين لا إلى مخططين فحسب",
    ),
    "healthcare": (
        "a growing and ageing population, combined with heavy investment in "
        "hospital capacity, keeps clinical roles among the most consistently "
        "recruited in the country",
        "يبقي النمو السكاني وتقدّم الأعمار، إلى جانب الاستثمار الكبير في الطاقة الاستيعابية للمستشفيات، المهنَ السريرية بين الأكثر طلبًا في الدولة باستمرار",
    ),
    "finance": (
        "the UAE functions as a regional financial centre, and its fintech and "
        "Islamic finance segments are growing faster than the sector as a whole",
        "تعمل الإمارات كمركز مالي إقليمي، وينمو قطاعا التقنية المالية والتمويل الإسلامي فيها أسرع من نمو القطاع ككل",
    ),
    "tourism": (
        "tourism is a deliberate pillar of economic diversification, and the "
        "sector recruits year-round rather than seasonally",
        "تمثّل السياحة ركيزة مقصودة لتنويع الاقتصاد، ويوظّف القطاع على مدار العام لا موسميًا",
    ),
    "construction": (
        "sustained construction and infrastructure programmes mean the built "
        "environment remains one of the largest employers of engineers",
        "تعني برامج البناء والبنية التحتية المستمرة أن قطاع البيئة العمرانية يظل من أكبر الجهات الموظِّفة للمهندسين",
    ),
    "logistics": (
        "the country's ports and free zones make it a regional transhipment "
        "centre, and logistics expertise carries directly into that trade",
        "تجعل موانئ الدولة ومناطقها الحرة منها مركزًا إقليميًا لإعادة الشحن، وتنتقل خبرة اللوجستيات مباشرة إلى هذه التجارة",
    ),
    "government": (
        "public-sector modernisation is an explicit national programme, and it "
        "recruits analysts and specialists alongside traditional administrators",
        "يمثّل تحديث القطاع العام برنامجًا وطنيًا صريحًا، وهو يوظّف المحللين والمتخصصين إلى جانب الإداريين التقليديين",
    ),
    "education": (
        "Emiratisation in teaching is an active policy priority, and national "
        "teachers are actively recruited across the school system",
        "يُعدّ توطين مهنة التدريس أولوية سياسية قائمة، ويجري توظيف المعلمين المواطنين بنشاط في مختلف مراحل التعليم",
    ),
    "media": (
        "the creative sector has grown around regional production and content "
        "hubs, and Arabic-language production in particular is expanding",
        "نما القطاع الإبداعي حول مراكز الإنتاج والمحتوى الإقليمية، ويتوسّع الإنتاج باللغة العربية على وجه الخصوص",
    ),
    "entrepreneurship": (
        "the country's free zones, incubators and licensing reforms have made "
        "founding a company an accessible path rather than an exceptional one",
        "جعلت المناطق الحرة والحاضنات وإصلاحات التراخيص من تأسيس الشركات مسارًا متاحًا لا استثنائيًا",
    ),
    "engineering": (
        "industrial diversification has broadened engineering demand well beyond "
        "oil and gas, into manufacturing, water and advanced industry",
        "وسّع التنويع الصناعي الطلب على الهندسة إلى ما هو أبعد من النفط والغاز، ليشمل التصنيع والمياه والصناعات المتقدمة",
    ),
    "law": (
        "a dual system of federal and free-zone law, and continuing regulatory "
        "reform, keep demand for legal expertise steady",
        "يُبقي النظام المزدوج للقوانين الاتحادية وقوانين المناطق الحرة، مع استمرار الإصلاح التنظيمي، الطلبَ على الخبرة القانونية ثابتًا",
    ),
    "social": (
        "community and family services are an established part of federal and "
        "local government provision, with structured professional pathways",
        "تمثّل خدمات المجتمع والأسرة جزءًا راسخًا من عمل الحكومة الاتحادية والمحلية، بمسارات مهنية منظمة",
    ),
}

# --------------------------------------------------------------------------
# Work environments
# --------------------------------------------------------------------------
ENVIRONMENTS: dict[str, tuple[str, str]] = {
    "hospital": ("a hospital", "مستشفى"),
    "clinic": ("an outpatient clinic", "عيادة خارجية"),
    "laboratory": ("a laboratory", "مختبر"),
    "office": ("an office", "مكتب"),
    "site": ("a construction or project site", "موقع إنشاء أو مشروع"),
    "plant": ("an industrial plant", "منشأة صناعية"),
    "studio": ("a studio", "استوديو"),
    "classroom": ("a classroom", "قاعة دراسية"),
    "field": ("the field", "الميدان"),
    "control_room": ("a control room", "غرفة تحكّم"),
    "aircraft": ("an aircraft or hangar", "طائرة أو حظيرة طائرات"),
    "vessel": ("a vessel or port", "سفينة أو ميناء"),
    "remote": ("remotely", "عن بُعد"),
    "court": ("a court or chambers", "محكمة أو مكتب محاماة"),
    "teleradiology": ("a reporting workstation", "محطة تقارير"),
    "hotel": ("a hotel or venue", "فندق أو منشأة ضيافة"),
    "kitchen": ("a professional kitchen", "مطبخ احترافي"),
    "operating_theatre": ("an operating theatre", "غرفة عمليات"),
}

DEMAND_PHRASE: dict[str, tuple[str, str]] = {
    "very_high": ("hiring is consistently strong", "التوظيف قوي باستمرار"),
    "high": ("hiring is steady", "التوظيف مستقر"),
    "moderate": ("hiring is steady but more selective", "التوظيف مستقر لكنه أكثر انتقائية"),
}


def _seed(career_id: str) -> int:
    """Stable per-career integer, so frame choice never shifts between builds."""
    return int(hashlib.sha256(career_id.encode("utf-8")).hexdigest()[:8], 16)


def _join_en(items: list[str], conjunction: str = "and") -> str:
    if not items:
        return ""
    if len(items) == 1:
        return items[0]
    return ", ".join(items[:-1]) + f" {conjunction} " + items[-1]


def _join_ar(items: list[str], conjunction: str = "و") -> str:
    """Arabic list join.

    The conjunction attaches to the word that follows it with no space, but
    needs a space before it: "الطب والجراحة والعلوم", never "الجراحةوالعلوم".
    Getting this wrong silently welds two words together, which is exactly what
    the first build did.
    """
    if not items:
        return ""
    if len(items) == 1:
        return items[0]
    if len(items) == 2:
        return f"{items[0]} {conjunction}{items[1]}"
    return "، ".join(items[:-1]) + f" {conjunction}" + items[-1]


def _years_ar(count: int) -> str:
    """Arabic number-noun agreement for years.

    3-10 takes the plural (سنوات); 11 and above takes the singular (سنة).
    Writing "11 سنوات" is the kind of error that makes Arabic copy read as
    machine output, so it is handled rather than ignored.
    """
    if count == 1:
        return "سنة واحدة"
    if count == 2:
        return "سنتان"
    if 3 <= count <= 10:
        return f"{count} سنوات"
    return f"{count} سنة"


def salary_tiers(low: int, high: int) -> dict:
    """Entry / mid / senior from the authored band.

    The band's endpoints are the entry and senior figures. Mid sits at 40% of
    the way up rather than the midpoint, because salary progression in these
    roles is consistently back-loaded -- the jump to senior is larger than the
    jump out of entry level.
    """
    return {
        "entry": low,
        "mid": int(round((low + (high - low) * 0.4) / 500.0) * 500),
        "senior": high,
        "period": "month",
        "currency": "AED",
        "note": {
            "en": "Indicative monthly range in AED; varies by employer, sector and experience.",
            "ar": "نطاق شهري إرشادي بالدرهم الإماراتي؛ يختلف حسب جهة العمل والقطاع والخبرة.",
        },
    }


def growth_trend(career_id: str, demand: str) -> list[int]:
    """A five-point index (2022..2026) for the animated sparkline.

    Indexed to 100 in 2022 and grown at a rate implied by the demand rating,
    with a small deterministic wobble so 170 sparklines are not 170 identical
    straight lines. This is a presentational illustration of a demand rating,
    not measured market data -- the UI labels it as such.
    """
    slope = {"very_high": 7.5, "high": 4.5, "moderate": 2.0}[demand]
    seed = _seed(career_id)
    points = []
    value = 100.0
    for year in range(5):
        wobble = ((seed >> (year * 3)) % 7) - 3          # -3..3
        value += slope + wobble * 0.4
        points.append(int(round(value)))
    return points


def compose_long_description(
    *, career_id, title_en, title_ar, short_en, short_ar, sector,
    top_skills, majors_en, majors_ar, years, licensing, demand,
    employers_en, employers_ar,
) -> tuple[str, str]:
    """Three paragraphs: what the work is, how you qualify, why it matters here."""
    seed = _seed(career_id)
    skills_en = _join_en([s[0] for s in top_skills])
    skills_ar = _join_ar([s[1] for s in top_skills])

    # --- paragraph 1: the work -------------------------------------------
    frames_en = [
        f"{short_en} The work centres on {skills_en}, and those three capabilities "
        f"are what distinguishes a strong practitioner from an adequate one.",
        f"{short_en} Day to day the role leans hardest on {skills_en}; everything "
        f"else in the job is built on top of those.",
        f"{short_en} It is a role defined by {skills_en} more than by any single "
        f"tool or employer.",
    ]
    frames_ar = [
        f"{short_ar} يتمحور العمل حول {skills_ar}، وهذه القدرات الثلاث هي ما يميّز "
        f"الممارس المتمكّن عن غيره.",
        f"{short_ar} يعتمد الدور يوميًا بدرجة أكبر على {skills_ar}؛ وكل ما عداه في "
        f"المهنة يُبنى فوق هذه الأسس.",
        f"{short_ar} إنه دور تحدّده {skills_ar} أكثر مما تحدّده أداة بعينها أو جهة عمل بعينها.",
    ]
    p1_en = frames_en[seed % len(frames_en)]
    p1_ar = frames_ar[seed % len(frames_ar)]

    # --- paragraph 2: the route in ---------------------------------------
    p2_en = (
        f"The usual route in is a degree in {_join_en(majors_en, 'or')}, with roughly "
        f"{years} years of study and supervised practice before working independently."
    )
    p2_ar = (
        f"المسار المعتاد للدخول إلى المهنة هو درجة جامعية في "
        f"{_join_ar(majors_ar, 'أو ')}، بنحو {_years_ar(years)} من الدراسة "
        f"والممارسة تحت إشراف قبل العمل باستقلالية."
    )
    if licensing:
        p2_en += (
            f" Practice in the UAE additionally requires licensing through "
            f"{_join_en([b['en'] for b in licensing])}, which sets its own "
            f"examination and experience requirements."
        )
        p2_ar += (
            f" وتتطلب الممارسة في دولة الإمارات ترخيصًا إضافيًا من "
            f"{_join_ar([b['ar'] for b in licensing])}، ولكلٍّ منها متطلباته "
            f"الخاصة من الاختبارات والخبرة."
        )

    # --- paragraph 3: why here -------------------------------------------
    context_en, context_ar = SECTOR_CONTEXT[sector]
    demand_en, demand_ar = DEMAND_PHRASE[demand]
    p3_en = (
        f"In the UAE, {context_en}. For this role specifically, {demand_en}, with "
        f"employers including {_join_en(employers_en)}."
    )
    p3_ar = (
        f"في دولة الإمارات، {context_ar}. وبالنسبة لهذا الدور تحديدًا، "
        f"{demand_ar}، ومن جهات العمل {_join_ar(employers_ar)}."
    )

    return ("\n\n".join([p1_en, p2_en, p3_en]),
            "\n\n".join([p1_ar, p2_ar, p3_ar]))


def compose_day_in_the_life(
    *, career_id, environments, top_skills, sector,
) -> tuple[str, str]:
    """A short passage grounded in the role's real environments and skills."""
    seed = _seed(career_id) >> 5
    envs_en = _join_en([ENVIRONMENTS[e][0] for e in environments])
    envs_ar = _join_ar([ENVIRONMENTS[e][1] for e in environments])
    first_en, first_ar = top_skills[0]
    second_en, second_ar = top_skills[1] if len(top_skills) > 1 else top_skills[0]

    frames_en = [
        f"Most of the working day happens in {envs_en}. The morning typically goes "
        f"to work that needs {first_en} while concentration is highest, with the "
        f"afternoon given over to {second_en} and to coordinating with colleagues "
        f"who depend on the output.",
        f"The setting is {envs_en}. Work arrives as a queue of cases or tasks rather "
        f"than one long project, so the day is a repeated cycle of assessing what is "
        f"in front of you, applying {first_en}, and handing on a clear result.",
        f"Expect to spend the day in {envs_en}, moving between focused individual "
        f"work that draws on {first_en} and collaborative sessions where {second_en} "
        f"matters more than technical depth.",
    ]
    frames_ar = [
        f"يجري معظم يوم العمل في {envs_ar}. يخصَّص الصباح عادةً للمهام التي تتطلب "
        f"{first_ar} حين يكون التركيز في أعلى مستوياته، بينما يُخصَّص بعد الظهر "
        f"لـ{second_ar} وللتنسيق مع الزملاء الذين يعتمدون على المُخرَجات.",
        f"بيئة العمل هي {envs_ar}. يصل العمل على هيئة سلسلة من الحالات أو المهام لا "
        f"كمشروع واحد طويل، فيصبح اليوم دورة متكررة من تقييم ما بين يديك، وتطبيق "
        f"{first_ar}، ثم تسليم نتيجة واضحة.",
        f"يُتوقّع أن يُقضى اليوم في {envs_ar}، بالتنقل بين عمل فردي مركّز يعتمد على "
        f"{first_ar}، وجلسات تعاونية تكون فيها {second_ar} أهم من العمق التقني.",
    ]
    return frames_en[seed % len(frames_en)], frames_ar[seed % len(frames_ar)]


def compose_uae_relevance(*, sector, initiatives_en, initiatives_ar) -> tuple[str, str]:
    context_en, context_ar = SECTOR_CONTEXT[sector]
    en = f"This role sits inside a national picture where {context_en}."
    ar = f"يقع هذا الدور ضمن مشهد وطني {context_ar}."
    if initiatives_en:
        en += f" It maps onto {_join_en(initiatives_en)}."
        ar += f" ويرتبط بـ{_join_ar(initiatives_ar)}."
    return en, ar
