"""The AI Virtual Mentor, in two interchangeable modes.

``anthropic`` mode calls the Claude Messages API with the student's profile and
recommendations injected as context.  ``offline`` mode answers from a retrieval
engine over the career and course catalogs.

The offline engine is not a fallback bolted on at the end -- it is the default,
and every demo runs on it unless a key is configured.  A graduation project that
stops working when a network call fails is a graduation project that fails
during the defence.  Both modes answer in English or Modern Standard Arabic.
"""
from __future__ import annotations

import re
import unicodedata
from typing import Any

from app.core.config import settings
from app.services.i18n import weeks as format_weeks

# ---------------------------------------------------------------------------
# Text normalisation (both languages)
# ---------------------------------------------------------------------------
_ARABIC_DIACRITICS = re.compile(r"[ً-ْـ]")
_NON_WORD = re.compile(r"[^\w؀-ۿ]+", re.UNICODE)


def normalise(text: str) -> str:
    """Fold case, strip Arabic diacritics and unify alef/ya/ta-marbuta forms."""
    text = unicodedata.normalize("NFKC", text or "").lower()
    text = _ARABIC_DIACRITICS.sub("", text)
    text = (text.replace("أ", "ا").replace("إ", "ا").replace("آ", "ا")
                .replace("ى", "ي").replace("ة", "ه"))
    return _NON_WORD.sub(" ", text).strip()


def _strip_article(word: str) -> str:
    """Drop the Arabic definite article.

    Arabic fuses "ال" onto the noun, so a student asking about "الطاقة
    المتجددة" produced no token overlap at all with a catalog entry stored as
    "طاقة متجددة".  This one rule fixed more failed lookups than every keyword
    list in this file combined.  The length guard keeps short words that simply
    begin with those two letters (e.g. "الف") intact.
    """
    if len(word) > 4 and word.startswith("ال"):
        return word[2:]
    return word


def tokens(text: str) -> set[str]:
    return {_strip_article(word) for word in normalise(text).split() if len(word) > 2}


# ---------------------------------------------------------------------------
# Intent detection
# ---------------------------------------------------------------------------
INTENT_KEYWORDS: dict[str, tuple[set[str], set[str]]] = {
    # intent: (english keywords, arabic keywords)
    "greeting": ({"hello", "hi", "hey", "salam", "greetings"},
                 {"مرحبا", "السلام", "اهلا", "صباح", "مساء"}),
    "salary": ({"salary", "pay", "wage", "earn", "income", "money", "aed", "dirham"},
               {"راتب", "الراتب", "رواتب", "اجر", "دخل", "درهم", "مال"}),
    "skills": ({"skill", "skills", "learn", "improve", "gap", "weak", "strong", "ability"},
               {"مهاره", "مهارات", "اتعلم", "تحسين", "فجوه", "ضعف", "قوه", "قدره"}),
    "courses": ({"course", "courses", "study", "certificate", "training", "roadmap",
                 "plan", "path"},
                {"دوره", "دورات", "ادرس", "شهاده", "تدريب", "خطه", "مسار", "برنامج"}),
    "university": ({"university", "degree", "college", "major", "bachelor", "admission",
                    "emsat"},
                   {"جامعه", "تخصص", "كليه", "بكالوريوس", "قبول", "امسات", "شهاده جامعيه"}),
    "sectors": ({"sector", "sectors", "industry", "industries", "field", "fields",
                 "demand", "market"},
                {"قطاع", "قطاعات", "مجال", "مجالات", "سوق", "الطلب", "صناعه"}),
    "recommendation": ({"recommend", "suggest", "best", "suit", "fit", "should",
                        "career", "job", "future"},
                       {"توصيه", "تنصح", "افضل", "يناسب", "مناسب", "مهنه", "وظيفه", "مستقبل"}),
    "why": ({"why", "reason", "because", "explain", "how did"},
            {"لماذا", "ليش", "سبب", "اشرح", "كيف"}),
    "help": ({"help", "what can you", "capabilities", "who are you"},
             {"مساعده", "ماذا تستطيع", "من انت", "ساعدني"}),
}


# When two intents tie, the earlier one in this list wins.  "Why was this
# recommended?" contains both "why" and "recommend"; the student is asking for
# an explanation, not for the list again.
INTENT_PRIORITY = ["why", "greeting", "help", "salary", "skills", "courses",
                   "university", "sectors", "recommendation", "search"]


def detect_intent(message: str) -> str:
    normalised = normalise(message)
    words = set(normalised.split())
    scores: dict[str, int] = {}
    for intent, (english, arabic) in INTENT_KEYWORDS.items():
        hits = len(words & english)
        # Arabic keywords are matched as substrings rather than whole tokens:
        # the definite article fuses onto the noun ("المهارات" for "مهارات"),
        # so a token test misses most real questions.
        hits += sum(1 for key in arabic if key in normalised)
        if hits:
            scores[intent] = hits
    if not scores:
        return "search"
    best = max(scores.values())
    for intent in INTENT_PRIORITY:
        if scores.get(intent) == best:
            return intent
    return max(scores, key=lambda key: scores[key])


# ---------------------------------------------------------------------------
# Offline retrieval engine
# ---------------------------------------------------------------------------
DEMAND_LABEL = {
    "very_high": ("very high", "مرتفع جداً"),
    "high": ("high", "مرتفع"),
    "moderate": ("moderate", "متوسط"),
}
LEVEL_LABEL = {
    "beginner": ("beginner", "مبتدئ"),
    "intermediate": ("intermediate", "متوسط"),
    "advanced": ("advanced", "متقدم"),
}
COST_LABEL = {"free": ("free", "مجاني"), "paid": ("paid", "مدفوع")}

# Words that describe *which* course a student wants rather than *what about*.
# "Free courses" is a filter on cost, not a search for the word "free" -- which
# is why an early version happily returned "Ports, Free Zones and Trade
# Operations" to a student asking for something free to start now.
COURSE_MODIFIERS: dict[str, tuple[str, str]] = {
    "free": ("cost", "free"), "مجاني": ("cost", "free"), "مجانيه": ("cost", "free"),
    "مجانا": ("cost", "free"),
    "paid": ("cost", "paid"), "مدفوع": ("cost", "paid"), "مدفوعه": ("cost", "paid"),
    "beginner": ("level", "beginner"), "مبتدئ": ("level", "beginner"),
    "intermediate": ("level", "intermediate"), "متوسط": ("level", "intermediate"),
    "advanced": ("level", "advanced"), "متقدم": ("level", "advanced"),
    "arabic": ("language", "ar"), "عربيه": ("language", "ar"), "عربي": ("language", "ar"),
    "english": ("language", "en"), "انجليزيه": ("language", "en"),
}

# Generic words that name the product rather than a topic.
GENERIC_TERMS = {"course", "courses", "certificate", "training", "programme", "program",
                 "دوره", "دورات", "شهاده", "تدريب", "برنامج", "مهنه", "وظيفه", "مهن"}


# Words that describe *which* course a student wants rather than *what about*.
# "Free courses" is a filter on cost, not a search for the word "free" -- which
# is why an early version happily returned "Ports, Free Zones and Trade
# Operations" to a student asking for something free to start now.
COURSE_MODIFIERS: dict[str, tuple[str, str]] = {
    "free": ("cost", "free"), "مجاني": ("cost", "free"), "مجانيه": ("cost", "free"),
    "مجانا": ("cost", "free"),
    "paid": ("cost", "paid"), "مدفوع": ("cost", "paid"), "مدفوعه": ("cost", "paid"),
    "beginner": ("level", "beginner"), "مبتدئ": ("level", "beginner"),
    "intermediate": ("level", "intermediate"), "متوسط": ("level", "intermediate"),
    "advanced": ("level", "advanced"), "متقدم": ("level", "advanced"),
    "arabic": ("language", "ar"), "عربيه": ("language", "ar"), "عربي": ("language", "ar"),
    "english": ("language", "en"), "انجليزيه": ("language", "en"),
}

# Generic words that name the product rather than a topic.
GENERIC_TERMS = {"course", "courses", "certificate", "training", "programme", "program",
                 "دوره", "دورات", "شهاده", "تدريب", "برنامج", "مهنه", "وظيفه", "مهن"}


class OfflineMentor:
    """Keyword retrieval over the catalogs, with templated bilingual answers."""

    def __init__(self, careers: list[dict], courses: list[dict],
                 skills: list[dict], sectors: list[dict]) -> None:
        self.careers = careers
        self.courses = courses
        self.skills = {s["id"]: s for s in skills}
        self.sectors = {s["id"]: s for s in sectors}
        self._career_tokens = {
            career["id"]: self._career_text(career) for career in careers
        }
        self._course_tokens = {
            course["id"]: self._course_text(course) for course in courses
        }
        # Vocabulary gate: the set of words that actually name something in our
        # domain.  A question like "what free courses should I start now?"
        # shares tokens ("start", "now") with dozens of course descriptions and
        # used to retrieve nonsense.  If a query has no overlap with this
        # vocabulary, we do not retrieve at all and answer from the student's
        # own roadmap instead.
        self._vocabulary: set[str] = set()
        for career_tokens in self._career_tokens.values():
            self._vocabulary |= career_tokens
        for skill in skills:
            self._vocabulary |= tokens(skill["name_en"] + " " + skill["name_ar"])
        for course in courses:
            self._vocabulary |= tokens(course["title_en"] + " " + course["title_ar"]
                                       + " " + course["provider"])
        self._vocabulary -= set(COURSE_MODIFIERS) | GENERIC_TERMS

    def _career_text(self, career: dict) -> set[str]:
        parts = [career["title_en"], career["title_ar"],
                 career.get("description_en", ""), career.get("description_ar", ""),
                 career["sector"].replace("_", " ")]
        sector = self.sectors.get(career["sector"], {})
        parts += [sector.get("name_en", ""), sector.get("name_ar", "")]
        for skill_id in career.get("skills", {}):
            skill = self.skills.get(skill_id, {})
            parts += [skill.get("name_en", ""), skill.get("name_ar", "")]
        parts += career.get("degrees_en", []) + career.get("degrees_ar", [])
        return tokens(" ".join(parts))

    def find_careers(self, message: str, limit: int = 3) -> list[dict]:
        query = self._domain_query(message)
        if not query:
            return []
        scored = []
        for career in self.careers:
            overlap = query & self._career_tokens[career["id"]]
            if not overlap:
                continue
            # Weight title matches higher than body matches: "tell me about
            # nursing" should return Nurse, not every career whose description
            # happens to mention patients.
            title = tokens(career["title_en"] + " " + career["title_ar"])
            score = len(overlap) + 3 * len(query & title)
            scored.append((score, career))
        scored.sort(key=lambda pair: pair[0], reverse=True)
        return [career for _, career in scored[:limit]]

    def _course_text(self, course: dict) -> set[str]:
        parts = [course["title_en"], course["title_ar"], course["provider"]]
        for skill_id in course["skills"]:
            skill = self.skills.get(skill_id, {})
            parts += [skill.get("name_en", ""), skill.get("name_ar", "")]
        return tokens(" ".join(parts))

    def _domain_query(self, message: str) -> set[str]:
        """Query tokens that actually name something in the catalogs."""
        return tokens(message) & self._vocabulary

    def find_courses(self, message: str, limit: int = 3) -> list[dict]:
        query = self._domain_query(message)
        if not query:
            return []
        scored = []
        for course in self.courses:
            overlap = query & self._course_tokens[course["id"]]
            if overlap:
                scored.append((len(overlap), course))
        scored.sort(key=lambda pair: pair[0], reverse=True)
        return [course for _, course in scored[:limit]]

    # -- answer composition -------------------------------------------------
    def answer(self, message: str, language: str, context: dict[str, Any]) -> str:
        intent = detect_intent(message)
        arabic = language == "ar"
        handler = getattr(self, f"_answer_{intent}", self._answer_search)
        return handler(message, arabic, context).strip()

    # each handler returns a full answer in the requested language
    def _answer_greeting(self, message: str, ar: bool, ctx: dict) -> str:
        name = ctx.get("name") or ("الطالب" if ar else "there")
        if ar:
            return (f"أهلاً {name}! أنا مرشدك المهني في «مسار». يمكنني أن أشرح لك "
                    "أي مهنة في دليلنا، وأقارن بين الرواتب والطلب في سوق العمل "
                    "الإماراتي، وأوضّح المهارات التي ينقصك اكتسابها، وأقترح دورات "
                    "محددة تبدأ بها. عمّ تحب أن نتحدث؟")
        return (f"Hello {name}! I am your Masar career mentor. I can explain any career "
                "in our catalog, compare salaries and demand in the UAE job market, show "
                "which skills you still need, and suggest specific courses to start with. "
                "What would you like to talk about?")

    def _answer_help(self, message: str, ar: bool, ctx: dict) -> str:
        if ar:
            return ("أستطيع مساعدتك في أربعة أمور:\n"
                    "١. شرح أي مهنة من ٦٠ مهنة في الدليل: المهام والمهارات والرواتب.\n"
                    "٢. تفسير سبب ترشيح مهنة معيّنة لك بناءً على درجاتك وميولك وشخصيتك.\n"
                    "٣. تحديد الفجوة بين مهاراتك الحالية ومتطلبات المهنة.\n"
                    "٤. اقتراح دورات محددة من ١٢٠ دورة، بينها خيارات مجانية وعربية.\n\n"
                    "اسألني مثلاً: «ما المهارات التي يحتاجها مهندس الطاقة المتجددة؟»")
        return ("I can help with four things:\n"
                "1. Explain any of the 60 careers in the catalog: the work, the skills, "
                "the salary range.\n"
                "2. Explain why a particular career was recommended to you, based on your "
                "grades, interests and personality.\n"
                "3. Show the gap between your current skills and what a career requires.\n"
                "4. Suggest specific courses from a catalog of 120, including free and "
                "Arabic-language options.\n\n"
                "Try asking: \"What skills does a renewable energy engineer need?\"")

    def _career_line(self, career: dict, ar: bool) -> str:
        salary = career.get("salary_aed", {})
        demand = DEMAND_LABEL.get(career.get("demand", "moderate"), ("", ""))[int(ar)]
        title = career["title_ar"] if ar else career["title_en"]
        low, high = salary.get("min", 0), salary.get("max", 0)
        if ar:
            return (f"• {title} — الراتب الشهري الإرشادي من {low:,} إلى {high:,} درهم، "
                    f"والطلب عليها {demand}.")
        return (f"• {title} - indicative monthly salary AED {low:,}-{high:,}, "
                f"demand is {demand}.")

    def _answer_salary(self, message: str, ar: bool, ctx: dict) -> str:
        careers = self.find_careers(message) or ctx.get("top_careers", [])[:3]
        if not careers:
            return ("لم أتعرّف على المهنة التي تسأل عنها. جرّب ذكر اسمها، مثل: «كم راتب "
                    "محلل الأمن السيبراني؟»" if ar else
                    "I could not tell which career you mean. Try naming it, for example: "
                    "\"What does a cybersecurity analyst earn?\"")
        lines = "\n".join(self._career_line(career, ar) for career in careers)
        if ar:
            return (f"إليك النطاقات المتاحة لدي:\n{lines}\n\n"
                    "هذه أرقام إرشادية للسوق الإماراتي وتختلف حسب جهة العمل وسنوات "
                    "الخبرة والمؤهل، ولا ينبغي اعتبارها عرضاً وظيفياً.")
        return (f"Here are the ranges I have:\n{lines}\n\n"
                "These are indicative figures for the UAE market. They vary with employer, "
                "years of experience and qualification, and should not be read as a job offer.")

    def _answer_skills(self, message: str, ar: bool, ctx: dict) -> str:
        careers = self.find_careers(message) or ctx.get("top_careers", [])[:1]
        if not careers:
            return self._answer_help(message, ar, ctx)
        career = careers[0]
        ranked = sorted(career.get("skills", {}).items(), key=lambda kv: -kv[1])[:6]
        title = career["title_ar"] if ar else career["title_en"]
        lines = []
        gaps = {g["skill_id"]: g for g in ctx.get("gaps", [])}
        for skill_id, weight in ranked:
            skill = self.skills.get(skill_id, {})
            name = skill.get("name_ar" if ar else "name_en", skill_id)
            gap = gaps.get(skill_id)
            if gap and gap["gap"] > 0:
                note = (f" — مستواك التقديري {gap['current']:.0f} مقابل {weight} المطلوبة"
                        if ar else
                        f" - your estimated level is {gap['current']:.0f} against {weight} required")
            else:
                note = ""
            lines.append(f"• {name} ({weight}/100){note}")
        body = "\n".join(lines)
        if ar:
            return (f"أهم المهارات المطلوبة لمهنة {title}:\n{body}\n\n"
                    "اسألني عن «دورات» لأي مهارة منها لأقترح عليك برامج محددة.")
        return (f"The most important skills for {title}:\n{body}\n\n"
                "Ask me about \"courses\" for any of these and I will suggest specific programmes.")

    def _course_line(self, course: dict, ar: bool) -> str:
        title = course["title_ar"] if ar else course["title_en"]
        level = LEVEL_LABEL[course["level"]][int(ar)]
        cost = COST_LABEL[course["cost"]][int(ar)]
        weeks = course["duration_weeks"]
        if ar:
            return (f"• {title} — {course['provider']}، المستوى {level}، "
                    f"{format_weeks(weeks, 'ar')}، {cost}.")
        return (f"• {title} - {course['provider']}, {level} level, "
                f"{weeks} weeks, {cost}.")

    def _answer_courses(self, message: str, ar: bool, ctx: dict) -> str:
        filters = {}
        for word in tokens(message):
            if word in COURSE_MODIFIERS:
                field, value = COURSE_MODIFIERS[word]
                filters[field] = value

        def keep(course: dict) -> bool:
            for field, value in filters.items():
                actual = course.get(field)
                # "Arabic" should match both Arabic-only and bilingual courses.
                if field == "language" and actual == "both":
                    continue
                if actual != value:
                    return False
            return True

        # Retrieval only wins when the question names an actual topic; otherwise
        # the student's own roadmap is the better answer.
        courses = self.find_courses(message, limit=8) if self._domain_query(message) else []
        if not courses and ctx.get("roadmap_courses"):
            courses = list(ctx["roadmap_courses"])
        unmet = False
        if filters:
            filtered = [course for course in courses if keep(course)]
            if filtered:
                courses = filtered
            elif courses:
                # Nothing matches every filter.  Show the closest results rather
                # than an empty answer, but say so -- silently ignoring what the
                # student asked for is worse than admitting the catalog's limit.
                unmet = True
            else:
                courses = [c for c in self.courses if keep(c)][:3]
        courses = courses[:3]
        if not courses:
            careers = self.find_careers(message) or ctx.get("top_careers", [])[:1]
            if careers:
                wanted = set(careers[0].get("skills", {}))
                courses = sorted(
                    (c for c in self.courses if wanted & set(c["skills"]) and keep(c)),
                    key=lambda c: -sum(v for k, v in c["skills"].items() if k in wanted),
                )[:3]
        if not courses:
            return ("أخبرني بالمهارة أو المهنة التي تريد التعلّم فيها وسأقترح دورات مناسبة."
                    if ar else
                    "Tell me the skill or career you want to learn and I will suggest courses.")
        body = "\n".join(self._course_line(course, ar) for course in courses)
        if ar:
            note = ("لا توجد دورة تحقّق كل الشروط التي ذكرتها، وهذه أقرب البدائل:\n"
                    if unmet else "دورات مقترحة:\n")
            return (f"{note}{body}\n\n"
                    "ابدأ بالدورة المجانية ذات المستوى الأقرب إليك، وأكمل خطتك الكاملة "
                    "من صفحة «خطة التعلّم» في لوحتك.")
        note = ("No course in the catalog matches all of those filters. Here are the "
                "closest options:\n" if unmet else "Suggested courses:\n")
        return (f"{note}{body}\n\n"
                "Start with the free course closest to your current level; your full "
                "phased plan is on the Learning Path section of your dashboard.")

    def _answer_university(self, message: str, ar: bool, ctx: dict) -> str:
        careers = self.find_careers(message) or ctx.get("top_careers", [])[:1]
        if not careers:
            return ("اذكر المهنة التي تفكر فيها وسأخبرك بالتخصصات الجامعية المرتبطة بها."
                    if ar else
                    "Name the career you are considering and I will list the degrees that lead to it.")
        career = careers[0]
        degrees = career.get("degrees_ar" if ar else "degrees_en", [])
        title = career["title_ar"] if ar else career["title_en"]
        listed = "\n".join(f"• {degree}" for degree in degrees)
        if ar:
            return (f"التخصصات الجامعية التي تقود إلى مهنة {title}:\n{listed}\n\n"
                    "تُدرَّس هذه التخصصات في جامعات إماراتية مثل جامعة الإمارات وجامعة "
                    "خليفة وجامعة زايد وكليات التقنية العليا وجامعة الشارقة. تحقّق من "
                    "شروط القبول ودرجة الإمسات المطلوبة لكل برنامج.")
        return (f"Degrees that lead to {title}:\n{listed}\n\n"
                "These are offered at UAE institutions such as UAE University, Khalifa "
                "University, Zayed University, the Higher Colleges of Technology and the "
                "University of Sharjah. Check each programme's admission requirements and "
                "the EmSAT score it asks for.")

    def _answer_sectors(self, message: str, ar: bool, ctx: dict) -> str:
        by_sector: dict[str, list[dict]] = {}
        for career in self.careers:
            if career.get("demand") == "very_high":
                by_sector.setdefault(career["sector"], []).append(career)
        lines = []
        for sector_id, careers in sorted(by_sector.items(), key=lambda kv: -len(kv[1]))[:6]:
            sector = self.sectors.get(sector_id, {})
            name = sector.get("name_ar" if ar else "name_en", sector_id)
            examples = ", ".join((c["title_ar"] if ar else c["title_en"])
                                 for c in careers[:2])
            lines.append(f"• {name} — {examples}" if ar else f"• {name} - {examples}")
        body = "\n".join(lines)
        if ar:
            return ("القطاعات ذات الطلب المرتفع جداً في دليلنا:\n" + body +
                    "\n\nترتبط هذه القطاعات مباشرة بمبادرات مثل الاستراتيجية الوطنية "
                    "للذكاء الاصطناعي ٢٠٣١ ومئوية الإمارات ٢٠٧١.")
        return ("The sectors with very high demand in our catalog:\n" + body +
                "\n\nThese map directly onto national initiatives such as the National AI "
                "Strategy 2031 and UAE Centennial 2071.")

    def _answer_recommendation(self, message: str, ar: bool, ctx: dict) -> str:
        top = ctx.get("top_careers", [])
        if not top:
            return ("أكمل خطوات الملف الأربع أولاً (البيانات الشخصية، الدرجات، الميول، "
                    "الشخصية) وسأعرض عليك أفضل عشر مهن تناسبك مع شرح لكل واحدة."
                    if ar else
                    "Complete the four profile steps first (personal details, grades, "
                    "interests, personality) and I will show you the ten careers that fit "
                    "you best, with an explanation for each.")
        lines = "\n".join(self._career_line(career, ar) for career in top[:3])
        if ar:
            return (f"أعلى ثلاث مهن في ترشيحاتك الحالية:\n{lines}\n\n"
                    "اسألني «لماذا؟» لأشرح العوامل التي أدّت إلى هذا الترتيب.")
        return (f"Your top three current matches:\n{lines}\n\n"
                "Ask me \"why?\" and I will explain the factors behind that ranking.")

    def _answer_why(self, message: str, ar: bool, ctx: dict) -> str:
        reasons = ctx.get("top_reasons", [])
        top = ctx.get("top_careers", [])
        if not reasons or not top:
            return ("لا أملك ترشيحات لك بعد. أكمل ملفك الشخصي أولاً."
                    if ar else
                    "I do not have recommendations for you yet. Complete your profile first.")
        title = top[0]["title_ar"] if ar else top[0]["title_en"]
        listed = "\n".join(f"• {r['label_ar' if ar else 'label_en']}" for r in reasons)
        if ar:
            return (f"رُشِّحت لك مهنة {title} لثلاثة أسباب رئيسية:\n{listed}\n\n"
                    "يجمع النظام بين مصنّف تعلّم آلة يتنبأ بالقطاع المناسب، وقياس تشابه "
                    "بين ملفك والملف المثالي لكل مهنة، مع وزن بسيط للطلب في سوق العمل.")
        return (f"{title} was recommended for three main reasons:\n{listed}\n\n"
                "The system combines a machine-learning classifier that predicts your best "
                "sector with a similarity measure between your profile and each career's "
                "ideal profile, plus a small weight for labour-market demand.")

    def _answer_search(self, message: str, ar: bool, ctx: dict) -> str:
        careers = self.find_careers(message)
        if careers:
            career = careers[0]
            title = career["title_ar"] if ar else career["title_en"]
            description = career["description_ar" if ar else "description_en"]
            extra = "\n".join(self._career_line(c, ar) for c in careers[1:3])
            tail = (("\n\nمهن قريبة منها:\n" + extra) if extra else "") if ar else \
                   (("\n\nRelated careers:\n" + extra) if extra else "")
            if ar:
                return f"{title}:\n{description}{tail}\n\nهل تريد معرفة المهارات المطلوبة أو الدورات المقترحة؟"
            return (f"{title}:\n{description}{tail}\n\n"
                    "Would you like the required skills or suggested courses?")
        courses = self.find_courses(message)
        if courses:
            return self._answer_courses(message, ar, ctx)
        if ar:
            return ("لم أجد ما يطابق سؤالك في الدليل. جرّب ذكر اسم مهنة أو مهارة أو قطاع، "
                    "مثل: «الأمن السيبراني» أو «مهارات مهندس الطيران» أو «دورات تحليل البيانات».")
        return ("I could not match your question to the catalog. Try naming a career, a "
                "skill or a sector, for example: \"cybersecurity\", \"skills for an "
                "aeronautical engineer\", or \"data analysis courses\".")


# ---------------------------------------------------------------------------
# Anthropic mode
# ---------------------------------------------------------------------------
SYSTEM_PROMPT_EN = """You are the Masar AI career mentor for students in the United Arab Emirates.

You advise UAE secondary-school students and recent graduates on career choice, \
university pathways and skill development. Ground every answer in the student profile \
and recommendation data provided below. If the data does not cover something, say so \
plainly rather than inventing a figure.

Rules:
- Answer in the language the student writes in. Arabic replies must be Modern Standard \
Arabic, never dialect.
- Salary figures are indicative monthly AED ranges. Always label them as indicative.
- Be concrete: name specific careers, skills and courses from the data given.
- Be brief. Four short paragraphs at most, and use a list when listing.
- Never promise admission, employment or a specific salary.
- You are advising a teenager about their future. Be encouraging and honest at the same \
time; do not talk down to them."""

SYSTEM_PROMPT_AR_NOTE = ("\n\nThe student's interface language is currently Arabic, so "
                         "reply in Modern Standard Arabic unless they write in English.")


def _context_block(context: dict[str, Any]) -> str:
    """Render the student's data as plain text for the system prompt."""
    lines: list[str] = []
    if context.get("name"):
        lines.append(f"Student name: {context['name']}")
    if context.get("emirate"):
        lines.append(f"Emirate: {context['emirate']}    Track: {context.get('track', 'n/a')}")
    if context.get("grades"):
        grades = ", ".join(f"{k}={v}" for k, v in context["grades"].items())
        lines.append(f"Subject grades (0-100): {grades}")
    if context.get("riasec"):
        riasec = ", ".join(f"{k}={v}" for k, v in context["riasec"].items())
        lines.append(f"RIASEC interest scores (0-100): {riasec}")
    if context.get("bigfive"):
        bigfive = ", ".join(f"{k}={v}" for k, v in context["bigfive"].items())
        lines.append(f"Big Five personality scores (0-100): {bigfive}")
    if context.get("top_careers"):
        lines.append("Top recommended careers (highest match first):")
        for index, career in enumerate(context["top_careers"][:5], start=1):
            salary = career.get("salary_aed", {})
            lines.append(
                f"  {index}. {career['title_en']} / {career['title_ar']} "
                f"[sector: {career['sector']}, demand: {career.get('demand')}, "
                f"indicative AED {salary.get('min')}-{salary.get('max')}/month]")
    if context.get("top_reasons"):
        reasons = "; ".join(r["label_en"] for r in context["top_reasons"])
        lines.append(f"Why the top career matched: {reasons}")
    if context.get("gaps"):
        gaps = ", ".join(
            f"{g['name_en']} (now {g['current']:.0f}, needs {g['required']})"
            for g in context["gaps"][:6])
        lines.append(f"Largest skill gaps for the top career: {gaps}")
    if context.get("roadmap_courses"):
        courses = "; ".join(
            f"{c['title_en']} ({c['provider']}, {c['level']}, {c['cost']})"
            for c in context["roadmap_courses"][:6])
        lines.append(f"Courses already on the student's roadmap: {courses}")
    if not lines:
        lines.append("The student has not completed their profile yet, so no "
                     "recommendations are available. Encourage them to finish the "
                     "four onboarding steps.")
    return "\n".join(lines)


def _anthropic_reply(message: str, language: str, context: dict[str, Any],
                     history: list[dict[str, str]]) -> str:
    """Call the Anthropic Messages API.  Raises on any failure."""
    import anthropic

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    system = SYSTEM_PROMPT_EN + ("\n\n--- STUDENT DATA ---\n" + _context_block(context))
    if language == "ar":
        system += SYSTEM_PROMPT_AR_NOTE

    messages = [{"role": entry["role"], "content": entry["content"]}
                for entry in history[-8:]]
    messages.append({"role": "user", "content": message})

    response = client.messages.create(
        model=settings.anthropic_model,
        max_tokens=900,
        system=system,
        messages=messages,
    )
    return "".join(block.text for block in response.content
                   if getattr(block, "type", "") == "text").strip()


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------
SUGGESTIONS = {
    "en": ["Why was this career recommended to me?",
           "Which skills am I missing?",
           "Suggest free courses I can start now",
           "Which UAE sectors are hiring most?"],
    "ar": ["لماذا رُشِّحت لي هذه المهنة؟",
           "ما المهارات التي تنقصني؟",
           "اقترح دورات مجانية أبدأ بها الآن",
           "ما القطاعات الأكثر طلباً في الإمارات؟"],
}


def reply(message: str, language: str, context: dict[str, Any],
          history: list[dict[str, str]], offline: OfflineMentor) -> tuple[str, str]:
    """Answer one message.  Returns ``(text, mode_used)``.

    If an API key is configured we try Anthropic first and fall back to the
    offline engine on any error -- a network blip during the defence must not
    produce an error bubble in the chat panel.
    """
    if settings.mentor_mode == "anthropic":
        try:
            text = _anthropic_reply(message, language, context, history)
            if text:
                return text, "anthropic"
        except Exception:                                  # noqa: BLE001
            pass                                           # fall through
    return offline.answer(message, language, context), "offline"
