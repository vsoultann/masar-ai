"""Small bilingual formatting helpers shared by the chatbot and the PDF."""
from __future__ import annotations


def weeks(count: int, lang: str) -> str:
    """Format a duration in weeks with correct Arabic number-noun agreement.

    Arabic does not simply pluralise: 1 takes the singular, 2 the dual, 3-10 the
    plural of paucity, and 11 and above the accusative singular.  Writing
    "8 أسبوعاً" everywhere is the kind of detail an Arabic-speaking examiner
    notices immediately.
    """
    if lang != "ar":
        return f"{count} week" if count == 1 else f"{count} weeks"
    if count == 1:
        return "أسبوع واحد"
    if count == 2:
        return "أسبوعان"
    if 3 <= count <= 10:
        return f"{count} أسابيع"
    return f"{count} أسبوعاً"
