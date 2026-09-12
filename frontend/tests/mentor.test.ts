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
    expect(detectIntent("Is graphic design still a valid career after the AI revolution?"))
      .toBe("career_outlook");
    expect(detectIntent("Will AI replace radiologists?")).toBe("career_outlook");
    expect(detectIntent("what is the job outlook for nurses")).toBe("career_outlook");
    expect(detectIntent("هل ما زال التصميم الجرافيكي مهنة لها مستقبل؟")).toBe("career_outlook");
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

    expect(result.intent).toBe("career_outlook");
    expect(result.citations.map((c) => c.id)).toContain("graphic_designer");
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

  it("offers the capability list instead of a dead end when nothing matches", async () => {
    const result = await ask("what is the weather in dubai");
    expect(result.text).toContain("I answer from the catalogs");
  });
});
