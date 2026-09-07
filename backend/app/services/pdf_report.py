"""Bilingual PDF career report (ReportLab).

Why ReportLab and not WeasyPrint
--------------------------------
WeasyPrint delegates text shaping to Pango and would handle Arabic without help,
but it pulls in Cairo, Pango and GDK-PixBuf as system libraries, which triples
the container image and is a common source of "works on my machine" failures on
a free-tier host.  ReportLab is pure Python and installs from a wheel anywhere.

The cost is that ReportLab draws glyphs without shaping them: Arabic would come
out as disconnected, left-to-right letters.  We therefore run every Arabic
string through ``arabic_reshaper`` (contextual letter forms) and then
``python-bidi`` (visual reordering) before it reaches the canvas, and render it
in a bundled Noto Naskh Arabic face.  ``shape()`` below is the whole trick.
"""
from __future__ import annotations

import datetime as dt
import html
import io
import pathlib
from typing import Any

import arabic_reshaper
from bidi.algorithm import get_display
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from app.services.i18n import weeks as format_weeks
from reportlab.platypus import (
    KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
)

FONT_DIR = pathlib.Path(__file__).resolve().parents[1] / "assets" / "fonts"
ARABIC_FONT = "NotoNaskhArabic"
ARABIC_FONT_BOLD = "NotoNaskhArabic-Bold"
LATIN_FONT = "Helvetica"
LATIN_FONT_BOLD = "Helvetica-Bold"

UAE_GREEN = colors.HexColor("#00732F")
GULF_BLUE = colors.HexColor("#0B3D5C")
SAND = colors.HexColor("#E8DCC4")
INK = colors.HexColor("#111827")
MUTED = colors.HexColor("#4B5563")

TEAM = ["Mubarak Awad Alamro", "Saif Qais", "Zayed Saif",
        "Khaled Mohammed", "Mansor Buti"]

_fonts_registered = False


def register_fonts() -> None:
    global _fonts_registered
    if _fonts_registered:
        return
    pdfmetrics.registerFont(TTFont(ARABIC_FONT, str(FONT_DIR / "NotoNaskhArabic-Regular.ttf")))
    pdfmetrics.registerFont(TTFont(ARABIC_FONT_BOLD, str(FONT_DIR / "NotoNaskhArabic-Bold.ttf")))
    pdfmetrics.registerFontFamily(ARABIC_FONT, normal=ARABIC_FONT, bold=ARABIC_FONT_BOLD,
                                  italic=ARABIC_FONT, boldItalic=ARABIC_FONT_BOLD)
    _fonts_registered = True


def shape(text: str) -> str:
    """Reshape + bidi-reorder Arabic so ReportLab can draw it correctly."""
    if not text:
        return ""
    return get_display(arabic_reshaper.reshape(str(text)))


def _arabic_cmap() -> set[int]:
    """Codepoints the bundled Arabic face can actually draw."""
    register_fonts()
    face = pdfmetrics.getFont(ARABIC_FONT).face
    return set(face.charToGlyph)


_CMAP: set[int] | None = None


def tag_runs(visual: str) -> str:
    """Mark up characters the Arabic face cannot draw so Helvetica draws them.

    Noto Naskh Arabic ships Arabic and digits but *no Latin letters at all*.
    Rendering "Mubarak Awad Alamro" in it silently produced a row of blanks --
    the student's own name vanished from their report.  ReportLab performs no
    font fallback, so we do it ourselves: split the already-reordered visual
    string into runs the face supports and runs it does not, and wrap the latter
    in a Helvetica font tag.

    Splitting *after* the bidi pass is deliberate.  python-bidi gives Latin runs
    inside an Arabic paragraph their own left-to-right embedding level, so they
    arrive here already in the right order and must not be touched further.
    """
    global _CMAP
    if _CMAP is None:
        _CMAP = _arabic_cmap()

    parts: list[str] = []
    buffer: list[str] = []
    buffer_supported: bool | None = None

    def flush() -> None:
        if not buffer:
            return
        chunk = html.escape("".join(buffer))
        parts.append(chunk if buffer_supported
                     else f'<font name="{LATIN_FONT}">{chunk}</font>')
        buffer.clear()

    for char in str(visual):
        supported = ord(char) in _CMAP
        if buffer_supported is None or supported == buffer_supported:
            buffer.append(char)
            buffer_supported = supported
            continue
        flush()
        buffer.append(char)
        buffer_supported = supported
    flush()
    return "".join(parts)


ARABIC_MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
                 "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"]


def format_date(when: dt.date, lang: str) -> str:
    if lang == "ar":
        return f"{when.day} {ARABIC_MONTHS[when.month - 1]} {when.year}"
    return when.strftime("%d %B %Y")


# ---------------------------------------------------------------------------
# Bilingual label table
# ---------------------------------------------------------------------------
T: dict[str, dict[str, str]] = {
    "title":        {"en": "Career Guidance Report", "ar": "تقرير الإرشاد المهني"},
    "product":      {"en": "Masar AI", "ar": "مسار"},
    "tagline":      {"en": "Your path, guided by data.", "ar": "مسارك، بإرشاد البيانات."},
    "generated":    {"en": "Generated", "ar": "تاريخ الإصدار"},
    "student":      {"en": "Student", "ar": "الطالب"},
    "profile":      {"en": "1. Profile summary", "ar": "١. ملخص الملف الشخصي"},
    "emirate":      {"en": "Emirate", "ar": "الإمارة"},
    "school":       {"en": "School", "ar": "المدرسة"},
    "grade_level":  {"en": "Grade level", "ar": "الصف"},
    "track":        {"en": "MOE track", "ar": "المسار الدراسي"},
    "grades":       {"en": "Subject grades", "ar": "درجات المواد"},
    "emsat":        {"en": "EmSAT scores", "ar": "درجات الإمسات"},
    "riasec":       {"en": "Interest profile (RIASEC)", "ar": "الملف المهني للميول (RIASEC)"},
    "bigfive":      {"en": "Personality profile (Big Five)", "ar": "ملف الشخصية (السمات الخمس)"},
    "recs":         {"en": "2. Recommended careers", "ar": "٢. المهن المقترحة"},
    "rank":         {"en": "#", "ar": "#"},
    "career":       {"en": "Career", "ar": "المهنة"},
    "sector":       {"en": "Sector", "ar": "القطاع"},
    "match":        {"en": "Match", "ar": "التطابق"},
    "confidence":   {"en": "Confidence", "ar": "درجة الثقة"},
    "why":          {"en": "Why this career", "ar": "سبب الترشيح"},
    "gaps":         {"en": "3. Skill gap analysis", "ar": "٣. تحليل الفجوة في المهارات"},
    "gaps_for":     {"en": "For your top match", "ar": "لأعلى مهنة مطابقة"},
    "skill":        {"en": "Skill", "ar": "المهارة"},
    "current":      {"en": "Current", "ar": "المستوى الحالي"},
    "required":     {"en": "Required", "ar": "المطلوب"},
    "gap":          {"en": "Gap", "ar": "الفجوة"},
    "readiness":    {"en": "Overall readiness", "ar": "الجاهزية الإجمالية"},
    "roadmap":      {"en": "4. Learning roadmap", "ar": "٤. خطة التعلّم"},
    "course":       {"en": "Course", "ar": "الدورة"},
    "provider":     {"en": "Provider", "ar": "الجهة"},
    "level":        {"en": "Level", "ar": "المستوى"},
    "duration":     {"en": "Duration", "ar": "المدة"},
    "cost":         {"en": "Cost", "ar": "التكلفة"},
    "weeks":        {"en": "weeks", "ar": "أسبوعاً"},
    "team":         {"en": "Project team", "ar": "فريق المشروع"},
    "disclaimer":   {"en": ("This report is generated by a prototype decision-support "
                            "system built as a university graduation project. Salary "
                            "figures are indicative monthly AED ranges, not offers. "
                            "The recommendations are guidance, not a substitute for "
                            "advice from a qualified career counsellor."),
                     "ar": ("أُنشئ هذا التقرير بواسطة نظام أوّلي لدعم القرار طُوِّر ضمن "
                            "مشروع تخرّج جامعي. أرقام الرواتب نطاقات شهرية إرشادية "
                            "بالدرهم وليست عروضاً وظيفية، والتوصيات إرشادية ولا تغني "
                            "عن استشارة مرشد مهني مؤهل.")},
    "no_recs":      {"en": "No recommendations available - the profile is incomplete.",
                     "ar": "لا توجد ترشيحات متاحة، فالملف الشخصي غير مكتمل."},
    "page":         {"en": "Page", "ar": "صفحة"},
}

DEMAND_T = {"very_high": {"en": "very high", "ar": "مرتفع جداً"},
            "high": {"en": "high", "ar": "مرتفع"},
            "moderate": {"en": "moderate", "ar": "متوسط"}}
LEVEL_T = {"beginner": {"en": "Beginner", "ar": "مبتدئ"},
           "intermediate": {"en": "Intermediate", "ar": "متوسط"},
           "advanced": {"en": "Advanced", "ar": "متقدم"}}
COST_T = {"free": {"en": "Free", "ar": "مجاني"}, "paid": {"en": "Paid", "ar": "مدفوع"}}
CONFIDENCE_T = {"high": {"en": "High", "ar": "عالية"},
                "moderate": {"en": "Moderate", "ar": "متوسطة"},
                "low": {"en": "Low", "ar": "منخفضة"}}
EMIRATE_T = {
    "abu_dhabi": {"en": "Abu Dhabi", "ar": "أبوظبي"},
    "dubai": {"en": "Dubai", "ar": "دبي"},
    "sharjah": {"en": "Sharjah", "ar": "الشارقة"},
    "ajman": {"en": "Ajman", "ar": "عجمان"},
    "umm_al_quwain": {"en": "Umm Al Quwain", "ar": "أم القيوين"},
    "ras_al_khaimah": {"en": "Ras Al Khaimah", "ar": "رأس الخيمة"},
    "fujairah": {"en": "Fujairah", "ar": "الفجيرة"},
}
TRACK_T = {"general": {"en": "General", "ar": "العام"},
           "advanced": {"en": "Advanced", "ar": "المتقدم"},
           "elite": {"en": "Elite", "ar": "النخبة"}}
SUBJECT_T = {
    "arabic": {"en": "Arabic", "ar": "اللغة العربية"},
    "english": {"en": "English", "ar": "اللغة الإنجليزية"},
    "math": {"en": "Mathematics", "ar": "الرياضيات"},
    "physics": {"en": "Physics", "ar": "الفيزياء"},
    "chemistry": {"en": "Chemistry", "ar": "الكيمياء"},
    "biology": {"en": "Biology", "ar": "الأحياء"},
    "islamic": {"en": "Islamic Studies", "ar": "التربية الإسلامية"},
    "social": {"en": "Social Studies", "ar": "الدراسات الاجتماعية"},
    "computer_science": {"en": "Computer Science", "ar": "علوم الحاسوب"},
}
RIASEC_T = {
    "R": {"en": "Realistic", "ar": "الواقعي"}, "I": {"en": "Investigative", "ar": "البحثي"},
    "A": {"en": "Artistic", "ar": "الفني"}, "S": {"en": "Social", "ar": "الاجتماعي"},
    "E": {"en": "Enterprising", "ar": "المبادِر"}, "C": {"en": "Conventional", "ar": "التقليدي"},
}
BIGFIVE_T = {
    "O": {"en": "Openness", "ar": "الانفتاح"}, "C": {"en": "Conscientiousness", "ar": "يقظة الضمير"},
    "E": {"en": "Extraversion", "ar": "الانبساط"}, "A": {"en": "Agreeableness", "ar": "المقبولية"},
    "N": {"en": "Neuroticism", "ar": "العصابية"},
}


class ReportBuilder:
    """Builds one report.  ``lang`` is ``en`` or ``ar`` and drives everything."""

    def __init__(self, lang: str = "en") -> None:
        register_fonts()
        self.lang = "ar" if lang == "ar" else "en"
        self.rtl = self.lang == "ar"
        self.font = ARABIC_FONT if self.rtl else LATIN_FONT
        self.font_bold = ARABIC_FONT_BOLD if self.rtl else LATIN_FONT_BOLD
        self.align = TA_RIGHT if self.rtl else TA_LEFT
        self._build_styles()

    # -- text pipeline -----------------------------------------------------
    def label(self, key: str) -> str:
        return T[key][self.lang]

    def pick(self, mapping: dict[str, Any], key: str, default: str = "-") -> str:
        entry = mapping.get(key)
        return entry[self.lang] if entry else default

    def field(self, record: dict[str, Any], base: str, default: str = "") -> str:
        return str(record.get(f"{base}_{self.lang}", default) or default)

    def wrap_lines(self, text: str, width_mm: float, size: float) -> list[str]:
        """Greedy word wrap measured in real glyph widths.

        Counting characters was not good enough: Arabic letters vary enormously
        in advance width, and a character budget narrow enough to be safe for
        wide words split narrow ones mid-word ("الرياضيا / ت"), which is simply
        broken Arabic.  Measuring the reshaped string with the actual font is
        exact.  Width is independent of bidi reordering, so measuring before the
        reorder is safe.
        """
        limit = width_mm * mm
        lines: list[str] = []
        current: list[str] = []
        for word in text.split():
            trial = " ".join([*current, word])
            width = pdfmetrics.stringWidth(arabic_reshaper.reshape(trial), self.font, size)
            if current and width > limit:
                lines.append(" ".join(current))
                current = [word]
            else:
                current.append(word)
        if current:
            lines.append(" ".join(current))
        return lines or [""]

    def markup(self, value: Any, width_mm: float | None = None,
               size: float = 8.5) -> str:
        """Logical text -> markup ReportLab can lay out correctly.

        In English this is just XML escaping.  In Arabic it is the whole story:
        wrap first (on the *logical* string), then shape and bidi-reorder each
        line separately, then join with explicit line breaks.

        Wrapping before shaping is what makes multi-line Arabic readable.  If
        the paragraph is shaped as one string and ReportLab breaks it, the
        resulting lines come out in the wrong order -- the text reads bottom to
        top -- because the reordering has already flattened the line structure.
        """
        text = "" if value is None else str(value)
        if not self.rtl:
            return html.escape(text)
        if width_mm:
            lines = self.wrap_lines(text, width_mm, size)
        else:
            lines = text.split("\n") or [""]
        return "<br/>".join(tag_runs(shape(line)) for line in lines)

    STYLE_SIZE = {"body": 9.5, "small": 8.0, "cell": 8.5, "cellhead": 8.5,
                  "num": 8.5, "h1": 20.0, "h2": 13.0, "h3": 10.5}

    def p(self, value: Any, style: str = "body", width_mm: float | None = None) -> Paragraph:
        return Paragraph(self.markup(value, width_mm, self.STYLE_SIZE[style]),
                         self.styles[style])

    def cell(self, value: Any, width_mm: float, style: str = "cell") -> Paragraph:
        # Subtract the table's own horizontal padding so the wrap budget matches
        # the space the text actually gets.
        return Paragraph(self.markup(value, max(4.0, width_mm - 4.5),
                                     self.STYLE_SIZE[style]), self.styles[style])

    def _build_styles(self) -> None:
        sheet = getSampleStyleSheet()
        # NOTE: wordWrap is deliberately left at its default. ``markup`` has
        # already broken the text into correctly ordered lines, and ReportLab's
        # "RTL" word wrap would reorder them a second time.
        base = dict(fontName=self.font, alignment=self.align, leading=15, textColor=INK)
        self.styles = {
            "body": ParagraphStyle("body", parent=sheet["BodyText"], fontSize=9.5, **base),
            "small": ParagraphStyle("small", parent=sheet["BodyText"], fontSize=8,
                                    **{**base, "leading": 11, "textColor": MUTED}),
            "cell": ParagraphStyle("cell", parent=sheet["BodyText"], fontSize=8.5,
                                   **{**base, "leading": 12}),
            "cellhead": ParagraphStyle("cellhead", parent=sheet["BodyText"], fontSize=8.5,
                                       **{**base, "leading": 12,
                                          "fontName": self.font_bold,
                                          "textColor": colors.white}),
            "num": ParagraphStyle("num", parent=sheet["BodyText"], fontSize=8.5,
                                  **{**base, "leading": 12, "alignment": TA_LEFT}),
            "h1": ParagraphStyle("h1", parent=sheet["Heading1"], fontSize=20, spaceAfter=2,
                                 **{**base, "fontName": self.font_bold,
                                    "textColor": UAE_GREEN, "leading": 24}),
            "h2": ParagraphStyle("h2", parent=sheet["Heading2"], fontSize=13,
                                 spaceBefore=14, spaceAfter=6,
                                 **{**base, "fontName": self.font_bold,
                                    "textColor": GULF_BLUE, "leading": 17}),
            "h3": ParagraphStyle("h3", parent=sheet["Heading3"], fontSize=10.5,
                                 spaceBefore=8, spaceAfter=3,
                                 **{**base, "fontName": self.font_bold, "leading": 14}),
        }

    # -- table helper ------------------------------------------------------
    def build_table(self, header: list[str] | None, rows: list[list[Any]],
                    widths: list[float]) -> Table:
        """``widths`` are in millimetres, in logical (LTR) column order."""
        data: list[list[Paragraph]] = []
        if header is not None:
            data.append([self.cell(value, widths[index], "cellhead")
                         for index, value in enumerate(header)])
        for row in rows:
            data.append([self.cell(value, widths[index])
                         for index, value in enumerate(row)])

        points = [width * mm for width in widths]
        if self.rtl:
            data = [list(reversed(row)) for row in data]
            points = list(reversed(points))

        table = Table(data, colWidths=points, repeatRows=1 if header else 0)
        style = [
            ("FONTNAME", (0, 0), (-1, -1), self.font),
            ("FONTSIZE", (0, 0), (-1, -1), 8.5),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("LINEBELOW", (0, 0), (-1, -2), 0.4, colors.HexColor("#E5E7EB")),
        ]
        if header is not None:
            style += [
                ("BACKGROUND", (0, 0), (-1, 0), UAE_GREEN),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1),
                 [colors.white, colors.HexColor("#FAFAF7")]),
                ("LINEBELOW", (0, 0), (-1, 0), 0.8, UAE_GREEN),
            ]
        else:
            style.append(("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FAFAF7")))
        table.setStyle(TableStyle(style))
        return table

    # -- page furniture ----------------------------------------------------
    def _decorate(self, canvas, doc) -> None:
        canvas.saveState()
        width, height = A4
        canvas.setFillColor(UAE_GREEN)
        canvas.rect(0, height - 10 * mm, width, 10 * mm, stroke=0, fill=1)
        canvas.setFillColor(SAND)
        canvas.rect(0, height - 12 * mm, width, 2 * mm, stroke=0, fill=1)

        canvas.setFillColor(MUTED)
        # The team credit is Latin text, so it is always drawn in Helvetica --
        # the Arabic face has no Latin glyphs and would render it as blanks.
        canvas.setFont(LATIN_FONT, 7.5)
        team = "Masar AI 2026  |  " + "  ".join(TEAM)
        page_label = f"{self.label('page')} {doc.page}"
        if self.rtl:
            canvas.drawRightString(width - 18 * mm, 12 * mm, team)
            canvas.setFont(self.font, 7.5)
            canvas.drawString(18 * mm, 12 * mm, shape(page_label))
        else:
            canvas.drawString(18 * mm, 12 * mm, team)
            canvas.drawRightString(width - 18 * mm, 12 * mm, page_label)
        canvas.setStrokeColor(colors.HexColor("#E5E7EB"))
        canvas.line(18 * mm, 16 * mm, width - 18 * mm, 16 * mm)
        canvas.restoreState()

    # -- sections ----------------------------------------------------------
    def _cover(self, student: dict) -> list:
        widths = [30.0, 60.0, 32.0, 52.0]
        return [
            Spacer(1, 4 * mm),
            self.p(self.label("product"), "h1"),
            self.p(self.label("tagline"), "small"),
            Spacer(1, 2 * mm),
            self.p(self.label("title"), "h2"),
            self.build_table(None, [[
                self.label("student"), student.get("full_name") or "-",
                self.label("generated"), format_date(dt.date.today(), self.lang),
            ]], widths),
        ]

    def _profile(self, profile: dict) -> list:
        widths = [30.0, 56.0, 32.0, 56.0]
        rows = [
            [self.label("emirate"), self.pick(EMIRATE_T, profile.get("emirate", "")),
             self.label("track"), self.pick(TRACK_T, profile.get("track", ""))],
            [self.label("school"), profile.get("school") or "-",
             self.label("grade_level"), profile.get("grade_level") or "-"],
        ]
        flow = [self.p(self.label("profile"), "h2"),
                self.build_table(None, rows, widths)]

        def score_block(title_key: str, mapping: dict, values: dict) -> list:
            if not values:
                return []
            header = [self.label(title_key)] + [
                self.pick(mapping, key, key) for key in values]
            row = [""] + [f"{float(value):.0f}" for value in values.values()]
            width = 174.0 / len(header)
            return [Spacer(1, 3 * mm),
                    self.build_table(header, [row], [width] * len(header))]

        flow += score_block("grades", SUBJECT_T, profile.get("grades") or {})
        emsat = profile.get("emsat") or {}
        if emsat:
            listed = ", ".join(f"{SUBJECT_T.get(k, {}).get(self.lang, k)}: {v:g}"
                               for k, v in emsat.items())
            flow += [Spacer(1, 2 * mm),
                     self.p(f"{self.label('emsat')} - {listed}", "small", 174.0)]
        flow += score_block("riasec", RIASEC_T, profile.get("riasec") or {})
        flow += score_block("bigfive", BIGFIVE_T, profile.get("bigfive") or {})
        return flow

    def _recommendations(self, recommendations: list[dict]) -> list:
        flow = [self.p(self.label("recs"), "h2")]
        if not recommendations:
            return flow + [self.p(self.label("no_recs"), "body", 174.0)]

        widths = [8.0, 38.0, 30.0, 14.0, 20.0, 64.0]
        header = [self.label(key) for key in
                  ("rank", "career", "sector", "match", "confidence", "why")]
        rows = []
        for item in recommendations:
            career = item["career"]
            reasons = "; ".join(reason[f"label_{self.lang}"]
                                for reason in item.get("reasons", []))
            rows.append([
                str(item["rank"]),
                self.field(career, "title", career["id"]),
                item.get("sector_name", career["sector"]),
                f"{item['match']:.0f}%",
                self.pick(CONFIDENCE_T, item.get("confidence", "moderate")),
                reasons,
            ])
        flow.append(self.build_table(header, rows, widths))
        return flow

    def _gaps(self, gap: dict, career_title: str) -> list:
        flow = [self.p(self.label("gaps"), "h2"),
                self.p(f"{self.label('gaps_for')}: {career_title}", "h3", 174.0)]
        if not gap or not gap.get("skills"):
            return flow
        widths = [90.0, 28.0, 28.0, 28.0]
        header = [self.label(key) for key in ("skill", "current", "required", "gap")]
        rows = [[
            self.field(entry, "name", entry["skill_id"]),
            f"{entry['current']:.0f}",
            str(entry["required"]),
            f"{entry['gap']:.0f}" if entry["gap"] > 0 else "-",
        ] for entry in gap["skills"]]
        flow.append(self.build_table(header, rows, widths))
        flow.append(Spacer(1, 3 * mm))
        flow.append(self.p(f"{self.label('readiness')}: {gap.get('readiness', 0):.0f}%", "h3"))
        return flow

    def _roadmap(self, roadmap: dict) -> list:
        flow = [self.p(self.label("roadmap"), "h2")]
        if not roadmap or not roadmap.get("phases"):
            return flow
        widths = [50.0, 26.0, 22.0, 24.0, 18.0, 34.0]
        header = [self.label(key) for key in
                  ("course", "provider", "level", "duration", "cost", "skill")]
        for phase in roadmap["phases"]:
            if not phase["courses"]:
                continue
            rows = [[
                self.field(course, "title", course["id"]),
                course["provider"],
                self.pick(LEVEL_T, course["level"]),
                format_weeks(course["duration_weeks"], self.lang),
                self.pick(COST_T, course["cost"]),
                self.field(course, "skill_name", course["for_skill"]),
            ] for course in phase["courses"]]
            flow.append(KeepTogether([
                self.p(phase[f"label_{self.lang}"], "h3", 174.0),
                self.build_table(header, rows, widths),
                Spacer(1, 3 * mm),
            ]))
        return flow

    def _closing(self) -> list:
        return [
            PageBreak(),
            self.p(self.label("team"), "h2"),
            self.build_table(None, [[str(index), name]
                                    for index, name in enumerate(TEAM, start=1)],
                             [12.0, 162.0]),
            Spacer(1, 8 * mm),
            self.p(self.label("disclaimer"), "small", 174.0),
        ]

    # -- entry point -------------------------------------------------------
    def build(self, payload: dict[str, Any]) -> bytes:
        buffer = io.BytesIO()
        document = SimpleDocTemplate(
            buffer, pagesize=A4,
            leftMargin=18 * mm, rightMargin=18 * mm,
            topMargin=18 * mm, bottomMargin=22 * mm,
            title=f"Masar AI - {T['title'][self.lang]}",
            author="Masar AI", subject="Career guidance report",
        )
        story: list = []
        story += self._cover(payload.get("student", {}))
        story += self._profile(payload.get("profile", {}))
        story += self._recommendations(payload.get("recommendations", []))
        gap = payload.get("gap") or {}
        if gap:
            story.append(PageBreak())
            story += self._gaps(gap, payload.get("top_career_title", ""))
            story += self._roadmap(payload.get("roadmap") or {})
        story += self._closing()
        document.build(story, onFirstPage=self._decorate, onLaterPages=self._decorate)
        return buffer.getvalue()


def build_report(payload: dict[str, Any], lang: str = "en") -> bytes:
    return ReportBuilder(lang).build(payload)
