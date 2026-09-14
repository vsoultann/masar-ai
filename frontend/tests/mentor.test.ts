import { readFile } from "node:fs/promises";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { answer, detectIntent, findMentions, rankMentions } from "@/lib/mentor/engine";

/**
 * The mentor, tested against the real catalogs rather than a fixture.
 *
 * The bug this file exists for: "Is graphic design still a valid career after
 * the AI revolution?" named a career the catalog holds, and the mentor replied
 * "Name a career and I will describe it". Two separate failures — the matcher
 * would not fold "design" into "Designer", and no intent covered a question
 * about a job's future — so both are pinned here.
 */

// vitest runs from frontend/, and under jsdom import.meta.url is not a file URL.
const PUBLIC = `${process.cwd()}/public`;

beforeAll(() => {
  // The engine fetches static JSON; in node that is just a file read. The URL
  // it asks for is already the public-relative path, so PUBLIC + url is the
  // file on disk.
  vi.stubGlobal("fetch", async (url: string) => ({
    ok: true,
    status: 200,
    json: async () => JSON.parse(await readFile(PUBLIC + url, "utf8")),
  }));
});

const ask = (question: string, locale: "en" | "ar" = "en") =>
  answer(question, locale, null, null);

describe("intent detection", () => {
  it("reads a question about a career's future as an outlook question", () => {
    expect(detectIntent("what is the job outlook for nurses")).toBe("career_outlook");
    expect(detectIntent("is nursing still in demand")).toBe("career_outlook");
    expect(detectIntent("هل ما زال التصميم الجرافيكي مهنة لها مستقبل؟")).toBe("career_outlook");
  });

  /*
   * The AI form of the question is a different intent from the demand form,
   * and gets a different answer: the exposure breakdown rather than the demand
   * rating. Both used to land on career_outlook, which meant "will AI replace
   * radiologists?" was answered with a demand rating and a paragraph declining
   * to speculate -- technically honest, and not what was asked.
   */
  it("separates a question about AI from a question about demand", () => {
    expect(detectIntent("Will AI replace radiologists?")).toBe("ai_impact");
    expect(detectIntent("Is graphic design still a valid career after the AI revolution?"))
      .toBe("ai_impact");
    expect(detectIntent("is accounting safe from automation")).toBe("ai_impact");
    expect(detectIntent("هل سيحل الذكاء الاصطناعي محل المحاسبين؟")).toBe("ai_impact");
  });

  it("reads funding questions as funding questions, not as where-to-study", () => {
    // "scholarship ... to study X" contains "study", which where_to_study owns.
    expect(detectIntent("what scholarships are there to study medicine?")).toBe("scholarships");
    expect(detectIntent("how can I afford university")).toBe("scholarships");
    expect(detectIntent("is there funding for engineering")).toBe("scholarships");
    expect(detectIntent("ما هي المنح المتاحة للطب؟")).toBe("scholarships");
  });

  it("reads threshold questions as admission questions", () => {
    expect(detectIntent("what are the admission requirements for Khalifa University?"))
      .toBe("admission_requirements");
    expect(detectIntent("what do i need to get into medicine")).toBe("admission_requirements");
    expect(detectIntent("ما شروط القبول في جامعة الإمارات؟")).toBe("admission_requirements");
  });

  it("does not steal questions that merely name an AI career", () => {
    expect(detectIntent("What does an AI research scientist do?")).toBe("describe_career");
    expect(detectIntent("Where can I study medicine?")).toBe("where_to_study");
    expect(detectIntent("Compare software engineer and data scientist")).toBe("compare_careers");
  });
});

describe("name matching", () => {
  const rows = [
    { id: "graphic_designer", en: "Graphic Designer", ar: "المصمّم الجرافيكي" },
    { id: "registered_nurse", en: "Registered Nurse", ar: "ممرض مسجل" },
    { id: "ai_research_scientist", en: "AI Research Scientist", ar: "عالم أبحاث الذكاء الاصطناعي" },
  ];

  it("folds the inflection between how a student writes a job and how the catalog spells it", () => {
    expect(findMentions("is graphic design still worth it", rows).map((r) => r.id))
      .toEqual(["graphic_designer"]);
    // "nursing" reaches "Nurse"; "registered" is absent, so it is a half match
    // rather than a named one -- but still a lead, not a miss.
    expect(rankMentions("what is nursing like", rows).partial.map((r) => r.id))
      .toEqual(["registered_nurse"]);
  });

  it("refuses a prefix that is a different word", () => {
    // "art" must not reach "artificial", "data" must not reach "database".
    expect(findMentions("i like art", rows)).toEqual([]);
  });

  it("reports a half match as a suggestion rather than picking one", () => {
    const ranked = rankMentions("i want to be a designer", rows);
    expect(ranked.named).toEqual([]);
    expect(ranked.partial.map((r) => r.id)).toContain("graphic_designer");
  });
});

describe("answers", () => {
  it("answers the reported question with what the catalog actually holds", async () => {
    const result = await ask("Is graphic design still a valid career after the AI revolution?");

    expect(result.intent).toBe("ai_impact");
    expect(result.citations.map((c) => c.id)).toContain("graphic_designer");
    // The demand rating is still in the answer: a student asking about AI is
    // asking about the future of the job, and the rating is half of that.
    expect(result.text).toContain("Demand rating");
    // The exact reply the feedback screenshot captured, which must not return.
    expect(result.text).not.toContain("Name a career and I will describe it");
    // It must not pretend to forecast.
    expect(result.text).toMatch(/not a forecaster/i);
  });

  it("answers it in Arabic too", async () => {
    const result = await ask("هل ما زال التصميم الجرافيكي مهنة لها مستقبل؟", "ar");
    expect(result.intent).toBe("career_outlook");
    expect(result.citations.map((c) => c.id)).toContain("graphic_designer");
  });

  it("answers an AI question with the exposure breakdown, both sides of it", async () => {
    const result = await ask("Will AI replace radiologists?");

    expect(result.intent).toBe("ai_impact");
    expect(result.citations.map((c) => c.id)).toContain("radiologist");
    expect(result.text).toMatch(/AI resistance for .*: \d+\/100/);
    // Both halves, always. An answer that lists only what AI can do is a
    // scare, and one that lists only what it cannot is a reassurance; the
    // point of the index is that every career has some of each.
    expect(result.text).toContain("What AI already does in this role:");
    expect(result.text).toContain("What it does not:");
    expect(result.text).toMatch(/not a forecaster/i);
  });

  it("names funding routes, and says which ones carry a commitment", async () => {
    const result = await ask("what scholarships could pay for medicine?");

    expect(result.intent).toBe("scholarships");
    expect(result.citations.length).toBeGreaterThan(0);
    expect(result.citations.every((c) => c.kind === "scholarship")).toBe(true);
    // The one thing this answer must never hide.
    expect(result.text).toMatch(/indicative/i);
  });

  it("gives a named institution's indicative admission requirements", async () => {
    const result = await ask("what are the admission requirements for Khalifa University?");

    expect(result.intent).toBe("admission_requirements");
    expect(result.citations.map((c) => c.id)).toContain("ku");
    expect(result.text).toContain("Minimum high-school average");
    expect(result.text).toMatch(/indicative/i);
  });

  it("falls back to the institutions that teach a career when none is named", async () => {
    const result = await ask("what do I need to get into dentistry?");

    expect(result.intent).toBe("admission_requirements");
    expect(result.citations.every((c) => c.kind === "university")).toBe(true);
    expect(result.citations.length).toBeGreaterThan(0);
  });

  it("offers the options rather than a dead end when a subject is ambiguous", async () => {
    // "nursing" half-matches several nursing roles, so no single career is
    // named in full. Telling the student to name a career would be pedantry:
    // they named a subject.
    const result = await ask("what do I need to get into nursing?");
    expect(result.citations.length).toBeGreaterThan(0);
    expect(result.text).not.toContain("Name a university");
  });

  it("still describes a career when asked plainly", async () => {
    const result = await ask("what does a radiologist do?");
    expect(result.intent).toBe("describe_career");
    expect(result.citations.map((c) => c.id)).toContain("radiologist");
  });

  it("still answers where to study", async () => {
    const result = await ask("Where can I study software engineering?");
    expect(result.intent).toBe("where_to_study");
    expect(result.citations.every((c) => c.kind === "university")).toBe(true);
  });

  /*
   * The reported failure: asking about majors, careers, salaries, universities
   * or scholarships "most of the time doesn't answer". It was worse than that
   * -- it answered confidently, about something else. Two matcher faults, each
   * pinned below:
   *
   *  1. A name filtered down to words longer than three characters made "NLP
   *     Engineer" match in full on the bare word "engineers".
   *  2. A unique partial hit was promoted to a match, so the single career in
   *     184 with "University" in its title answered every question about
   *     universities.
   */
  it("does not answer a question about universities with a job called Lecturer", async () => {
    const result = await ask("what is the best university in the UAE?");
    expect(result.intent).toBe("universities");
    expect(result.citations.map((c) => c.id)).not.toContain("university_lecturer");
    // There is no defensible "best" in this catalog, and it says so rather
    // than inventing a ranking.
    expect(result.text).toMatch(/depends on your subject/i);
  });

  it("does not answer a question about pay with one arbitrary engineering role", async () => {
    const result = await ask("how much do engineers make?");
    expect(result.intent).toBe("salary");
    // "Engineer" is thirty roles. Offering them beats picking one -- so NLP
    // Engineer may well appear here, as one option among several. What must
    // not happen is the old behaviour: it presented as the answer, and the
    // reply was a paragraph about natural-language processing.
    expect(result.text).toContain("Which one did you mean?");
    expect(result.citations.length).toBeGreaterThan(1);
    expect(result.text).not.toMatch(/natural language|morphology/i);
  });

  it("answers a salary question about a named career with its actual range", async () => {
    const result = await ask("how much does a radiologist earn?");
    expect(result.intent).toBe("salary");
    expect(result.citations.map((c) => c.id)).toContain("radiologist");
    expect(result.text).toMatch(/Entry AED [\d,]+/);
    expect(result.text).toMatch(/Senior AED [\d,]+/);
  });

  it("ranks by pay only when the question actually asks for a ranking", async () => {
    const result = await ask("which careers pay the most?");
    expect(result.intent).toBe("salary");
    expect(result.text).toContain("highest-paying");
    expect(result.citations.length).toBeGreaterThan(0);
  });

  it("answers a question phrased in majors", async () => {
    const result = await ask("is computer science a good major?");
    expect(result.intent).toBe("list_majors");
    // The major, not Computer Vision Engineer, which the word "computer"
    // used to drag in.
    expect(result.text).toContain("Computer Science");
    expect(result.citations.length).toBeGreaterThan(0);
  });

  it("lists the careers in a named sector", async () => {
    const result = await ask("what careers are there in finance?");
    expect(result.intent).toBe("list_sector");
    expect(result.citations.length).toBeGreaterThan(0);
    expect(result.citations.every((c) => c.kind === "career")).toBe(true);
  });

  it("describes an institution named only by its abbreviation", async () => {
    // "AUS" is three characters, below the matcher's token floor, so it is
    // matched by containment on the short name instead.
    const result = await ask("is AUS good for engineering?");
    expect(result.intent).toBe("universities");
    expect(result.citations.map((c) => c.id)).toContain("aus");
  });

  it("lists institutions in a named emirate, and the cheapest ones on request", async () => {
    const inDubai = await ask("which universities are in Dubai?");
    expect(inDubai.intent).toBe("universities");
    expect(inDubai.citations.length).toBeGreaterThan(0);

    const cheap = await ask("cheapest university in the uae");
    expect(cheap.intent).toBe("universities");
    expect(cheap.text).toMatch(/least expensive/i);
  });

  it("answers a where-to-study question phrased as a subject", async () => {
    // "Medicine" is not a career name and half-matches several medical roles.
    // The major is the right key, and the answer names which majors it used
    // rather than silently picking one.
    const result = await ask("where can I study medicine?");
    expect(result.intent).toBe("where_to_study");
    expect(result.citations.every((c) => c.kind === "university")).toBe(true);
    expect(result.text).toContain("Medicine and Surgery");
  });

  it("scopes a funding question to the subject it names", async () => {
    const result = await ask("are there scholarships for nursing?");
    expect(result.intent).toBe("scholarships");
    expect(result.text).toContain("Nursing");
    expect(result.citations.every((c) => c.kind === "scholarship")).toBe(true);
  });

  it("greets, and says what it can do", async () => {
    expect((await ask("hi")).intent).toBe("greeting");
    expect((await ask("what can you do?")).text).toContain("I answer from the catalogs");
  });

  it("sends an it-depends-on-you question to the assessment, not the help text", async () => {
    const result = await ask("what careers suit me?");
    expect(result.intent).toBe("my_matches");
    expect(result.text).toMatch(/assessment/i);
    expect(result.text).not.toContain("I answer from the catalogs");
  });

  it("answers the same five subjects in Arabic", async () => {
    const cases: [string, string][] = [
      ["كم راتب المهندس؟", "salary"],
      ["ما الجامعات في دبي؟", "universities"],
      ["ما هي المنح للتمريض؟", "scholarships"],
      ["ما هي التخصصات المؤدية إلى الطب والجراحة؟", "list_majors"],
      ["هل سيحل الذكاء الاصطناعي محل المحاسبين؟", "ai_impact"],
    ];
    for (const [question, intent] of cases) {
      const result = await answer(question, "ar", null, null);
      expect(result.intent, question).toBe(intent);
      // Arabic in, Arabic out — no English leaking through a fallback.
      expect(result.text, question).toMatch(/[\u0600-\u06FF]/);
    }
  });

  it("offers the capability list instead of a dead end when nothing matches", async () => {
    const result = await ask("what is the weather in dubai");
    expect(result.text).toContain("I answer from the catalogs");
  });
});
