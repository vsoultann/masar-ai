import {
  indexBy, loadCareerIndex, loadCourses, loadMajors, loadResistanceGlossary,
  loadScholarships, loadSkills, loadUniversities,
} from "@/lib/data/client";
import { assessEligibility, matchUniversities } from "@/lib/matching/universities";
import type { Career, Lang, Profile, Scholarship, University } from "@/lib/types";
import { loadCareers } from "@/lib/data/client";

/**
 * The offline mentor.
 *
 * This is the default and must work with zero configuration — no API key, no
 * network beyond the catalogs the page already loaded. It is a retrieval and
 * rule engine, not a language model, and the UI says so rather than implying
 * a capability it does not have.
 *
 * Every answer cites the catalog entries it came from, which is both honest
 * and useful: a student can click through to the career or institution instead
 * of taking a generated sentence on trust.
 *
 * Matching is deliberately forgiving about Arabic. Arabic search text is
 * normalised before comparison — alef forms unified, taa marbuta folded to haa,
 * tatweel and diacritics stripped — because a student typing "اخصائي الاشعة"
 * without hamza or with a different alef should still find "أخصائي الأشعة".
 */

export type Intent =
  | "describe_career"
  | "ai_impact"
  | "career_outlook"
  | "scholarships"
  | "admission_requirements"
  | "where_to_study"
  | "weakest_skills"
  | "compare_careers"
  | "what_to_study_first"
  | "list_sector"
  | "unknown";

export interface Citation {
  kind: "career" | "university" | "course" | "scholarship";
  id: string;
  label: string;
}

export interface MentorAnswer {
  intent: Intent;
  text: string;
  citations: Citation[];
}

/* ------------------------------------------------------------------ text */

/** Strips Arabic diacritics and unifies the letter forms students vary on. */
export function normaliseArabic(input: string): string {
  return input
    .replace(/[ً-ْٰـ]/g, "")  // harakat and tatweel
    .replace(/[آأإٱ]/g, "ا")  // alef forms -> bare alef
    .replace(/ة/g, "ه")                       // taa marbuta -> haa
    .replace(/[ى]/g, "ي");                    // alef maqsura -> yaa
}

export function normalise(input: string): string {
  return normaliseArabic(input.toLowerCase().trim())
    /*
     * Punctuation becomes whitespace before the words are split.
     *
     * Without this, "what do I need to get into nursing?" ends in the token
     * "nursing?" -- and stem() only strips a suffix at the end of a string, so
     * the "ing" is never removed and "nursing?" never reaches "Nurse". The
     * matcher silently found nothing for every question that ended in a
     * question mark, which is most of them.
     *
     * Apostrophes are kept: "bachelor's" is one word, and splitting it makes
     * the stray "s" a token.
     */
    .replace(/[?!.,;:()[\]{}"«»؟،؛]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const INTENT_PATTERNS: { intent: Intent; patterns: RegExp[] }[] = [
  {
    /*
     * Ahead of career_outlook, and the two are deliberately different answers.
     *
     * "Is nursing in demand?" is a question about a labour market this catalog
     * only rates. "Will AI replace nurses?" is a question about the *shape of
     * the work*, which the catalog can actually speak to, because the exposure
     * index is derived from the skill weights and work settings it holds. So
     * the AI form of the question gets the breakdown and the outlook form gets
     * the rating, and neither pretends to be the other.
     *
     * Both halves are required to open this intent: a mention of machines AND
     * a word about displacement or the future. That is what keeps "what does
     * an AI engineer do?" -- where "AI" is part of a job title in this catalog
     * -- out of it.
     */
    intent: "ai_impact",
    patterns: [
      new RegExp(
        String.raw`\b(ai|a\.i\.|artificial intelligence|machine learning|automation`
        + String.raw`|automated|robots?|chatgpt|llms?|machines?)\b[\s\S]{0,60}`
        + String.raw`\b(replace[drs]?|replacing|take over|takeover|kill|destroy|end`
        + String.raw`|obsolete|redundant|safe|survive|resist\w*|future|threat\w*`
        + String.raw`|risk|impact|affect\w*|disrupt\w*|revolution|proof|still)\b`,
        "i",
      ),
      new RegExp(
        String.raw`\b(replace[drs]?|replacing|take over|automat\w*|obsolete|redundant`
        + String.raw`|safe from|threat\w*|proof)\b[\s\S]{0,60}`
        + String.raw`\b(ai|a\.i\.|artificial intelligence|machine learning|robots?`
        + String.raw`|chatgpt|llms?|machines?|automation)\b`,
        "i",
      ),
      // "محل" on its own, because Arabic splits the verb from it: a student
      // writes "هل سيحل الذكاء الاصطناعي محل المحاسبين" and the two halves of
      // "يحل محل" end up either side of the subject. Bare محل is a common noun
      // ("shop"), which is why it only counts within 60 characters of a
      // mention of machines.
      /(الذكاء الاصطناعي|الاتمته|الاتمتة|الأتمتة|الروبوت|الالات|الآلات)[\s\S]{0,60}(محل|يستبدل|تستبدل|يلغي|تلغي|مستقبل|خطر|تهديد|امن|أمن|يقاوم|تقاوم|يصمد|تصمد|ينهي|تنهي)/,
      /(يحل|تحل|سيحل|ستحل|يستبدل|تستبدل|خطر|تهديد|مستقبل)[\s\S]{0,60}(الذكاء الاصطناعي|الاتمته|الاتمتة|الأتمتة|الروبوت|الالات|الآلات)/,
    ],
  },
  {
    /*
     * Before where_to_study, which owns the word "study": "what scholarships
     * are there to study medicine?" is a funding question that happens to name
     * a subject, and answering it with a list of campuses is a non-answer.
     */
    intent: "scholarships",
    patterns: [
      /\b(scholarship|scholarships|bursary|bursaries|grant|grants|funding|funded|fully[- ]funded|sponsorship|sponsored|financial aid|tuition|afford|pay for|free to study|stipend)\b/i,
      /(منحه|منحة|منح|بعثه|بعثة|بعثات|تمويل|ممول|ممولة|ابتعاث|مبتعث|رسوم دراسيه|رسوم دراسية|مساعده ماليه|مساعدة مالية|مجانا|مجاني)/,
    ],
  },
  {
    /*
     * Also before where_to_study. "Where can I study medicine" is a question
     * about places; "what do I need to get into medicine at UAEU" is a
     * question about thresholds, and the catalog holds both separately.
     */
    intent: "admission_requirements",
    patterns: [
      /\b(admission|admissions|entry requirement|entry requirements|requirements to|what do i need|do i qualify|qualify for|cut[- ]?off|minimum (grade|average|score)|accept me|get (in|into)|gpa|emsat score)\b/i,
      /\b(requirements?)\b[\s\S]{0,40}\b(universit|college|admission|study|major)\b/i,
      /(شروط القبول|متطلبات القبول|شروط الالتحاق|معدل القبول|الحد الادنى|الحد الأدنى|هل اقبل|هل أُقبل|هل انطبق|درجة الامسات|درجة الإمسات|كم يجب)/,
    ],
  },
  {
    /*
     * First in the list on purpose.
     *
     * "Is X still worth studying?" contains "study", so it used to be read as
     * where_to_study; "is graphic design still a valid career after the AI
     * revolution?" matched nothing at all and fell through to the unknown
     * fallback, which is how the mentor came to answer an outlook question
     * with "name a career and I will describe it".
     *
     * Note what is deliberately NOT a trigger: "AI", "artificial
     * intelligence" and "machine learning" on their own. Those are career
     * names in this catalog, so "what does an AI engineer do?" has to stay a
     * describe_career question. Only a word about the *future* of a job opens
     * this intent.
     */
    intent: "career_outlook",
    patterns: [
      /\b(outlook|future|prospects?|demand|growth|growing|declin\w*|dying|obsolete|redundant|saturated|replace[drs]?|replacing|automat\w*|disappear\w*|job security|hiring)\b/i,
      /\bstill\b[^?.!]*\b(career|job|valid|viable|worth|relevant|needed|good|useful|safe)\b/i,
      /\b(worth it|worth studying|worth doing|good career|bad career|safe from|take over)\b/i,
      /(مستقبل|الطلب|مطلوب|فرص العمل|نمو|تراجع|يختفي|تختفي|يستبدل|تستبدل|الاتمته|الاتمتة|الأتمتة|جدوى|ما زال|ما زالت|لا يزال|لا تزال|امن وظيفي|أمن وظيفي|مشبع)/,
    ],
  },
  {
    intent: "where_to_study",
    patterns: [
      /\b(where|which university|which college|study|universit|college)\b/i,
      /(اين|أين|جامعه|جامعة|كليه|كلية|ادرس|أدرس|دراسه|دراسة)/,
    ],
  },
  {
    intent: "weakest_skills",
    patterns: [
      /\b(weak|weakest|gap|gaps|improve|lacking)\b/i,
      /(اضعف|أضعف|ضعف|فجوه|فجوة|فجوات|احسن|أحسّن|تحسين)/,
    ],
  },
  {
    intent: "compare_careers",
    patterns: [/\b(compare|versus|vs\.?|difference between)\b/i, /(قارن|مقارنه|مقارنة|الفرق بين)/],
  },
  {
    intent: "what_to_study_first",
    patterns: [
      /\b(what should i (study|learn)|start with|first step|roadmap|course)\b/i,
      /(ماذا ادرس|ماذا أدرس|ابدا|أبدأ|اول خطوه|أول خطوة|خارطه|خارطة|دوره|دورة)/,
    ],
  },
  {
    intent: "describe_career",
    patterns: [
      /\b(what does|what is|tell me about|day in the life|salary|do they do)\b/i,
      /(ماذا يعمل|ما هو|ما هي|اخبرني عن|أخبرني عن|راتب|الراتب)/,
    ],
  },
];

export function detectIntent(question: string): Intent {
  // Both forms, because the Arabic patterns are written with the letter shapes
  // a student actually types and normalise() rewrites some of them away.
  const forms = [question, normalise(question)];
  for (const { intent, patterns } of INTENT_PATTERNS) {
    if (patterns.some((pattern) => forms.some((form) => pattern.test(form)))) return intent;
  }
  return "unknown";
}

/* -------------------------------------------------------------- matching */

interface Named {
  id: string;
  en: string;
  ar: string;
}

/**
 * Folds the inflection that separates how a student writes a job from how the
 * catalog spells it — "graphic design" against "Graphic Designer", "nursing"
 * against "Registered Nurse". Only a suffix is trimmed, never a prefix, so
 * unrelated words that merely start alike stay apart.
 */
function stem(word: string): string {
  return word.replace(/(ing|ers|er|ors|or|ists|ist|ies|es|s|e)$/, "");
}

/**
 * True when two words are the same word in different clothes.
 *
 * The rule is deliberately mean: the shorter word must be at least four
 * characters, must be a prefix of the longer one, and the tail it is missing
 * must be short enough to be an ending rather than a different idea. That
 * accepts design/designer and engineer/engineering, and still refuses
 * art/artificial and data/database.
 */
function sharesStem(a: string, b: string): boolean {
  if (a === b) return true;
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  if (shorter.length < 4) return false;
  return longer.startsWith(shorter) && longer.length - shorter.length <= 3;
}

function tokenHit(token: string, words: string[]): boolean {
  const stemmed = stem(token);
  return words.some((word) => sharesStem(stemmed, stem(word)));
}

export interface Mentions {
  /** Every word of the catalog name is present in the question. */
  named: Named[];
  /**
   * Some of the name is present. Kept separate because a bare "engineer"
   * partially matches thirty roles, and picking one of them at random is worse
   * than asking which one the student meant.
   */
  partial: Named[];
}

/**
 * Finds the entries a question names.
 *
 * Scores on token overlap rather than substring containment: "nurse" should
 * match "Registered Nurse" but a bare "engineer" should not silently pick one
 * of thirty engineering roles at random — so a partial hit is reported as such
 * and the caller decides what to do with it.
 */
export function rankMentions(question: string, rows: Named[], limit = 2): Mentions {
  const haystack = normalise(question);
  const words = haystack.split(" ").filter(Boolean);
  const scored: { row: Named; score: number }[] = [];
  const partial: { row: Named; score: number }[] = [];

  for (const row of rows) {
    for (const name of [row.en, row.ar]) {
      const candidate = normalise(name);
      if (!candidate) continue;
      if (haystack.includes(candidate)) {
        // Longer names are more specific, so they win over generic ones.
        scored.push({ row, score: 100 + candidate.length });
        break;
      }
      const tokens = candidate.split(" ").filter((token) => token.length > 3);
      if (tokens.length === 0) continue;
      const hit = tokens.filter((token) => tokenHit(token, words));
      if (hit.length === tokens.length) {
        scored.push({ row, score: 50 + candidate.length });
        break;
      }
      // A partial hit only counts on a substantial word: "data" matching
      // "Data Scientist" is a lead worth offering, "and" is not.
      if (hit.length > 0 && hit.some((token) => token.length >= 5)) {
        partial.push({ row, score: hit.length * 10 - candidate.length / 100 });
      }
    }
  }

  const take = (rank: { row: Named; score: number }[], count: number) => {
    rank.sort((a, b) => b.score - a.score);
    const seen = new Set<string>();
    const picked: Named[] = [];
    for (const { row } of rank) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      picked.push(row);
      if (picked.length === count) break;
    }
    return picked;
  };

  const named = take(scored, limit);
  return {
    named,
    // Anything already matched in full is not also a loose suggestion.
    partial: take(partial, 6).filter((row) => !named.some((hit) => hit.id === row.id)),
  };
}

export function findMentions(question: string, rows: Named[], limit = 2): Named[] {
  return rankMentions(question, rows, limit).named;
}

/* --------------------------------------------------------------- answers */

const COPY = {
  en: {
    salary: (min: number, max: number) =>
      `Indicative pay runs from about AED ${min.toLocaleString("en-US")} at entry level to AED ${max.toLocaleString("en-US")} with seniority.`,
    route: (qualification: string, years: number) =>
      `The usual route is ${qualification}, taking roughly ${years} years.`,
    noCareer:
      "Name a career and I will describe it — for example “what does a radiologist do?”",
    help: [
      "I answer from the catalogs stored on this device, so I can:",
      "• describe a career and what a day in it looks like",
      "• say where in the UAE you can study for it",
      "• compare two careers",
      "• show your weakest skills for one, once you have done the assessment",
      "• tell you how the catalog rates demand for it",
      "Name a career and I will start — for example “what does a radiologist do?”",
    ].join("\n"),
    ambiguous: "Several careers match that. Which one did you mean?",
    outlookIntro: (career: string) => `Here is what the catalog records about demand for ${career}:`,
    outlookDemand: (label: string) => `• Demand rating in the UAE catalog: ${label}.`,
    outlookTrend: (from: number, to: number, percent: number) =>
      `• Illustrative five-year demand index: ${from} → ${to} (${percent >= 0 ? "+" : ""}${percent}%). This line is derived from the demand rating, not measured market data.`,
    outlookSkills: (skills: string) => `• The role is weighted most heavily on ${skills}.`,
    outlookEmployers: (employers: string) => `• Typical employers: ${employers}.`,
    outlookCaveat:
      "That is what I can stand behind: a rating and a catalog entry. I am a lookup over this site's data, not a forecaster — I cannot tell you what a technology will do to a profession, and you should not take a rating here as a prediction.",
    studyIntro: (career: string) => `To work as a ${career}, these institutions teach a matching major:`,
    studyNone: (career: string) =>
      `I could not find an institution in the catalog teaching a major for ${career}.`,
    distance: (km: number) => ` (about ${Math.round(km)} km from you)`,
    weakIntro: "Based on your assessment, these are the largest gaps for that career:",
    weakNoProfile: "Complete the assessment first and I can compare your profile against a career.",
    compareIntro: (a: string, b: string) => `Comparing ${a} and ${b}:`,
    compareShared: (skills: string) => `Both lean on ${skills}.`,
    compareDiffers: (career: string, skills: string) => `${career} additionally needs ${skills}.`,
    coursesIntro: "Given your gaps, start with these:",
    sectorIntro: (sector: string) => `Careers in ${sector}:`,

    aiIntro: (career: string, score: number, band: string) =>
      `AI resistance for ${career}: ${score}/100 — ${band}.`,
    aiExposed: "What AI already does in this role:",
    aiProtected: "What it does not:",
    aiHedge: (skills: string) =>
      `Building ${skills} inside this career moves you toward the part of it that holds.`,
    aiCaveat:
      "That score is a structural index over this site's own data — the role's skill "
      + "weights, where the work happens, whether it is licensed, how long the training is. "
      + "It answers \u201chow much of this job is the kind of work machines are good at "
      + "today\u201d, which is a narrower question than the one you asked. I am a lookup over "
      + "this catalog, not a forecaster: I cannot tell you whether this job exists in 2040, "
      + "and neither can anyone selling you a number that says they can.",

    schoIntro: (subject: string) => `Funding routes that cover ${subject}:`,
    schoGeneral: "The funding routes in the catalog, widest first:",
    schoNone: (subject: string) =>
      `I have no programme in the catalog scoped to ${subject}. These are the open routes:`,
    schoBond: "commitment required",
    schoCaveat:
      "Every record here is indicative — terms and deadlines change every intake, so confirm "
      + "on the provider's own page. Two things worth knowing: need-based funds are the least "
      + "applied-for money in the system because students assume they will not qualify, and "
      + "employer sponsorship is not a discount — it commits years of your life, so read the "
      + "length before you sign.",

    admIntro: (university: string) => `Indicative admission requirements for ${university}:`,
    admAverage: (percent: number) => `• Minimum high-school average: ${percent}%.`,
    admEmsat: (requirements: string) => `• EmSAT: ${requirements}.`,
    admTrack: (tracks: string) => `• MOE track: ${tracks}.`,
    admLanguage: (languages: string) => `• Language of instruction: ${languages}.`,
    admStanding: {
      likely_eligible: "On the numbers in your profile, you are above these indicative "
        + "thresholds.",
      borderline: "On the numbers in your profile, you are close to these thresholds — "
        + "close enough that the real decision is the university's, not mine.",
      below_indicative: "On the numbers in your profile, you are below these indicative "
        + "thresholds. That is not a rejection: these figures are the shape of a typical "
        + "requirement, not this year's cut-off, and they move.",
    },
    admNoProfile: "Complete the assessment and I can compare your grades against these.",
    admForCareer: (career: string) =>
      `To get into ${career}, these institutions teach a matching major. Indicative requirements:`,
    admNone: "Name a university and I will give you its indicative requirements — for "
      + "example \u201cwhat are the admission requirements for Khalifa University?\u201d",
    admCaveat:
      "These are indicative figures held in this catalog, not a quotation from an admissions "
      + "office, and they change year to year. The university's own page is the only one that "
      + "can tell you this year's requirement.",
  },
  ar: {
    salary: (min: number, max: number) =>
      `يتراوح الأجر الإرشادي من نحو ${min.toLocaleString("en-US")} درهم في بداية المسار إلى ${max.toLocaleString("en-US")} درهم مع الخبرة.`,
    route: (qualification: string, years: number) =>
      `المسار المعتاد هو ${qualification}، ويستغرق نحو ${years} سنوات.`,
    noCareer: "اذكر اسم مهنة وسأصفها لك — مثلًا: «ماذا يعمل أخصائي الأشعة؟»",
    help: [
      "أُجيب من الكتالوجات المخزَّنة على هذا الجهاز، لذا يمكنني:",
      "• وصف مهنة وكيف يبدو يوم العمل فيها",
      "• تحديد أين يمكنك دراستها في الإمارات",
      "• المقارنة بين مهنتين",
      "• عرض أضعف مهاراتك بالنسبة لمهنة، بعد إكمال التقييم",
      "• إخبارك كيف يصنّف الكتالوج الطلب عليها",
      "اذكر اسم مهنة لنبدأ — مثلًا: «ماذا يعمل أخصائي الأشعة؟»",
    ].join("\n"),
    ambiguous: "هناك عدة مهن تطابق ذلك. أيها تقصد؟",
    outlookIntro: (career: string) => `هذا ما يسجّله الكتالوج عن الطلب على مهنة ${career}:`,
    outlookDemand: (label: string) => `• تصنيف الطلب في كتالوج الإمارات: ${label}.`,
    outlookTrend: (from: number, to: number, percent: number) =>
      `• مؤشر طلب إرشادي لخمس سنوات: ${from} ← ${to} (${percent >= 0 ? "+" : ""}${percent}%). هذا الخط مشتقّ من تصنيف الطلب وليس بيانات سوق مقيسة.`,
    outlookSkills: (skills: string) => `• يعتمد الدور بأكبر وزن على ${skills}.`,
    outlookEmployers: (employers: string) => `• جهات العمل المعتادة: ${employers}.`,
    outlookCaveat:
      "هذا ما أستطيع تأكيده: تصنيف ومدخل في الكتالوج. أنا بحث في بيانات هذا الموقع، لا أداة تنبؤ — لا أستطيع إخبارك بما ستفعله تقنية ما بمهنة، ولا ينبغي اعتبار التصنيف هنا تنبؤًا.",
    studyIntro: (career: string) => `للعمل في مهنة ${career}، تُدرّس هذه المؤسسات تخصصًا مناسبًا:`,
    studyNone: (career: string) => `لم أجد في الكتالوج مؤسسة تُدرّس تخصصًا يؤدي إلى ${career}.`,
    distance: (km: number) => ` (نحو ${Math.round(km)} كم منك)`,
    weakIntro: "بناءً على تقييمك، هذه أكبر الفجوات بالنسبة لتلك المهنة:",
    weakNoProfile: "أكمل التقييم أولًا لأتمكن من مقارنة ملفك بمهنة معينة.",
    compareIntro: (a: string, b: string) => `مقارنة بين ${a} و${b}:`,
    compareShared: (skills: string) => `كلاهما يعتمد على ${skills}.`,
    compareDiffers: (career: string, skills: string) => `وتحتاج ${career} إضافةً إلى ${skills}.`,
    coursesIntro: "بالنظر إلى فجواتك، ابدأ بهذه الدورات:",
    sectorIntro: (sector: string) => `مهن في قطاع ${sector}:`,

    aiIntro: (career: string, score: number, band: string) =>
      `مقاومة الذكاء الاصطناعي لمهنة ${career}: ${score}/100 — ${band}.`,
    aiExposed: "ما يؤديه الذكاء الاصطناعي في هذا الدور بالفعل:",
    aiProtected: "وما لا يؤديه:",
    aiHedge: (skills: string) =>
      `بناء ${skills} داخل هذه المهنة ينقلك نحو الجزء الصامد منها.`,
    aiCaveat:
      "هذه الدرجة مؤشر بنيوي مبني على بيانات هذا الموقع نفسه — أوزان مهارات الدور، وأين يجري "
      + "العمل، وهل هو مرخَّص، وكم يطول التأهيل. وهي تجيب عن سؤال: ما مقدار ما في هذه المهنة "
      + "من عمل تتقنه الآلات اليوم، وهو سؤال أضيق مما سألت. أنا بحث في هذا الكتالوج ولست أداة "
      + "تنبؤ: لا أستطيع إخبارك إن كانت هذه المهنة ستبقى عام 2040، ولا يستطيع ذلك من يبيعك "
      + "رقمًا يزعم أنه يستطيع.",

    schoIntro: (subject: string) => `مسارات التمويل التي تشمل ${subject}:`,
    schoGeneral: "مسارات التمويل في الكتالوج، الأوسع أولًا:",
    schoNone: (subject: string) =>
      `لا يوجد في الكتالوج برنامج مخصّص لـ${subject}. وهذه المسارات المفتوحة:`,
    schoBond: "يتطلب التزامًا",
    schoCaveat:
      "كل ما هنا إرشادي — تتغير الشروط والمواعيد في كل دورة قبول، فتأكّد من الصفحة الرسمية "
      + "للجهة. وأمران يستحقان المعرفة: صناديق الحاجة المادية هي أقل التمويل طلبًا لأن الطلبة "
      + "يفترضون أنهم لن يستوفوا الشروط، وابتعاث جهة العمل ليس خصمًا — بل يرهن سنوات من حياتك، "
      + "فاقرأ المدة قبل التوقيع.",

    admIntro: (university: string) => `شروط قبول إرشادية في ${university}:`,
    admAverage: (percent: number) => `• الحد الأدنى للمعدل الثانوي: ${percent}%.`,
    admEmsat: (requirements: string) => `• الإمسات: ${requirements}.`,
    admTrack: (tracks: string) => `• مسار الوزارة: ${tracks}.`,
    admLanguage: (languages: string) => `• لغة الدراسة: ${languages}.`,
    admStanding: {
      likely_eligible: "بحسب الأرقام في ملفك، أنت فوق هذه العتبات الإرشادية.",
      borderline: "بحسب الأرقام في ملفك، أنت قريب من هذه العتبات — إلى حدّ يجعل القرار "
        + "الفعلي للجامعة لا لي.",
      below_indicative: "بحسب الأرقام في ملفك، أنت دون هذه العتبات الإرشادية. وهذا ليس رفضًا: "
        + "فهذه الأرقام تمثّل شكل المتطلب المعتاد لا حدّ القبول لهذا العام، وهي تتغير.",
    },
    admNoProfile: "أكمل التقييم لأتمكن من مقارنة درجاتك بهذه الشروط.",
    admForCareer: (career: string) =>
      `للدخول إلى مهنة ${career}، تُدرّس هذه المؤسسات تخصصًا مناسبًا. والشروط الإرشادية:`,
    admNone: "اذكر اسم جامعة وسأعطيك شروطها الإرشادية — مثلًا: «ما شروط القبول في جامعة خليفة؟»",
    admCaveat:
      "هذه أرقام إرشادية محفوظة في هذا الكتالوج، وليست اقتباسًا من مكتب قبول، وهي تتغير من "
      + "سنة إلى أخرى. وصفحة الجامعة نفسها هي الوحيدة التي تخبرك بمتطلب هذا العام.",
  },
} as const;

/** The same wording the careers pages use for the same rating. */
const DEMAND_LABEL: Record<Lang, Record<string, string>> = {
  en: { very_high: "Very high", high: "High", moderate: "Moderate" },
  ar: { very_high: "مرتفع جداً", high: "مرتفع", moderate: "متوسط" },
};

/** An Arabic comma in an English sentence reads as a typo. */
const listSep = (locale: Lang) => (locale === "ar" ? "، " : ", ");

const COVERAGE_LABEL: Record<Lang, Record<string, string>> = {
  en: {
    full_plus_stipend: "full tuition plus living costs",
    full_tuition: "full tuition",
    free_for_nationals: "free for UAE nationals",
    partial_tuition: "partial tuition",
    sponsored_with_bond: "fully sponsored",
  },
  ar: {
    full_plus_stipend: "الرسوم كاملة مع نفقات المعيشة",
    full_tuition: "الرسوم كاملة",
    free_for_nationals: "مجاني لمواطني الدولة",
    partial_tuition: "تغطية جزئية للرسوم",
    sponsored_with_bond: "ابتعاث كامل",
  },
};

const AUDIENCE_LABEL: Record<Lang, Record<string, string>> = {
  en: { uae_nationals: "UAE nationals", residents: "residents", all: "open to all" },
  ar: { uae_nationals: "مواطنو الدولة", residents: "المقيمون", all: "مفتوح للجميع" },
};

/**
 * Scholarships relevant to a career, a major or a bare question.
 *
 * Scored rather than filtered: a programme scoped to exactly this career's
 * majors should outrank a nationwide catch-all, but the catch-all must still
 * appear, because for most students the honest answer to "how do I pay for
 * this" is one of the broad routes rather than a perfectly-matched niche one.
 */
function rankScholarships(
  scholarships: Scholarship[],
  career: Career | null,
  profile: Profile | null,
  limit = 5,
): Scholarship[] {
  const wanted = new Set(career?.educationPath.relatedMajors ?? []);
  const scored = scholarships.map((scholarship) => {
    let score = 0;
    if (wanted.size > 0) {
      const overlap = scholarship.fields.filter((field) => wanted.has(field)).length;
      score += overlap * 12;
    }
    // Coverage is the thing a student is actually choosing between.
    score += { full_plus_stipend: 8, free_for_nationals: 6, full_tuition: 5,
               sponsored_with_bond: 4, partial_tuition: 2 }[scholarship.coverage] ?? 0;
    if (profile?.emirate && scholarship.emirate === profile.emirate) score += 4;
    if (scholarship.emirate === "all") score += 2;
    if (profile?.track && scholarship.eligibility.trackRequired.includes(profile.track)) {
      score += 3;
    }
    return { scholarship, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((row) => row.scholarship);
}

/** The admission block of one institution, as bullet lines. */
function admissionLines(
  university: University,
  locale: Lang,
  copy: (typeof COPY)[Lang],
  subjectName: (id: string) => string,
): string[] {
  const lines = [copy.admAverage(university.admission.minHighSchoolPercent)];
  const emsat = Object.entries(university.admission.emsatRequirements);
  if (emsat.length > 0) {
    lines.push(
      copy.admEmsat(
        emsat.map(([subject, score]) => `${subjectName(subject)} ${score}`)
          .join(listSep(locale)),
      ),
    );
  }
  if (university.admission.trackRequired.length > 0) {
    lines.push(copy.admTrack(university.admission.trackRequired.join(listSep(locale))));
  }
  lines.push(
    copy.admLanguage(
      university.languageOfInstruction
        .map((language) => (language === "ar" ? "Arabic" : "English"))
        .join(listSep(locale)),
    ),
  );
  return lines;
}

export async function answer(
  question: string,
  locale: Lang,
  profile: Profile | null,
  skillEstimates: Record<string, number> | null,
): Promise<MentorAnswer> {
  const copy = COPY[locale];
  const intent = detectIntent(question);

  const [
    careerIndex, careersFull, universities, skills, courses, majors, scholarships, resistance,
  ] = await Promise.all([
    loadCareerIndex(), loadCareers(), loadUniversities(), loadSkills(), loadCourses(),
    loadMajors(), loadScholarships(), loadResistanceGlossary(),
  ]);

  const careerNames: Named[] = careerIndex.map((c) => ({ id: c.id, en: c.title.en, ar: c.title.ar }));
  const ranked = rankMentions(question, careerNames, 2);

  /*
   * Institutions are matched on both their full name and their short one,
   * because nobody types "United Arab Emirates University" -- they type
   * "UAEU". rankMentions refuses tokens shorter than four characters, so the
   * abbreviations are matched by containment here instead.
   */
  const universityNames: Named[] = universities.flatMap((university) => [
    { id: university.id, en: university.name.en, ar: university.name.ar },
    { id: university.id, en: university.shortName.en, ar: university.shortName.ar },
  ]);
  const haystack = normalise(question);
  const namedUniversity = rankMentions(question, universityNames, 1).named[0]
    ?? universityNames.find((row) => {
      const short = normalise(row.en);
      return short.length >= 2 && new RegExp(`\\b${short}\\b`).test(haystack);
    })
    ?? null;

  /*
   * A single near miss is not an ambiguity — it is the answer.
   *
   * Arabic derivation is the case that forces this: a student writes
   * "التصميم الجرافيكي" (graphic design) and the catalog holds
   * "المصمّم الجرافيكي" (graphic designer). Only one of the two words is
   * shared, so the match is partial, but nothing else in 184 careers claims
   * that word. Asking "which one did you mean?" with one option would be
   * pedantry. Two or more and the question goes back to the student.
   */
  const mentioned = ranked.named.length > 0
    ? ranked.named
    : ranked.partial.length === 1
      ? ranked.partial
      : [];
  const partial = mentioned.length > 0 ? [] : ranked.partial;
  const careersById = indexBy(careersFull);
  const skillsById = indexBy(skills);
  const majorsById = indexBy(majors);

  const skillName = (id: string) => {
    const skill = skillsById.get(id);
    return skill ? (locale === "ar" ? skill.name_ar : skill.name_en) : id;
  };

  // --- AI impact ---------------------------------------------------------
  //
  // The one question in this app that a catalog can answer better than an
  // opinion can. The score is derived from fields the student can see on the
  // same career page, the breakdown is included so they can disagree with it
  // specifically rather than vaguely, and the closing paragraph states the
  // limit of the claim rather than trailing off into confidence.
  if (intent === "ai_impact" && mentioned.length > 0) {
    const career = careersById.get(mentioned[0].id);
    if (career) {
      const separator = listSep(locale);
      const index = career.aiResistance;
      const band = resistance.bands[index.band];
      const trend = career.growthTrend;
      const first = trend[0];
      const last = trend[trend.length - 1];
      const percent = first > 0 ? Math.round(((last - first) / first) * 100) : 0;

      const sections = [
        copy.aiIntro(career.title[locale], index.score, band.label[locale]),
        band.summary[locale],
        [
          copy.aiExposed,
          ...index.exposedGroups.map(
            (group) => `• ${resistance.groups[group]?.exposed[locale] ?? group}`,
          ),
        ].join("\n"),
        [
          copy.aiProtected,
          ...index.protectedGroups.map(
            (group) => `• ${resistance.groups[group]?.protected[locale] ?? group}`,
          ),
        ].join("\n"),
        copy.aiHedge(index.hedgeSkills.map(skillName).join(separator)),
        // The demand rating too: a student asking about AI is asking about the
        // future of the job, and the rating is the other half of that answer.
        [
          copy.outlookDemand(DEMAND_LABEL[locale][career.demand] ?? career.demand),
          copy.outlookTrend(first, last, percent),
        ].join("\n"),
        copy.aiCaveat,
      ];

      return {
        intent,
        text: sections.join("\n\n"),
        citations: [{ kind: "career", id: career.id, label: career.title[locale] }],
      };
    }
  }

  // --- scholarships ------------------------------------------------------
  if (intent === "scholarships") {
    const career = mentioned.length > 0 ? careersById.get(mentioned[0].id) : null;
    const picked = rankScholarships(scholarships, career ?? null, profile);
    const scoped = career
      ? picked.some((row) =>
        row.fields.some((field) => career.educationPath.relatedMajors.includes(field)))
      : false;

    const intro = career
      ? (scoped ? copy.schoIntro(career.title[locale]) : copy.schoNone(career.title[locale]))
      : copy.schoGeneral;

    const lines = picked.map((scholarship) => {
      const coverage = COVERAGE_LABEL[locale][scholarship.coverage] ?? scholarship.coverage;
      const audience = AUDIENCE_LABEL[locale][scholarship.audience] ?? scholarship.audience;
      const bond = scholarship.obligation ? ` — ${copy.schoBond}` : "";
      return `• ${scholarship.name[locale]} (${scholarship.provider[locale]}) — `
        + `${coverage}, ${audience}${bond}`;
    });

    return {
      intent,
      text: [intro, lines.join("\n"), copy.schoCaveat].join("\n\n"),
      citations: picked.map((scholarship) => ({
        kind: "scholarship" as const,
        id: scholarship.id,
        label: scholarship.name[locale],
      })),
    };
  }

  // --- admission requirements --------------------------------------------
  if (intent === "admission_requirements") {
    const subjectName = (id: string) => id;

    // Named an institution: answer about that institution.
    if (namedUniversity) {
      const university = universities.find((row) => row.id === namedUniversity.id);
      if (university) {
        const standing = profile ? assessEligibility(university, profile) : null;
        const sections = [
          [
            copy.admIntro(university.name[locale]),
            ...admissionLines(university, locale, copy, subjectName),
          ].join("\n"),
          standing ? copy.admStanding[standing] : copy.admNoProfile,
          university.admission.notes[locale],
          copy.admCaveat,
        ];
        return {
          intent,
          text: sections.join("\n\n"),
          citations: [
            { kind: "university", id: university.id, label: university.name[locale] },
          ],
        };
      }
    }

    // Named a career instead: answer about the institutions that teach it.
    const career = mentioned.length > 0 ? careersById.get(mentioned[0].id) : null;
    if (career) {
      const matches = matchUniversities(career, universities, profile).slice(0, 3);
      if (matches.length > 0) {
        const blocks = matches.map((match) =>
          [
            `• ${match.university.name[locale]}`,
            ...admissionLines(match.university, locale, copy, subjectName)
              .map((line) => `  ${line}`),
          ].join("\n"));
        return {
          intent,
          text: [copy.admForCareer(career.title[locale]), blocks.join("\n"), copy.admCaveat]
            .join("\n\n"),
          citations: matches.map((match) => ({
            kind: "university" as const,
            id: match.university.id,
            label: match.university.name[locale],
          })),
        };
      }
    }

    // Nothing named in full. If the question was a near miss on several
    // careers ("what do I need to get into nursing?" half-matches three
    // nursing roles), fall through to the shared ambiguity reply, which offers
    // them — better than telling a student who named a subject to name one.
    if (partial.length === 0) {
      return { intent, text: copy.admNone, citations: [] };
    }
  }

  // --- where to study ----------------------------------------------------
  if (intent === "where_to_study" && mentioned.length > 0) {
    const career = careersById.get(mentioned[0].id);
    if (career) {
      const matches = matchUniversities(career, universities, profile).slice(0, 4);
      if (matches.length === 0) {
        return { intent, text: copy.studyNone(career.title[locale]), citations: [] };
      }
      const lines = matches.map((match) => {
        const distance = match.distanceKm === null ? "" : copy.distance(match.distanceKm);
        const majorNames = match.matchedMajors
          .map((id) => majorsById.get(id)?.name[locale] ?? id)
          .join(listSep(locale));
        return `• ${match.university.name[locale]}${distance} — ${majorNames}`;
      });
      return {
        intent,
        text: [copy.studyIntro(career.title[locale]), ...lines].join("\n"),
        citations: matches.map((match) => ({
          kind: "university" as const,
          id: match.university.id,
          label: match.university.name[locale],
        })),
      };
    }
  }

  // --- outlook -----------------------------------------------------------
  //
  // The honest shape of this answer: state the rating, state where the rating
  // comes from, and say plainly that a catalog cannot forecast. A student
  // asking whether a job survives AI deserves the data this site actually has
  // plus the limit of it, not a confident opinion the engine cannot support.
  if (intent === "career_outlook" && mentioned.length > 0) {
    const career = careersById.get(mentioned[0].id);
    if (career) {
      const trend = career.growthTrend;
      const first = trend[0];
      const last = trend[trend.length - 1];
      const percent = first > 0 ? Math.round(((last - first) / first) * 100) : 0;
      const separator = listSep(locale);

      const lines = [
        copy.outlookIntro(career.title[locale]),
        copy.outlookDemand(DEMAND_LABEL[locale][career.demand] ?? career.demand),
        copy.outlookTrend(first, last, percent),
        copy.outlookSkills(
          career.requiredSkills.slice(0, 3).map((entry) => skillName(entry.skill)).join(separator),
        ),
      ];
      const employers = career.employers?.[locale] ?? [];
      if (employers.length > 0) lines.push(copy.outlookEmployers(employers.join(separator)));

      return {
        intent,
        text: [lines.join("\n"), career.uaeRelevance[locale], copy.outlookCaveat].join("\n\n"),
        citations: [{ kind: "career", id: career.id, label: career.title[locale] }],
      };
    }
  }

  // --- weakest skills ----------------------------------------------------
  if (intent === "weakest_skills") {
    if (!profile || !skillEstimates) {
      return { intent, text: copy.weakNoProfile, citations: [] };
    }
    const career = mentioned.length > 0 ? careersById.get(mentioned[0].id) : null;
    const target = career ?? careersById.get(profile.savedCareers[0] ?? "");
    if (!target) {
      return { intent, text: copy.noCareer, citations: [] };
    }
    const gaps = target.requiredSkills
      .map((entry) => ({
        skill: entry.skill,
        gap: Math.max(0, entry.requiredLevel - (skillEstimates[entry.skill] ?? 50)),
      }))
      .filter((row) => row.gap > 0)
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 4);

    return {
      intent,
      text: [
        copy.weakIntro,
        ...gaps.map((row) => `• ${skillName(row.skill)} — ${Math.round(row.gap)}`),
      ].join("\n"),
      citations: [{ kind: "career", id: target.id, label: target.title[locale] }],
    };
  }

  // --- compare -----------------------------------------------------------
  if (intent === "compare_careers" && mentioned.length >= 2) {
    const [first, second] = mentioned.map((row) => careersById.get(row.id));
    if (first && second) {
      const firstSkills = new Set(first.requiredSkills.slice(0, 6).map((s) => s.skill));
      const secondSkills = new Set(second.requiredSkills.slice(0, 6).map((s) => s.skill));
      const shared = [...firstSkills].filter((s) => secondSkills.has(s));
      const onlyFirst = [...firstSkills].filter((s) => !secondSkills.has(s));
      const onlySecond = [...secondSkills].filter((s) => !firstSkills.has(s));

      const lines = [copy.compareIntro(first.title[locale], second.title[locale])];
      if (shared.length > 0) lines.push(copy.compareShared(shared.map(skillName).join(listSep(locale))));
      if (onlyFirst.length > 0) {
        lines.push(copy.compareDiffers(first.title[locale], onlyFirst.map(skillName).join(listSep(locale))));
      }
      if (onlySecond.length > 0) {
        lines.push(copy.compareDiffers(second.title[locale], onlySecond.map(skillName).join(listSep(locale))));
      }
      lines.push(copy.salary(first.salaryAED.entry, first.salaryAED.senior));
      lines.push(copy.salary(second.salaryAED.entry, second.salaryAED.senior));

      return {
        intent,
        text: lines.join("\n"),
        citations: [first, second].map((career) => ({
          kind: "career" as const,
          id: career.id,
          label: career.title[locale],
        })),
      };
    }
  }

  // --- what to study first -----------------------------------------------
  if (intent === "what_to_study_first") {
    const career = mentioned.length > 0 ? careersById.get(mentioned[0].id) : null;
    const target = career ?? careersById.get(profile?.savedCareers[0] ?? "");
    if (target) {
      const picked = target.topCourses
        .map((id) => courses.find((course) => course.id === id))
        .filter((course): course is NonNullable<typeof course> => course !== undefined)
        .slice(0, 4);
      return {
        intent,
        text: [
          copy.coursesIntro,
          ...picked.map(
            (course) =>
              `• ${locale === "ar" ? course.title_ar : course.title_en} — ${course.provider}`,
          ),
        ].join("\n"),
        citations: picked.map((course) => ({
          kind: "course" as const,
          id: course.id,
          label: locale === "ar" ? course.title_ar : course.title_en,
        })),
      };
    }
  }

  // --- describe (also the fallback when a career is clearly named) --------
  if (mentioned.length > 0) {
    const career = careersById.get(mentioned[0].id);
    if (career) {
      return {
        intent: "describe_career",
        text: [
          career.shortDescription[locale],
          career.dayInTheLife[locale],
          copy.route(
            career.educationPath.minimumQualification[locale],
            career.educationPath.typicalYears,
          ),
          copy.salary(career.salaryAED.entry, career.salaryAED.senior),
        ].join("\n\n"),
        citations: [{ kind: "career", id: career.id, label: career.title[locale] }],
      };
    }
  }

  // --- nothing matched in full -------------------------------------------
  //
  // A near miss is worth offering. "Is graphic design still a career?" once
  // landed here and got "name a career and I will describe it", which is both
  // wrong — the question named one — and a dead end.
  if (partial.length > 0) {
    return {
      intent: "unknown",
      text: copy.ambiguous,
      citations: partial.map((row) => ({
        kind: "career" as const,
        id: row.id,
        label: locale === "ar" ? row.ar : row.en,
      })),
    };
  }

  return { intent: "unknown", text: copy.help, citations: [] };
}
