#!/usr/bin/env python3
"""Finds freely-licensed photographs of the institutions in the catalog.

Why a script and not fifty manual downloads
-------------------------------------------
The universities page shipped generated artwork because no one had sourced
photographs that could legally be redistributed. Doing it by hand is fifty
searches, fifty licence checks and fifty attribution strings, and the result
would be unauditable a year later. This does it from Wikimedia Commons, which
is the only source that publishes machine-readable licence and authorship for
every file, and it writes the attribution into the catalog alongside the image.

Three rules it will not break
-----------------------------
1. **Only free licences.** Public domain, CC0, CC BY and CC BY-SA are accepted.
   Anything else -- and in particular Wikipedia's non-free "fair use" files --
   is rejected. A grad project that ships a copyrighted photograph is a grad
   project with a legal problem, not a nicer-looking one.

2. **No logos, crests or wordmarks.** Already the project's rule (DECISIONS),
   and the lead image of a university's Wikipedia article is very often exactly
   that. Filename and category heuristics drop them.

3. **No photograph of the wrong place.** This is the one that matters most and
   the reason the script resolves each institution through its Wikipedia
   article rather than through a free-text image search: searching Commons for
   "United Arab Emirates University campus" returns, among the first five
   results, photographs of Heriot-Watt Dubai and Troy University Sharjah.
   Putting one of those on the UAEU card would be worse than shipping no photo
   at all, because a generated illustration is obviously an illustration and a
   photograph of the wrong campus is a lie.

   So: the institution's name is matched against a Wikipedia article title, the
   match is scored, and anything below the threshold is skipped and reported
   rather than guessed at. Where the article has a Commons category, files are
   taken from it -- a curated set of images *of that institution* -- in
   preference to anything found by searching.

Run it from the repository root:

    python scripts/harvest_campus_photos.py            # report only
    python scripts/harvest_campus_photos.py --write    # download and write

Nothing is downloaded without --write, so the match report can be reviewed
first. That review is the point: this script proposes, a human disposes.
"""

from __future__ import annotations

import argparse
import difflib
import html
import io
import json
import pathlib
import re
import subprocess
import sys
import time
import urllib.parse

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "frontend" / "public" / "data" / "universities.json"
OUT_DIR = ROOT / "frontend" / "public" / "images" / "universities"
CREDITS = ROOT / "data" / "v2" / "campus_photo_credits.json"

UA = ("MasarAI-GradProject/1.0 (https://github.com/vsoultann/masar-ai; "
      "educational use) python-urllib")

FREE_LICENCES = re.compile(
    r"^(cc0|cc[ -]by([ -]sa)?([ -][\d.]+)?|public domain|pd[ -]|no restrictions)",
    re.IGNORECASE,
)

# A file whose name says "logo" is a logo whatever its licence says.
NOT_A_PHOTO = re.compile(
    r"logo|crest|seal|wordmark|coat[ _]of[ _]arms|emblem|icon|favicon|\.svg$"
    r"|signature|stamp|banner|poster|map|diagram|chart|graph",
    re.IGNORECASE,
)

# People, events and ceremonies. A Commons category for a university collects
# everything associated with it, which includes conference photographs, staff
# portraits and -- in the University of Sharjah's category -- a NASA photograph
# of the Earth taken from the ISS. None of them is a picture of a campus.
NOT_A_PLACE = re.compile(
    r"graduation|ceremon|conference|summit|forum|award|signing|delegation"
    r"|portrait|professor|\bdr\b|speech|speaker|panel|meeting|visit|students?"
    # "ISS053-E-127299 - View of United Arab Emirates" is a photograph taken
    # from orbit. \biss\b does not match "ISS053" -- there is no word boundary
    # after the letters -- so it reached two cards as a picture of the
    # neighbourhood. It is a picture of the neighbourhood, from 400 km up.
    r"\b|group|team|astronaut|\biss\d|\biss\b|earth|satellite|space station"
    r"|from space|orbit|logo"
    r"|experts?\b|and others?\b|opens?\b|opening|launch|inaugurat|minister"
    r"|sheikh|excellency|president|chancellor|rector|staff|faculty|interview"
    r"|workshop|lecture|seminar|graduates?\b|alumni|participat|exhibit"
    r"|defence|defense|vehicle|armou?red|truck|aircraft|drone|museum"
    r"|discuss\w*|speaks?\b|talks?\b|announc\w*|explain\w*|shares?\b"
    r"|receiv\w*|meets?\b|welcom\w*|honou?r\w*|journey|appoint\w*",
    re.IGNORECASE,
)

# "Edmond Fernandes, Cecilia Sorensen and other Global Climate & Health
# Experts at Gulf Medical University" is a photograph of people who happen to
# be standing at a university. A filename that opens with a list of personal
# names is describing who is in the picture, not where it was taken.
NAMED_PEOPLE = re.compile(r"\b[A-Z][a-z]+ [A-Z][a-z]+\s*(,|\band\b)", re.UNICODE)

# An institution or a named facility. Fine as the subject of a campus
# photograph, wrong as a stand-in for "the area around this campus".
NAMED_BUILDING = re.compile(
    r"universit|college|institute|academy|\bschool\b|hospital|clinic|campus",
    re.IGNORECASE,
)

# The main city of each emirate, for the last-resort tier.
EMIRATE_CENTRE = {
    "abu_dhabi": (24.4539, 54.3773),
    "dubai": (25.2048, 55.2708),
    "sharjah": (25.3463, 55.4209),
    "ajman": (25.4052, 55.5136),
    "umm_al_quwain": (25.5647, 55.5532),
    "ras_al_khaimah": (25.7895, 55.9432),
    "fujairah": (25.1288, 56.3265),
}

# Files that are photographs of a place, ranked up.
PLACE_HINT = re.compile(
    r"campus|building|entrance|gate|tower|hall|library|aerial|view|exterior"
    r"|facade|quad|courtyard|architecture|street|skyline",
    re.IGNORECASE,
)


def get(url: str) -> bytes:
    """curl, because several of these hosts refuse anything else."""
    result = subprocess.run(
        ["curl", "-sL", "--compressed", "--max-time", "40", "-A", UA, url],
        capture_output=True,
    )
    return result.stdout


def api(host: str, params: dict) -> dict:
    query = urllib.parse.urlencode({**params, "format": "json"})
    raw = get(f"https://{host}/w/api.php?{query}")
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}


def strip_markup(value: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", "", value or "")).strip()


def similarity(a: str, b: str) -> float:
    clean = lambda s: re.sub(r"[^a-z0-9 ]", " ", s.lower()).split()
    return difflib.SequenceMatcher(None, " ".join(clean(a)), " ".join(clean(b))).ratio()


# Words that identify a *kind* of institution, not this institution. A file
# title matching only these has not been shown to be of the right place.
GENERIC_NAME = {
    "university", "universities", "college", "academy", "institute", "school",
    "campus", "the", "of", "and", "for", "higher", "technology", "science",
    "sciences", "international", "national", "abu", "al", "bin", "united",
    "arab", "emirates", "uae",
    # Place names, which are the trap this set exists for. "Zayed University —
    # Abu Dhabi" kept "dhabi" as a distinguishing word, which matched
    # "Emaret road Dubai to Abudhabi 2013 pic 438" -- a photograph of a
    # motorway, attached to a university card. A city name says where a
    # photograph was taken, and the geosearch has already established that.
    "dhabi", "dubai", "sharjah", "ajman", "fujairah", "khaimah", "quwain",
    "ras", "umm", "ain", "city", "emirate",
}


def distinctive(name: str) -> list[str]:
    # "Higher Colleges of Technology - Al Ain" is one institution with eight
    # campuses; everything after the dash locates it rather than naming it.
    name = re.split(r"[-\u2013\u2014]", name)[0]
    words = re.sub(r"[^a-z0-9 ]", " ", name.lower()).split()
    return [w for w in words if len(w) >= 4 and w not in GENERIC_NAME]


def flat_name(value: str) -> str:
    """Lowercased, punctuation-free, with any campus suffix removed."""
    head = re.split(r"[-\u2013\u2014]", value)[0]
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", head.lower())).strip()


# Words that may sit in front of an institution's name without changing whose
# name it is. Anything else in that position means the name is the tail of a
# longer one.
LEAD_IN = {
    "file", "the", "at", "in", "of", "to", "from", "near", "inside", "outside",
    "new", "old", "main", "a", "an", "and", "on", "by", "for", "image", "photo",
}


def is_tail_of_longer_name(title: str, name: str) -> bool:
    """True when this institution's name is only the tail of a different one.

    The collision that forces this: "Training Sessions at the American
    University of Dubai" contains "university of dubai", so it matched the
    University of Dubai -- a different institution a few kilometres from the
    American University *in* Dubai the photograph is actually of.

    Comparing catalog names against one another does not catch it, because the
    catalog spells that institution "in Dubai" and the filename spells it "of
    Dubai". Position does catch it. A title is about this institution when its
    name stands on its own, and about a different one when the name is the tail
    of something longer -- "American University of Dubai" ends with "University
    of Dubai" the way "South Sudan" ends with "Sudan". So the word immediately
    before the match has to be a harmless lead-in rather than another part of a
    proper name.
    """
    cleaned = re.sub(r"^file\s*:?\s*", "", title, flags=re.IGNORECASE)
    cleaned = re.sub(r"\.[a-z0-9]{2,4}$", "", cleaned, flags=re.IGNORECASE)
    haystack = flat_name(cleaned)
    mine = flat_name(name)
    if not mine or mine not in haystack:
        return False

    index = haystack.find(mine)
    while index != -1:
        before = haystack[:index].strip().split()
        if not before or before[-1] in LEAD_IN or before[-1].isdigit():
            return False  # it stands on its own at least once
        index = haystack.find(mine, index + 1)
    return True


def named_for(title: str, name: str, short: str,
               allow_abbreviation: bool = True) -> bool:
    """Does this file's title say it is of this institution?

    Three ways, in order of how much they prove:

      the full name, verbatim -- which is the only evidence available for
        "United Arab Emirates University", every word of which is a generic
        or a place name;
      the abbreviation as a standalone word -- "AUS", "UAEU", "NYUAD" -- but
        only where something else has already fixed the location, because a
        three-letter abbreviation collides with the entire world. A free-text
        Commons search for "ATA" returns the Petroglyph Museum of Cholpon-Ata
        in Kyrgyzstan; "KIC" returns a star from the Kepler Input Catalog;
        "AAU" returns Aalborg University in Copenhagen. Within a few kilometres
        of the right campus those collisions are impossible, which is why the
        geosearch path may use an abbreviation and the search path may not.

    A single distinguishing word used to count too, and it was far too weak.
    It attached "Sharjah University Street" to HCT Sharjah, "Umm Al Quwain -
    panoramio" to the University of Umm Al Quwain, a photograph of Dubai
    International Airport to the University of Dubai, and -- via the University
    of Sharjah's Commons category -- a NASA photograph of the Earth taken from
    the ISS. Every one of those is a picture of somewhere near the right place
    rather than a picture of the place, which is exactly the failure this whole
    script exists to avoid.
    """
    haystack = re.sub(r"[^a-z0-9 ]", " ", title.lower())
    haystack = re.sub(r"\s+", " ", haystack)

    flat = lambda value: re.sub(
        r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", re.split(r"[-\u2013\u2014]", value)[0].lower()),
    ).strip()

    if flat(name) and flat(name) in haystack:
        return True
    if (allow_abbreviation and short and len(short) >= 3
            and re.search(rf"\b{re.escape(short.lower())}\b", haystack)):
        return True
    return False


def category_exists(category: str) -> bool:
    data = api("commons.wikimedia.org", {
        "action": "query", "titles": category, "prop": "info",
    })
    pages = data.get("query", {}).get("pages", {})
    return bool(pages) and "-1" not in pages


def files_in_category(category: str) -> list[str]:
    data = api("commons.wikimedia.org", {
        "action": "query", "list": "categorymembers", "cmtitle": category,
        "cmtype": "file", "cmlimit": 60,
    })
    return [row["title"] for row in data.get("query", {}).get("categorymembers", [])]


def file_info(title: str) -> dict | None:
    data = api("commons.wikimedia.org", {
        "action": "query", "titles": title, "prop": "imageinfo",
        "iiprop": "url|extmetadata|size|mime", "iiurlwidth": 1600,
    })
    for page in data.get("query", {}).get("pages", {}).values():
        info = (page.get("imageinfo") or [None])[0]
        if not info:
            continue
        meta = info.get("extmetadata", {})
        return {
            "title": title,
            "url": info.get("thumburl") or info.get("url"),
            "descriptionurl": info.get("descriptionurl"),
            "mime": info.get("mime", ""),
            "width": info.get("width", 0),
            "height": info.get("height", 0),
            "licence": strip_markup(meta.get("LicenseShortName", {}).get("value", "")),
            "author": strip_markup(meta.get("Artist", {}).get("value", "")),
            "licence_url": strip_markup(meta.get("LicenseUrl", {}).get("value", "")),
        }
    return None


def search_commons(term: str, limit: int = 25) -> list[str]:
    """Free-text file search, which is only safe behind the name check.

    Searching for "United Arab Emirates University campus" returns photographs
    of Heriot-Watt Dubai and Troy University Sharjah in its first five results,
    which is why this was left out of the first version. But the same strict
    rule the geosearch path uses -- the filename must carry the institution's
    full name or its abbreviation -- makes the search safe *and* turns out to
    be where most of the coverage actually is: MBZUAI, Khawarizmi and ECAE all
    have properly-named photographs on Commons that sit in no category and
    carry no coordinates, so neither of the other two paths could see them.
    """
    data = api("commons.wikimedia.org", {
        "action": "query", "list": "search", "srsearch": f"{term} filetype:bitmap",
        "srnamespace": 6, "srlimit": limit,
    })
    return [hit["title"] for hit in data.get("query", {}).get("search", [])]


# Commons refuses ggsradius above 10 km — and refuses it silently, with an
# empty result rather than an error. Two rings of this were no-ops for an
# entire run before anyone noticed, which is why the cap is a named constant
# and every caller is clamped to it rather than trusted to remember.
MAX_GEO_RADIUS = 10000


def geosearch(lat: float, lng: float, radius: int = 4000) -> list[dict]:
    """Files photographed at this place.

    The reason this exists alongside the category lookup: UAEU has no Commons
    category at all, and a name search for it returns photographs of Heriot-Watt
    Dubai and Troy University Sharjah. A geosearch on its own coordinates
    returns one file -- a photograph of UAEU. Location is the strongest evidence
    available that a picture is of the right place.
    """
    data = api("commons.wikimedia.org", {
        "action": "query", "generator": "geosearch",
        "ggscoord": f"{lat}|{lng}", "ggsradius": min(radius, MAX_GEO_RADIUS),
        "ggslimit": 40,
        "ggsnamespace": 6, "prop": "imageinfo",
        "iiprop": "url|extmetadata|size|mime", "iiurlwidth": 1600,
    })
    out = []
    for page in data.get("query", {}).get("pages", {}).values():
        info = (page.get("imageinfo") or [None])[0]
        if not info:
            continue
        meta = info.get("extmetadata", {})
        out.append({
            "title": page["title"],
            "url": info.get("thumburl") or info.get("url"),
            "descriptionurl": info.get("descriptionurl"),
            "mime": info.get("mime", ""),
            "width": info.get("width", 0),
            "height": info.get("height", 0),
            "licence": strip_markup(meta.get("LicenseShortName", {}).get("value", "")),
            "author": strip_markup(meta.get("Artist", {}).get("value", "")),
            "licence_url": strip_markup(meta.get("LicenseUrl", {}).get("value", "")),
        })
    return out


def acceptable(info: dict) -> bool:
    if not info or not info.get("url"):
        return False
    if not info["mime"].startswith("image/") or "svg" in info["mime"]:
        return False
    if NOT_A_PHOTO.search(info["title"]):
        return False
    if not FREE_LICENCES.match(info["licence"] or ""):
        return False
    # Big enough to crop into a card without being a postage stamp. The floor
    # was 800x500 and it rejected the only free photograph of UAEU -- the
    # flagship national university -- for being 593 across. A 593px source
    # fills a card thumbnail honestly; what it must not do is get upscaled into
    # a hero, which `save_image` now prevents.
    if info["width"] < 560 or info["height"] < 360:
        return False
    # The cards render 16:10 and 21:9 and the image is object-cover, so a
    # square photograph crops cleanly. A portrait one does not.
    if info["height"] and info["width"] / info["height"] < 0.95:
        return False
    return True


def pick_photo(university: dict, others: list[str] | None = None) -> dict | None:
    """A photograph that is provably of this institution, or nothing.

    Two independent kinds of evidence are accepted, and one of them is
    required:

      provenance  the file sits in a Commons category whose name is this
                  institution's name. Someone curated it there, so the file
                  need not repeat the name in its own title -- which is why
                  "AUS MainBuilding.JPG" is accepted for the American
                  University of Sharjah.
      location    the file was photographed within ~1.2 km of the campus AND
                  its title names the institution. Proximity alone is not
                  enough: a geosearch around Zayed University Dubai returns a
                  supermarket and someone's balcony.

    Everything else is skipped and reported. A generated illustration is
    obviously an illustration; a photograph of the wrong campus is a lie, and
    the whole point of putting real photographs on these cards is that they are
    real.
    """
    name = university["name"]["en"]
    short = university["shortName"]["en"]
    candidates: list[dict] = []

    def is_of_this_place(title: str, allow_abbreviation: bool = True) -> bool:
        if is_tail_of_longer_name(title, name):
            return False
        return named_for(title, name, short, allow_abbreviation=allow_abbreviation)

    # 1. Curated category, verified by how closely its name matches.
    for guess in (name, short):
        category = f"Category:{guess}"
        if similarity(guess, name) < 0.85 and guess != name:
            continue
        if not category_exists(category):
            continue
        for title in files_in_category(category)[:30]:
            if (NOT_A_PHOTO.search(title) or NOT_A_PLACE.search(title)
                    or NAMED_PEOPLE.search(title)):
                continue
            # Provenance says it belongs to this institution; this says it is a
            # photograph of somewhere rather than of someone or something.
            if is_tail_of_longer_name(title, name):
                continue
            if not (PLACE_HINT.search(title) or named_for(title, name, short)):
                continue
            info = file_info(title)
            if acceptable(info):
                info["evidence"] = f"category:{guess}"
                candidates.append(info)
        if candidates:
            break

    # 2. Photographed at the campus and named for it.
    if not candidates:
        coordinates = university["coordinates"]
        for info in geosearch(coordinates["lat"], coordinates["lng"]):
            if NOT_A_PLACE.search(info["title"]) or NAMED_PEOPLE.search(info["title"]):
                continue
            if acceptable(info) and is_of_this_place(info["title"]):
                info["evidence"] = "geo+name"
                candidates.append(info)

    # 3. Named for the institution anywhere on Commons.
    if not candidates:
        # The full name only. Querying the abbreviation is what dragged in the
        # museum, the star and the Danish university.
        for term in (name,):
            for title in search_commons(term):
                if (NOT_A_PHOTO.search(title) or NOT_A_PLACE.search(title)
                        or NAMED_PEOPLE.search(title)):
                    continue
                if not is_of_this_place(title, allow_abbreviation=False):
                    continue
                info = file_info(title)
                if acceptable(info):
                    info["evidence"] = "search+name"
                    candidates.append(info)
            if candidates:
                break

    # 4. The surroundings.
    #
    # Eleven of fifty institutions have a photograph of themselves on Commons,
    # and no amount of filtering changes that -- the pictures do not exist. But
    # a student choosing where to spend four years is also asking what the
    # place is like, so for the rest this takes the best free photograph of the
    # area around the campus.
    #
    # It is recorded as `surroundings` rather than as a campus photograph, and
    # the UI labels it that way, because the entire point of the rules above is
    # that a photograph must not claim to be something it is not. A picture of
    # Al Ain captioned "Al Ain" is true; the same picture captioned "United
    # Arab Emirates University" is not.
    if not candidates:
        coordinates = university["coordinates"]
        nearby = []
        # Three rings. Most campuses are in a city with plenty of free
        # photography; Ruwais, Ras Al Khaimah and the technical academies are
        # not, and for those the honest unit of "around here" is the town
        # rather than the street.
        for radius in (3000, 6000, MAX_GEO_RADIUS):
            for info in geosearch(coordinates["lat"], coordinates["lng"], radius=radius):
                if NOT_A_PLACE.search(info["title"]) or NAMED_PEOPLE.search(info["title"]):
                    continue
                # A neutral view of the area, not somebody else's building.
                # Without this, Amity Dubai got a photograph captioned "Fakeeh
                # University Hospital Dubai" — true of the neighbourhood and
                # misleading on the card.
                if NAMED_BUILDING.search(info["title"]):
                    continue
                if any(is_tail_of_longer_name(info["title"], other) or
                       flat_name(other) in flat_name(info["title"])
                       for other in (others or []) if flat_name(other) != flat_name(name)):
                    continue
                if acceptable(info):
                    info["evidence"] = "surroundings"
                    nearby.append(info)
            if nearby:
                break
        if nearby:
            nearby.sort(key=lambda c: (
                0 if PLACE_HINT.search(c["title"]) else 1,
                -(c["width"] * c["height"]),
            ))
            return nearby[0]

    # 5. The emirate.
    #
    # Four institutions sit somewhere with no free photography at all within
    # thirty kilometres -- Ruwais is a remote industrial town, and the northern
    # technical academies are much the same. Rather than leave those four as
    # the only cards with no photograph, this falls back to the emirate's main
    # city and records *which* place it is, so the badge reads "Abu Dhabi"
    # rather than "Nearby area". Two hundred kilometres is not nearby, and the
    # label has to survive being read literally.
    if not candidates:
        centre = EMIRATE_CENTRE.get(university["emirate"])
        if centre:
            for info in geosearch(centre[0], centre[1], radius=MAX_GEO_RADIUS):
                if NOT_A_PLACE.search(info["title"]) or NAMED_PEOPLE.search(info["title"]):
                    continue
                if NAMED_BUILDING.search(info["title"]):
                    continue
                if acceptable(info) and PLACE_HINT.search(info["title"]):
                    info["evidence"] = "emirate"
                    info["place"] = university["emirate"]
                    return info

    if not candidates:
        return None

    # Prefer a picture of the place over a picture taken at the place, then the
    # largest -- a bigger original survives the 1200px downscale better.
    candidates.sort(key=lambda c: (
        0 if PLACE_HINT.search(c["title"]) else 1,
        -(c["width"] * c["height"]),
    ))
    return candidates[0]


def save_image(raw: bytes, path: pathlib.Path, width: int) -> None:
    from PIL import Image

    image = Image.open(io.BytesIO(raw))
    image = image.convert("RGB")
    # Never upscale: enlarging a 593px source to 1200 makes it soft and costs
    # four times the bytes to look worse.
    target = min(width, image.width)
    ratio = target / image.width
    image = image.resize((target, max(1, round(image.height * ratio))), Image.LANCZOS)
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "JPEG", quality=82, optimize=True, progressive=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true",
                        help="download the images and write the credits file")
    parser.add_argument("--only", help="limit to one institution id, for testing")
    args = parser.parse_args()

    universities = json.loads(DATA.read_text(encoding="utf-8"))
    all_names = [u["name"]["en"] for u in universities]
    if args.only:
        universities = [u for u in universities if u["id"] == args.only]

    credits: dict[str, dict] = {}
    if CREDITS.exists():
        credits = json.loads(CREDITS.read_text(encoding="utf-8"))

    found = 0
    for university in universities:
        uid = university["id"]
        name = university["name"]["en"]
        short = university["shortName"]["en"]

        if uid in credits and not args.only:
            print(f"  = {uid:22} already sourced")
            found += 1
            continue

        info = pick_photo(university, all_names)
        if not info:
            print(f"  - {uid:22} nothing free, not even nearby — keeps generated art")
            continue

        found += 1
        print(f"  + {uid:22} {info['licence']:14} {info['evidence']:22} "
              f"{info['title'][:52]}")

        if args.write:
            raw = get(info["url"])
            if len(raw) < 5000:
                print(f"    ! download failed for {uid}")
                continue
            save_image(raw, OUT_DIR / f"{uid}.jpg", 1200)
            save_image(raw, OUT_DIR / f"{uid}-thumb.jpg", 600)
            credits[uid] = {
                "source": "Wikimedia Commons",
                "file": info["title"],
                "author": info["author"][:200],
                "license": info["licence"],
                "licenseUrl": info["licence_url"],
                "url": info["descriptionurl"],
                "evidence": info["evidence"],
                # "campus" means a photograph of this institution;
                # "surroundings" means the area around it, and the UI says so.
                "kind": ("campus" if info["evidence"] in
                         ("category", "geo+name", "search+name")
                         or info["evidence"].startswith("category:")
                         else "surroundings"),
                # Which place the photograph is of, when it is not the campus.
                # The UI labels the badge with this rather than guessing.
                "place": info.get("place"),
            }
        time.sleep(0.3)

    print(f"\n{found} of {len(universities)} institutions have a free photograph")

    if args.write:
        CREDITS.parent.mkdir(parents=True, exist_ok=True)
        CREDITS.write_text(
            json.dumps(credits, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
        print(f"wrote {CREDITS.relative_to(ROOT)}")


if __name__ == "__main__":
    sys.exit(main())
