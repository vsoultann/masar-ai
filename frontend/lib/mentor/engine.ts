import {
  indexBy, loadCareerIndex, loadCourses, loadMajors, loadScholarships,
  loadSectors, loadSkills, loadUniversities,
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
  | "greeting"
  | "capabilities"
  | "describe_career"
  | "salary"
  | "list_majors"
  | "universities"
  | "my_matches"
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
     * Anchored to the whole message, not searched inside it. "Hi" is a
     * greeting; "what is the highest paid job" contains "hi" and is not.
     */
    intent: "greeting",
    patterns: [
      /^\s*(hi|hey|hello|yo|salam|salaam|assalamu?\s*alaikum|good (morning|evening|afternoon))[\s!.,?]*$/i,
      /^\s*(مرحبا|اهلا|أهلا|السلام عليكم|هلا|صباح الخير|مساء الخير)[\s!.،؟]*$/,
    ],
  },
  {
    intent: "capabilities",
    patterns: [
      /\b(what can you do|what do you do|how do you work|what are you|who are you|help me with|^help$|your capabilities|what can i ask)\b/i,
      /(ماذا تستطيع|ما الذي تستطيع|كيف تعمل|من انت|من أنت|بماذا تساعد|ماذا يمكنني ان اسال)/,
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
      /\b(scholarship|scholarships|bursary|bursaries|grant|grants|funding|funded|fully[- ]funded|sponsorship|sponsored|financial aid|tuition|afford|pay for|free to study|study for free|for free|stipend)\b/i,
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
    /*
     * Before where_to_study and before describe_career, both of which used to
     * swallow this. "How much do engineers make?" has no institution and no
     * single named role, and answering it with a description of one arbitrary
     * engineering job -- which is what happened -- is worse than saying
     * nothing.
     */
    intent: "salary",
    patterns: [
      /\b(salary|salaries|wage|wages|income|earn|earns|earning|paid|pay|pays|paying|make money|how much)\b/i,
      /(راتب|رواتب|اجر|أجر|اجور|أجور|دخل|كم يكسب|كم تكسب|كم يتقاضى|كم الراتب|الاعلى اجرا|الأعلى أجرًا)/,
    ],
  },
  {
    /*
     * Majors are the unit a student actually applies in, and the app had no
     * way to answer a question phrased in them. Ahead of where_to_study
     * because "what majors should I study?" contains "study".
     */
    intent: "list_majors",
    patterns: [
      /\b(major|majors|degree|degrees|programme|program|specialisation|specialization|subject to study|what should i study)\b/i,
      /(تخصص|تخصصات|التخصص|شهاده جامعيه|شهادة جامعية|درجه علميه|درجة علمية|ماذا ادرس|ماذا أدرس)/,
    ],
  },
  {
    /*
     * Ahead of where_to_study, which owns the bare word "study". A question
     * that names an institution word is about institutions: "which
     * universities are in Dubai" is a list, "tell me about Khalifa
     * University" is a description, and neither is "where can I study X".
     */
    intent: "universities",
    patterns: [
      /\b(universit\w*|college|colleges|campus|campuses|institution|institutions)\b/i,
      /(جامعه|جامعة|جامعات|كليه|كلية|كليات|حرم جامعي)/,
    ],
  },
  {
    /*
     * "What should I do?" with a completed profile is the one question the
     * recommender exists to answer, and the mentor was sending it to the
     * generic help text.
     */
    intent: "my_matches",
    patterns: [
      /\b(suit me|suits me|for me|fit me|fits me|right for me|recommend me|what should i (be|do|become)|best career for me|my (results|matches|recommendations))\b/i,
      /(يناسبني|تناسبني|المناسب لي|ماذا اصبح|ماذا أصبح|ماذا افعل|ماذا أفعل|نتائجي|توصياتي|اقترح لي)/,
    ],
  },
  {
    /*
     * Browsing by sector. The intent was declared in v2 and never
     * implemented, so "what careers are there in finance?" fell through to the
     * ambiguity reply.
     */
    intent: "list_sector",
    patterns: [
      /\b(careers? in|jobs? in|roles? in|work in|list (careers|jobs)|what careers|what jobs|which careers|which jobs|options in)\b/i,
      /(مهن في|وظائف في|ادوار في|أدوار في|ما هي المهن|ما هي الوظائف|قائمه المهن|قائمة المهن|مجالات في)/,
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

/*
 * Words that are a job title's *category*, not its identity.
 *
 * A question containing one of these has not named anything. The word that
 * forced this list is "university": exactly one career in 184 has it in its
 * name, so "what is the best university in the UAE?" was a unique partial
 * match on "University Lecturer" -- unique enough to be promoted to a full
 * match, and the student asking which campus to apply to was told what a
 * lecturer does all day.
 *
 * Frequency alone would not have caught that, precisely because the match was
 * unique. This is a judgement about what the words mean, so it is a list.
 */
const GENERIC_NAME_WORDS = new Set([
  "university", "college", "school", "academy", "institute", "student",
  "engineer", "engineering", "manager", "management", "officer", "specialist",
  "technician", "analyst", "scientist", "consultant", "assistant", "adviser",
  "advisor", "worker", "designer", "developer", "doctor", "teacher", "director",
  "coordinator", "administrator", "professional", "practitioner", "operator",
  "senior", "junior", "chief", "head", "general", "national", "international",
  // Frame words: they belong to the question, not to the thing being asked
  // about, but they also appear inside catalog names. "What majors should I
  // study?" partially matched "Islamic Studies Scholar"; "which careers pay
  // the most?" matched "Academic & Career Counsellor"; both were the only
  // partial hit, so both were promoted to a confident wrong answer.
  "career", "careers", "job", "jobs", "study", "studies", "studying", "work",
  "counsellor", "counselor", "scholar", "academic", "service", "services",
  "مهنه", "مهنة", "مهن", "وظيفه", "وظيفة", "وظائف", "دراسه", "دراسة", "عمل",
  "جامعه", "جامعة", "كليه", "كلية", "مهندس", "مدير", "اخصائي", "أخصائي",
  "فني", "محلل", "عالم", "مستشار", "مساعد", "مصمم", "مطور", "طبيب", "معلم",
]);

interface Scored {
  row: Named;
  score: number;
  onlyGeneric?: boolean;
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
  /**
   * True when every partial hit landed only on a generic job-title word, so
   * the question named a *kind* of role rather than a role. The caller must
   * not promote these to a match, however few of them there are.
   */
  partialIsGeneric: boolean;
  /**
   * The partials that matched on something other than a generic word.
   *
   * `partial` deliberately keeps the generic ones -- "I want to be a designer"
   * should still surface Graphic Designer as a suggestion. But when the caller
   * needs to *act* on a near miss rather than offer it, those are noise:
   * "where can I study medicine?" half-matched Islamic Studies, Maritime
   * Studies and Museum Studies purely on the word "studies".
   */
  partialStrong: Named[];
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
  const scored: Scored[] = [];
  const partial: Scored[] = [];

  for (const row of rows) {
    for (const name of [row.en, row.ar]) {
      const candidate = normalise(name);
      if (!candidate) continue;
      if (haystack.includes(candidate)) {
        // Longer names are more specific, so they win over generic ones.
        scored.push({ row, score: 100 + candidate.length });
        break;
      }
      /*
       * A full match needs every word of the name, short ones included.
       *
       * Filtering the name down to words longer than three characters before
       * demanding a full match meant "NLP Engineer" was effectively catalogued
       * as "Engineer" -- "nlp" was dropped, one token remained, and the
       * question "how much do engineers make?" matched it in full and got a
       * confident answer about natural-language processing. Short words are
       * still ignored for *partial* scoring below, where they are noise; here
       * they are part of the name.
       */
      const allTokens = candidate.split(" ").filter(Boolean);
      const longTokens = allTokens.filter((token) => token.length > 3);
      if (longTokens.length === 0) continue;
      if (allTokens.every((token) => tokenHit(token, words))) {
        scored.push({ row, score: 50 + candidate.length });
        break;
      }
      const hit = longTokens.filter((token) => tokenHit(token, words));
      // A partial hit only counts on a substantial word: "data" matching
      // "Data Scientist" is a lead worth offering, "and" is not.
      if (hit.length > 0 && hit.some((token) => token.length >= 5)) {
        partial.push({
          row,
          score: hit.length * 10 - candidate.length / 100,
          // Carried so the caller can tell a partial worth promoting from one
          // that merely brushed a generic job-title word.
          onlyGeneric: hit.every((token) => GENERIC_NAME_WORDS.has(token)),
        });
      }
    }
  }

  const take = (rank: Scored[], count: number) => {
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
  const notNamed = (row: Named) => !named.some((hit) => hit.id === row.id);
  return {
    named,
    // Anything already matched in full is not also a loose suggestion.
    partial: take(partial, 6).filter(notNamed),
    partialIsGeneric: partial.length > 0 && partial.every((row) => row.onlyGeneric === true),
    partialStrong: take(partial.filter((row) => !row.onlyGeneric), 4).filter(notNamed),
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
    closestMatch: (career: string) => `The closest match is ${career}.`,
    otherMatches: "Other roles matched what you asked too — they are linked below.",
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

    greeting:
      "Hello. Ask me about a career, a major, a university, what something pays, how to fund "
      + "it, or what AI is doing to a profession \u2014 in English or Arabic.",
    salaryFor: (career: string) => `Indicative pay for ${career}:`,
    salaryTier: (entry: number, mid: number, senior: number) =>
      `\u2022 Entry AED ${entry.toLocaleString("en-US")} \u2022 Mid AED ${mid.toLocaleString("en-US")} `
      + `\u2022 Senior AED ${senior.toLocaleString("en-US")}, per month.`,
    salaryTopIntro: "The highest-paying careers in the catalog, by senior-level pay:",
    salaryInSector: (sector: string) => `The best-paid careers in ${sector}:`,
    salaryLine: (career: string, entry: number, senior: number) =>
      `\u2022 ${career} \u2014 AED ${entry.toLocaleString("en-US")} rising to ${senior.toLocaleString("en-US")}`,
    salaryCaveat:
      "Indicative monthly ranges for the UAE market, held in this catalog. Real offers vary "
      + "with the employer, the emirate and what you bring. Pay is also the worst single "
      + "reason to pick a career: these are the same roles you will spend forty years in.",

    majorsFor: (career: string) => `Majors that lead to ${career}:`,
    majorsTaught: (count: number) =>
      `Taught by ${count} institution${count === 1 ? "" : "s"} in this catalog.`,
    majorLeadsTo: (major: string) => `A degree in ${major} leads to careers like:`,
    majorsGeneral:
      "There are 116 majors in the catalog. Tell me a career or a subject and I will name the "
      + "ones that lead to it \u2014 for example \u201cwhat majors lead to data science?\u201d "
      + "\u2014 or take the assessment and I will rank them against your own profile.",

    uniAbout: (name: string) => `${name}:`,
    uniFacts: (type: string, emirate: string, established: number) =>
      `\u2022 ${type} in ${emirate}, established ${established}.`,
    uniTuition: (band: string) => `\u2022 Tuition: ${band}.`,
    uniMajors: (count: number) => `\u2022 Offers ${count} majors in this catalog.`,
    uniSite: (url: string) => `\u2022 ${url}`,
    uniInEmirate: (emirate: string) => `Institutions in ${emirate}:`,
    uniCheapest: "The least expensive routes in the catalog:",
    uniForMajor: (major: string) => `Institutions teaching ${major}:`,
    uniGeneral:
      "There are 50 institutions in the catalog. Name one and I will describe it, name an "
      + "emirate and I will list what is there, or name a subject and I will say who teaches "
      + "it. There is no \u201cbest\u201d \u2014 the right one depends on your subject, your "
      + "grades, what you can pay and how far you can travel.",

    sectorIntroList: (sector: string) => `Careers in ${sector}:`,
    sectorLine: (career: string, demand: string) =>
      `\u2022 ${career} \u2014 demand ${demand}`,
    sectorGeneral: (sectors: string) =>
      `Name a sector and I will list its careers. The catalog covers: ${sectors}.`,

    matchesNoProfile:
      "I cannot answer that one from the catalog \u2014 it depends on you. Take the "
      + "assessment (about fifteen minutes: your grades, your interests and your personality) "
      + "and I will rank all 184 careers against your own profile and explain every match.",
    matchesIntro: "Your strongest matches, from the assessment you completed:",
    matchesLine: (career: string, match: number) => `\u2022 ${career} \u2014 ${match}% match`,
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
    closestMatch: (career: string) => `أقرب تطابق هو ${career}.`,
    otherMatches: "طابقت أدوار أخرى ما سألت عنه أيضًا، وهي مرتبطة أدناه.",
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

    greeting:
      "أهلًا. اسألني عن مهنة أو تخصص أو جامعة، أو عن الأجور، أو كيف تموّل دراستك، أو عمّا "
      + "يفعله الذكاء الاصطناعي بمهنة ما — بالعربية أو الإنجليزية.",
    salaryFor: (career: string) => `الأجر الإرشادي لمهنة ${career}:`,
    salaryTier: (entry: number, mid: number, senior: number) =>
      `• البداية ${entry.toLocaleString("en-US")} درهم • المتوسط ${mid.toLocaleString("en-US")} درهم `
      + `• مع الخبرة ${senior.toLocaleString("en-US")} درهم، شهريًا.`,
    salaryTopIntro: "أعلى المهن أجرًا في الكتالوج، حسب أجر مرحلة الخبرة:",
    salaryInSector: (sector: string) => `أعلى المهن أجرًا في قطاع ${sector}:`,
    salaryLine: (career: string, entry: number, senior: number) =>
      `• ${career} — من ${entry.toLocaleString("en-US")} إلى ${senior.toLocaleString("en-US")} درهم`,
    salaryCaveat:
      "نطاقات شهرية إرشادية للسوق الإماراتي، محفوظة في هذا الكتالوج. وتختلف العروض الفعلية "
      + "باختلاف جهة العمل والإمارة وما تقدّمه أنت. والأجر أسوأ سبب منفرد لاختيار مهنة: هذه "
      + "نفسها المهن التي ستقضي فيها أربعين عامًا.",

    majorsFor: (career: string) => `التخصصات المؤدية إلى مهنة ${career}:`,
    majorsTaught: (count: number) => `تُدرَّس في ${count} مؤسسة في هذا الكتالوج.`,
    majorLeadsTo: (major: string) => `تؤدي درجة في ${major} إلى مهن مثل:`,
    majorsGeneral:
      "يضم الكتالوج 116 تخصصًا. اذكر مهنة أو مادة وسأسمّي التخصصات المؤدية إليها — مثلًا: «ما "
      + "التخصصات المؤدية إلى علم البيانات؟» — أو أكمل التقييم لأرتّبها وفق ملفك الشخصي.",

    uniAbout: (name: string) => `${name}:`,
    uniFacts: (type: string, emirate: string, established: number) =>
      `• ${type} في ${emirate}، تأسست عام ${established}.`,
    uniTuition: (band: string) => `• الرسوم: ${band}.`,
    uniMajors: (count: number) => `• تقدّم ${count} تخصصًا في هذا الكتالوج.`,
    uniSite: (url: string) => `• ${url}`,
    uniInEmirate: (emirate: string) => `المؤسسات في ${emirate}:`,
    uniCheapest: "أقل المسارات كلفةً في الكتالوج:",
    uniForMajor: (major: string) => `المؤسسات التي تُدرّس ${major}:`,
    uniGeneral:
      "يضم الكتالوج 50 مؤسسة. اذكر واحدة لأصفها، أو اذكر إمارة لأسرد ما فيها، أو اذكر مادة "
      + "لأقول من يدرّسها. ولا توجد «الأفضل» — فالأنسب يعتمد على تخصصك ودرجاتك وما تستطيع "
      + "دفعه وكم تستطيع أن تسافر.",

    sectorIntroList: (sector: string) => `المهن في قطاع ${sector}:`,
    sectorLine: (career: string, demand: string) =>
      `• ${career} — الطلب ${demand}`,
    sectorGeneral: (sectors: string) =>
      `اذكر قطاعًا وسأسرد مهنه. يغطي الكتالوج: ${sectors}.`,

    matchesNoProfile:
      "لا أستطيع الإجابة عن هذا من الكتالوج — فهو يعتمد عليك أنت. أكمل التقييم (نحو خمس عشرة "
      + "دقيقة: درجاتك واهتماماتك وشخصيتك) وسأرتّب المهن الـ184 جميعها وفق ملفك وأشرح كل مطابقة.",
    matchesIntro: "أقوى مطابقاتك، من التقييم الذي أكملته:",
    matchesLine: (career: string, match: number) => `• ${career} — مطابقة ${match}%`,
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

const EMIRATE_LABEL: Record<Lang, Record<string, string>> = {
  en: {
    abu_dhabi: "Abu Dhabi", dubai: "Dubai", sharjah: "Sharjah", ajman: "Ajman",
    umm_al_quwain: "Umm Al Quwain", ras_al_khaimah: "Ras Al Khaimah",
    fujairah: "Fujairah",
  },
  ar: {
    abu_dhabi: "أبوظبي", dubai: "دبي", sharjah: "الشارقة", ajman: "عجمان",
    umm_al_quwain: "أم القيوين", ras_al_khaimah: "رأس الخيمة", fujairah: "الفجيرة",
  },
};

const INSTITUTION_LABEL: Record<Lang, Record<string, string>> = {
  en: {
    federal_public: "Federal public university",
    local_public: "Emirate public university",
    private: "Private university",
    international_branch: "International branch campus",
    technical: "Technical or specialist academy",
  },
  ar: {
    federal_public: "جامعة اتحادية حكومية",
    local_public: "جامعة حكومية محلية",
    private: "جامعة خاصة",
    international_branch: "فرع جامعي دولي",
    technical: "أكاديمية تقنية أو متخصصة",
  },
};

const TUITION_LABEL: Record<Lang, Record<string, string>> = {
  en: {
    free_for_nationals: "free for UAE nationals",
    public_subsidised: "subsidised public rates",
    mid: "mid-range",
    premium: "premium",
  },
  ar: {
    free_for_nationals: "مجانية لمواطني الدولة",
    public_subsidised: "رسوم حكومية مدعومة",
    mid: "متوسطة",
    premium: "مرتفعة",
  },
};

/** Cheapest first, for "which university can I actually afford". */
const TUITION_ORDER = ["free_for_nationals", "public_subsidised", "mid", "premium"];

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
  extraMajors: string[] = [],
): Scholarship[] {
  const wanted = new Set([...(career?.educationPath.relatedMajors ?? []), ...extraMajors]);
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
  let intent = detectIntent(question);

  const [
    careerIndex, careersFull, universities, skills, courses, majors, scholarships,
  ] = await Promise.all([
    loadCareerIndex(), loadCareers(), loadUniversities(), loadSkills(), loadCourses(),
    loadMajors(), loadScholarships(),
  ]);
  const sectors = await loadSectors();

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
  /*
   * Answer, then offer the alternatives. Never interrogate.
   *
   * This used to promote a near miss only when there was exactly one, and ask
   * "which one did you mean?" otherwise. Asked about "graphic designer" it
   * replied with a question; told "no, just answer me yourself" it replied
   * with its own capability list. That is a chatbot arguing with someone who
   * came for help.
   *
   * rankMentions already sorts by how well each row matched, so the top one is
   * the best answer available. It is used, and the runners-up are attached as
   * citations -- which the UI renders as links, so the student who meant the
   * other one is a single click away rather than a turn of conversation away.
   */
  /*
   * Whether a career was named outright, as opposed to reached through a loose
   * word. It matters downstream: questions phrased in *subjects* ("where can I
   * study medicine?", "scholarships for nursing?") should be answered through
   * the major, and a weak career partial must not outrank that.
   */
  const namedInFull = ranked.named.length > 0;
  const mentioned = ranked.named.length > 0
    ? ranked.named
    : ranked.partial.length > 0 && !ranked.partialIsGeneric
      ? ranked.partial
      : [];
  const partial = mentioned.length > 0 ? [] : ranked.partial;
  /* Sectors and majors are named in questions as often as careers are. */
  const sectorNames: Named[] = sectors.map((sector) => ({
    id: sector.id, en: sector.name_en, ar: sector.name_ar,
  }));
  const namedSector = rankMentions(question, sectorNames, 1).named[0]
    // Sector names are phrases ("Artificial Intelligence & Data"); a student
    // types one word of one. A bare token hit is enough here because the
    // eighteen sector names do not collide with each other.
    ?? sectorNames.find((row) => {
      const tokens = normalise(row.en).split(" ").filter((t) => t.length > 4);
      return tokens.some((token) => new RegExp(`\\b${token}`).test(haystack));
    })
    ?? null;

  const majorNames: Named[] = majors.map((major) => ({
    id: major.id, en: major.name.en, ar: major.name.ar,
  }));
  const rankedMajors = rankMentions(question, majorNames, 1);
  /*
   * Same rule careers get: one near miss is an answer, several are a question.
   * The case that forces it is "where can I study medicine?" -- the catalog
   * calls the major "Medicine and Surgery", so the full name is never present,
   * but nothing else in 116 majors claims the word.
   */
  const namedMajor = rankedMajors.named[0] ?? rankedMajors.partialStrong[0] ?? null;
  /*
   * "Medicine" is a word two majors legitimately share (Medicine and Surgery,
   * Veterinary Medicine), so rather than pick one and hope, the institution
   * answers list who teaches either and name both -- the student can see what
   * was assumed instead of having to guess at it.
   */
  const majorCandidates = rankedMajors.named.length > 0
    ? rankedMajors.named
    : rankedMajors.partialStrong.slice(0, 2);

  const namedEmirate = Object.keys(EMIRATE_LABEL.en).find((id) => {
    const english = EMIRATE_LABEL.en[id].toLowerCase();
    return haystack.includes(english) || question.includes(EMIRATE_LABEL.ar[id]);
  }) ?? null;

  const careersById = indexBy(careersFull);
  const skillsById = indexBy(skills);
  const majorsById = indexBy(majors);

  const skillName = (id: string) => {
    const skill = skillsById.get(id);
    return skill ? (locale === "ar" ? skill.name_ar : skill.name_en) : id;
  };

  /*
   * Naming an institution is itself the signal. "Is AUS good for engineering?"
   * contains no word the universities pattern looks for, so it fell through to
   * the ambiguity reply -- while sitting one lookup away from the answer.
   */
  if (intent === "unknown" && namedUniversity) intent = "universities";

  const sectorName = (id: string) => {
    const sector = sectors.find((row) => row.id === id);
    return sector ? (locale === "ar" ? sector.name_ar : sector.name_en) : id;
  };

  // --- greeting and capabilities -----------------------------------------
  if (intent === "greeting") {
    return { intent, text: copy.greeting, citations: [] };
  }
  if (intent === "capabilities") {
    return { intent, text: copy.help, citations: [] };
  }

  // --- what fits me ------------------------------------------------------
  //
  // The honest answer when there is no profile is not the capability list: it
  // is "this one depends on you, and here is the fifteen minutes that answers
  // it". Anything else pretends the catalog knows something it cannot.
  if (intent === "my_matches") {
    if (!profile || profile.completedSteps < 4) {
      return { intent, text: copy.matchesNoProfile, citations: [] };
    }
    const saved = profile.savedCareers
      .map((id) => careersById.get(id))
      .filter((career): career is NonNullable<typeof career> => career !== undefined)
      .slice(0, 5);
    if (saved.length > 0) {
      return {
        intent,
        text: [
          copy.matchesIntro,
          ...saved.map((career) => `• ${career.title[locale]}`),
        ].join("\n"),
        citations: saved.map((career) => ({
          kind: "career" as const, id: career.id, label: career.title[locale],
        })),
      };
    }
    return { intent, text: copy.matchesNoProfile, citations: [] };
  }

  // --- salary ------------------------------------------------------------
  if (intent === "salary") {
    // A named career answers precisely; anything else answers by comparison,
    // which is what "how much do engineers make" is really asking.
    const career = mentioned.length > 0 ? careersById.get(mentioned[0].id) : null;
    if (career) {
      return {
        intent,
        text: [
          copy.salaryFor(career.title[locale]),
          copy.salaryTier(career.salaryAED.entry, career.salaryAED.mid, career.salaryAED.senior),
          career.salaryAED.note[locale],
          copy.salaryCaveat,
        ].join("\n\n"),
        citations: [{ kind: "career", id: career.id, label: career.title[locale] }],
      };
    }

    /*
     * "What is the salary of a nurse?" half-matches several nursing roles, and
     * "how much do engineers make?" half-matches thirty engineering ones.
     * Neither is a request for the highest-paid careers in the country, so
     * offering the options beats answering a question that was not asked. A
     * superlative ("most", "highest") genuinely is asking for the ranking.
     */
    const wantsRanking = /\b(most|highest|top|best paid|best-paying|highest paying)\b/i
      .test(haystack)
      || /(اعلى|أعلى|اكثر|أكثر|افضل|أفضل)/.test(question);
    if (!wantsRanking && !namedSector && partial.length > 0) {
      const best = careersById.get(partial[0].id);
      if (best) {
        return {
          intent,
          text: [
            copy.closestMatch(best.title[locale]),
            copy.salaryTier(
              best.salaryAED.entry, best.salaryAED.mid, best.salaryAED.senior,
            ),
            partial.length > 1 ? copy.otherMatches : "",
            copy.salaryCaveat,
          ].filter(Boolean).join("\n\n"),
          citations: partial.map((row) => ({
            kind: "career" as const,
            id: row.id,
            label: locale === "ar" ? row.ar : row.en,
          })),
        };
      }
    }

    const pool = namedSector
      ? careersFull.filter((row) => row.sector === namedSector.id)
      : careersFull;
    const top = [...pool]
      .sort((a, b) => b.salaryAED.senior - a.salaryAED.senior)
      .slice(0, 6);
    return {
      intent,
      text: [
        namedSector ? copy.salaryInSector(sectorName(namedSector.id)) : copy.salaryTopIntro,
        top.map((row) =>
          copy.salaryLine(row.title[locale], row.salaryAED.entry, row.salaryAED.senior)).join("\n"),
        copy.salaryCaveat,
      ].join("\n\n"),
      citations: top.slice(0, 4).map((row) => ({
        kind: "career" as const, id: row.id, label: row.title[locale],
      })),
    };
  }

  // --- majors ------------------------------------------------------------
  if (intent === "list_majors") {
    /*
     * A named major is checked first, and that ordering matters. "Is computer
     * science a good major?" names the major exactly, but it also brushes the
     * word "computer" against Computer Vision Engineer -- and answering with
     * the career is answering a question nobody asked.
     */
    if (namedMajor) {
      const leadsTo = careersFull
        .filter((row) => row.educationPath.relatedMajors.includes(namedMajor.id))
        .slice(0, 6);
      if (leadsTo.length > 0) {
        return {
          intent,
          text: [
            copy.majorLeadsTo(locale === "ar" ? namedMajor.ar : namedMajor.en),
            leadsTo.map((row) =>
              copy.sectorLine(
                row.title[locale],
                DEMAND_LABEL[locale][row.demand] ?? row.demand,
              )).join("\n"),
          ].join("\n\n"),
          citations: leadsTo.slice(0, 4).map((row) => ({
            kind: "career" as const, id: row.id, label: row.title[locale],
          })),
        };
      }
    }

    const career = mentioned.length > 0 ? careersById.get(mentioned[0].id) : null;
    if (career) {
      const rows = career.educationPath.relatedMajors
        .map((id) => majorsById.get(id))
        .filter((major): major is NonNullable<typeof major> => major !== undefined);
      const lines = rows.map((major) => {
        const taught = universities.filter((uni) => uni.majorsOffered.includes(major.id)).length;
        return `• ${major.name[locale]} — ${copy.majorsTaught(taught)}`;
      });
      return {
        intent,
        text: [copy.majorsFor(career.title[locale]), lines.join("\n")].join("\n\n"),
        citations: [{ kind: "career", id: career.id, label: career.title[locale] }],
      };
    }

    if (namedSector) {
      const inSector = careersFull.filter((row) => row.sector === namedSector.id);
      const majorIds = [...new Set(inSector.flatMap((row) => row.educationPath.relatedMajors))];
      const rows = majorIds
        .map((id) => majorsById.get(id))
        .filter((major): major is NonNullable<typeof major> => major !== undefined)
        .slice(0, 8);
      if (rows.length > 0) {
        return {
          intent,
          text: [
            copy.majorsFor(sectorName(namedSector.id)),
            rows.map((major) => `• ${major.name[locale]}`).join("\n"),
          ].join("\n\n"),
          citations: [],
        };
      }
    }

    return { intent, text: copy.majorsGeneral, citations: [] };
  }

  // --- universities ------------------------------------------------------
  if (intent === "universities") {
    // One named institution: describe it.
    if (namedUniversity) {
      const university = universities.find((row) => row.id === namedUniversity.id);
      if (university) {
        return {
          intent,
          text: [
            copy.uniAbout(university.name[locale]),
            [
              copy.uniFacts(
                INSTITUTION_LABEL[locale][university.type] ?? university.type,
                EMIRATE_LABEL[locale][university.emirate] ?? university.emirate,
                university.established,
              ),
              copy.uniTuition(TUITION_LABEL[locale][university.tuitionBand] ?? university.tuitionBand),
              copy.uniMajors(university.majorsOffered.length),
              copy.uniSite(university.website),
            ].join("\n"),
            university.campusLife[locale],
          ].join("\n\n"),
          citations: [
            { kind: "university", id: university.id, label: university.name[locale] },
          ],
        };
      }
    }

    // A subject: who teaches it.
    const careerMajor = mentioned.length > 0
      ? majorsById.get(careersById.get(mentioned[0].id)?.educationPath.relatedMajors[0] ?? "")
      : undefined;
    const targetMajor: { id: string; label: string } | null = namedMajor
      ? { id: namedMajor.id, label: locale === "ar" ? namedMajor.ar : namedMajor.en }
      : careerMajor
        ? { id: careerMajor.id, label: careerMajor.name[locale] }
        : null;
    if (targetMajor) {
      const teaching = universities
        .filter((row) => row.majorsOffered.includes(targetMajor.id))
        .filter((row) => !namedEmirate || row.emirate === namedEmirate)
        .slice(0, 6);
      if (teaching.length > 0) {
        return {
          intent,
          text: [
            copy.uniForMajor(targetMajor.label),
            teaching.map((row) =>
              `• ${row.name[locale]} — ${EMIRATE_LABEL[locale][row.emirate] ?? row.emirate}`)
              .join("\n"),
            copy.admCaveat,
          ].join("\n\n"),
          citations: teaching.slice(0, 4).map((row) => ({
            kind: "university" as const, id: row.id, label: row.name[locale],
          })),
        };
      }
    }

    // Affordability. "Best" has no answer this catalog can defend, but
    // "cheapest" does, and it is usually the question underneath.
    if (/\b(cheap\w*|afford\w*|free|low cost|budget)\b/i.test(haystack)
      || /(ارخص|أرخص|مجاني|مجانا|تكلفه|تكلفة|ميسور)/.test(question)) {
      const ranked = [...universities]
        .filter((row) => !namedEmirate || row.emirate === namedEmirate)
        .sort((a, b) =>
          TUITION_ORDER.indexOf(a.tuitionBand) - TUITION_ORDER.indexOf(b.tuitionBand))
        .slice(0, 6);
      return {
        intent,
        text: [
          copy.uniCheapest,
          ranked.map((row) =>
            `• ${row.name[locale]} — ${TUITION_LABEL[locale][row.tuitionBand] ?? row.tuitionBand}`)
            .join("\n"),
          copy.admCaveat,
        ].join("\n\n"),
        citations: ranked.slice(0, 4).map((row) => ({
          kind: "university" as const, id: row.id, label: row.name[locale],
        })),
      };
    }

    // An emirate: list what is there.
    if (namedEmirate) {
      const here = universities.filter((row) => row.emirate === namedEmirate).slice(0, 8);
      if (here.length > 0) {
        return {
          intent,
          text: [
            copy.uniInEmirate(EMIRATE_LABEL[locale][namedEmirate]),
            here.map((row) =>
              `• ${row.name[locale]} — ${INSTITUTION_LABEL[locale][row.type] ?? row.type}`)
              .join("\n"),
          ].join("\n\n"),
          citations: here.slice(0, 4).map((row) => ({
            kind: "university" as const, id: row.id, label: row.name[locale],
          })),
        };
      }
    }

    return { intent, text: copy.uniGeneral, citations: [] };
  }

  // --- careers in a sector -----------------------------------------------
  if (intent === "list_sector") {
    if (namedSector) {
      const inSector = careersFull
        .filter((row) => row.sector === namedSector.id)
        .sort((a, b) => b.salaryAED.senior - a.salaryAED.senior)
        .slice(0, 8);
      if (inSector.length > 0) {
        return {
          intent,
          text: [
            copy.sectorIntroList(sectorName(namedSector.id)),
            inSector.map((row) =>
              copy.sectorLine(
                row.title[locale],
                DEMAND_LABEL[locale][row.demand] ?? row.demand,
              )).join("\n"),
          ].join("\n\n"),
          citations: inSector.slice(0, 4).map((row) => ({
            kind: "career" as const, id: row.id, label: row.title[locale],
          })),
        };
      }
    }
    return {
      intent,
      text: copy.sectorGeneral(
        sectors.map((row) => (locale === "ar" ? row.name_ar : row.name_en)).join(listSep(locale)),
      ),
      citations: [],
    };
  }

  // --- scholarships ------------------------------------------------------
  if (intent === "scholarships") {
    const career = namedInFull && mentioned.length > 0
      ? careersById.get(mentioned[0].id)
      : null;
    /*
     * A funding question is often phrased in subjects rather than job titles --
     * "are there scholarships for nursing?" -- and "nursing" half-matches
     * several nursing roles without naming one. The major is the better key:
     * scholarships are scoped to fields of study in the first place.
     */
    const subjectMajors = namedInFull ? [] : majorCandidates.map((row) => row.id);
    const picked = rankScholarships(scholarships, career ?? null, profile, 5, subjectMajors);
    const wanted = career ? career.educationPath.relatedMajors : subjectMajors;
    const scoped = wanted.length > 0
      && picked.some((row) => row.fields.some((field) => wanted.includes(field)));
    const subject = career
      ? career.title[locale]
      : majorCandidates.map((row) => (locale === "ar" ? row.ar : row.en)).join(listSep(locale));

    const intro = subject
      ? (scoped ? copy.schoIntro(subject) : copy.schoNone(subject))
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
  //
  // "Where can I study medicine?" names a subject, not a job, and half-matches
  // several medical careers -- so it used to reach the ambiguity reply. The
  // major is the better answer to a question phrased in subjects.
  if (intent === "where_to_study" && !namedInFull && majorCandidates.length > 0) {
    const wanted = new Set(majorCandidates.map((row) => row.id));
    const teaching = universities
      .filter((row) => row.majorsOffered.some((major) => wanted.has(major)))
      .filter((row) => !namedEmirate || row.emirate === namedEmirate)
      .slice(0, 6);
    if (teaching.length > 0) {
      return {
        intent,
        text: [
          copy.uniForMajor(
            majorCandidates.map((row) => (locale === "ar" ? row.ar : row.en))
              .join(listSep(locale)),
          ),
          teaching.map((row) =>
            `• ${row.name[locale]} — ${EMIRATE_LABEL[locale][row.emirate] ?? row.emirate}`)
            .join("\n"),
          copy.admCaveat,
        ].join("\n\n"),
        citations: teaching.slice(0, 4).map((row) => ({
          kind: "university" as const, id: row.id, label: row.name[locale],
        })),
      };
    }
  }

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
  /*
   * A loose match still gets a real answer.
   *
   * Only generic-word hits reach here now ("I want to be a designer"), and the
   * honest response to that is to describe the closest role and show the other
   * candidates as links -- not to bounce the question back.
   */
  if (partial.length > 0) {
    const best = careersById.get(partial[0].id);
    if (best) {
      return {
        intent: "describe_career",
        text: [
          copy.closestMatch(best.title[locale]),
          best.shortDescription[locale],
          best.dayInTheLife[locale],
          copy.route(
            best.educationPath.minimumQualification[locale],
            best.educationPath.typicalYears,
          ),
          copy.salary(best.salaryAED.entry, best.salaryAED.senior),
          partial.length > 1 ? copy.otherMatches : "",
        ].filter(Boolean).join("\n\n"),
        citations: partial.map((row) => ({
          kind: "career" as const,
          id: row.id,
          label: locale === "ar" ? row.ar : row.en,
        })),
      };
    }
  }

  return { intent: "unknown", text: copy.help, citations: [] };
}
