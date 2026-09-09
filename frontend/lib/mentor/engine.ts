import {
  indexBy, loadCareerIndex, loadCourses, loadMajors, loadSkills, loadUniversities,
} from "@/lib/data/client";
import { matchUniversities } from "@/lib/matching/universities";
import type { Lang, Profile } from "@/lib/types";
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
  | "where_to_study"
  | "weakest_skills"
  | "compare_careers"
  | "what_to_study_first"
  | "list_sector"
  | "unknown";

export interface Citation {
  kind: "career" | "university" | "course";
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
  return normaliseArabic(input.toLowerCase().trim()).replace(/\s+/g, " ");
}

const INTENT_PATTERNS: { intent: Intent; patterns: RegExp[] }[] = [
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
  for (const { intent, patterns } of INTENT_PATTERNS) {
    if (patterns.some((pattern) => pattern.test(question))) return intent;
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
 * Finds the entries a question names.
 *
 * Scores on token overlap rather than substring containment: "nurse" should
 * match "Registered Nurse" but a bare "engineer" should not silently pick one
 * of thirty engineering roles at random — so a single generic token only counts
 * when nothing more specific matched.
 */
export function findMentions(question: string, rows: Named[], limit = 2): Named[] {
  const haystack = normalise(question);
  const scored: { row: Named; score: number }[] = [];

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
      const hits = tokens.filter((token) => haystack.includes(token)).length;
      if (hits === tokens.length) {
        scored.push({ row, score: 50 + candidate.length });
        break;
      }
    }
  }

  scored.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const picked: Named[] = [];
  for (const { row } of scored) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    picked.push(row);
    if (picked.length === limit) break;
  }
  return picked;
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
  },
  ar: {
    salary: (min: number, max: number) =>
      `يتراوح الأجر الإرشادي من نحو ${min.toLocaleString("en-US")} درهم في بداية المسار إلى ${max.toLocaleString("en-US")} درهم مع الخبرة.`,
    route: (qualification: string, years: number) =>
      `المسار المعتاد هو ${qualification}، ويستغرق نحو ${years} سنوات.`,
    noCareer: "اذكر اسم مهنة وسأصفها لك — مثلًا: «ماذا يعمل أخصائي الأشعة؟»",
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
  },
} as const;

export async function answer(
  question: string,
  locale: Lang,
  profile: Profile | null,
  skillEstimates: Record<string, number> | null,
): Promise<MentorAnswer> {
  const copy = COPY[locale];
  const intent = detectIntent(question);

  const [careerIndex, careersFull, universities, skills, courses, majors] = await Promise.all([
    loadCareerIndex(), loadCareers(), loadUniversities(), loadSkills(), loadCourses(), loadMajors(),
  ]);

  const careerNames: Named[] = careerIndex.map((c) => ({ id: c.id, en: c.title.en, ar: c.title.ar }));
  const mentioned = findMentions(question, careerNames, 2);
  const careersById = indexBy(careersFull);
  const skillsById = indexBy(skills);
  const majorsById = indexBy(majors);

  const skillName = (id: string) => {
    const skill = skillsById.get(id);
    return skill ? (locale === "ar" ? skill.name_ar : skill.name_en) : id;
  };

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
          .join("، ");
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
      if (shared.length > 0) lines.push(copy.compareShared(shared.map(skillName).join("، ")));
      if (onlyFirst.length > 0) {
        lines.push(copy.compareDiffers(first.title[locale], onlyFirst.map(skillName).join("، ")));
      }
      if (onlySecond.length > 0) {
        lines.push(copy.compareDiffers(second.title[locale], onlySecond.map(skillName).join("، ")));
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

  return { intent: "unknown", text: copy.noCareer, citations: [] };
}
