import { readFile } from "node:fs/promises";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import MiniDemo from "@/components/MiniDemo";
import { getDictionary } from "@/lib/i18n";
import { LocaleProvider } from "@/lib/locale-context";
import {
  applyAnswer, DEEP_LENGTH, drawSurvey, emptyScores, NEUTRAL_RIASEC,
  QUICK_LENGTH, SURVEY_POOL, toStudentProfile,
} from "@/lib/survey";

/**
 * The landing-page surveys.
 *
 * Run against the real catalogs and the real model bundle, not fixtures. The
 * whole claim the page makes — "both surveys run the real model, the same one
 * behind the full assessment" — is only true if this path works end to end, so
 * the test exercises it end to end.
 */

const PUBLIC = `${process.cwd()}/public`;

beforeAll(() => {
  vi.stubGlobal("fetch", async (url: string) => ({
    ok: true,
    status: 200,
    json: async () => JSON.parse(await readFile(PUBLIC + url, "utf8")),
  }));
});

vi.mock("next/navigation", () => ({
  usePathname: () => "/en",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const dictionary = getDictionary("en");

const renderSurvey = (locale: "en" | "ar" = "en") =>
  render(
    <LocaleProvider locale={locale} dictionary={getDictionary(locale)}>
      <MiniDemo />
    </LocaleProvider>,
  );

/** Answers "That's me" to every question until the result appears. */
async function answerAll(user: ReturnType<typeof userEvent.setup>, count: number) {
  for (let index = 0; index < count; index += 1) {
    const button = await screen.findByRole("button", { name: dictionary.landing.demoYes });
    await user.click(button);
  }
}

/** The question text currently on screen. */
const visibleQuestion = () => {
  const texts = Object.values(dictionary.survey.pool);
  return texts.find((text) => screen.queryByText(text)) ?? null;
};

describe("the survey pool", () => {
  it("holds each dimension pair exactly once", () => {
    /*
     * The invariant that makes a random draw safe. Two questions on the same
     * pair would ask a student to agree with a statement and its mirror, and
     * whichever they answered second would read as a contradiction.
     */
    // Keyed by axis as well as letters: RIASEC A/C is Artistic vs Conventional
    // and Big Five A/C is Agreeableness vs Conscientiousness. Same letters,
    // different vectors, no conflict.
    const pairs = SURVEY_POOL.map((q) => `${q.axis}:${[q.up, q.down].sort().join("-")}`);
    expect(new Set(pairs).size).toBe(SURVEY_POOL.length);
  });

  it("has text for every question in both languages", () => {
    const arabic = getDictionary("ar");
    for (const question of SURVEY_POOL) {
      const en = dictionary.survey.pool[question.id as keyof typeof dictionary.survey.pool];
      const ar = arabic.survey.pool[question.id as keyof typeof arabic.survey.pool];
      expect(en, question.id).toBeTruthy();
      expect(ar, question.id).toBeTruthy();
      expect(ar, question.id).toMatch(/[؀-ۿ]/);
    }
  });

  it("is large enough that a ten-question draw is not most of it", () => {
    expect(SURVEY_POOL.length).toBeGreaterThanOrEqual(DEEP_LENGTH * 2);
  });
});

describe("drawing a survey", () => {
  it("draws the right length with no repeats", () => {
    for (const length of [QUICK_LENGTH, DEEP_LENGTH]) {
      const drawn = drawSurvey(length);
      expect(drawn).toHaveLength(length);
      expect(new Set(drawn.map((q) => q.id)).size).toBe(length);
    }
  });

  it("always includes some personality questions and mostly interest ones", () => {
    // A purely random five could come out all Big Five, leaving every RIASEC
    // letter neutral -- and the recommender would then be ranking 184 careers
    // on a profile that says nothing about interests at all.
    for (let run = 0; run < 20; run += 1) {
      const quick = drawSurvey(QUICK_LENGTH);
      expect(quick.filter((q) => q.axis === "bigfive")).toHaveLength(1);
      expect(quick.filter((q) => q.axis === "riasec")).toHaveLength(4);

      const deep = drawSurvey(DEEP_LENGTH);
      expect(deep.filter((q) => q.axis === "bigfive")).toHaveLength(3);
    }
  });

  it("spreads across the letters instead of asking about one four times", () => {
    for (let run = 0; run < 20; run += 1) {
      const riasec = drawSurvey(QUICK_LENGTH).filter((q) => q.axis === "riasec");
      const letters = riasec.flatMap((q) => [q.up, q.down]);
      const counts = new Map<string, number>();
      for (const letter of letters) counts.set(letter, (counts.get(letter) ?? 0) + 1);
      // Eight letter-slots over six letters cannot use one more than twice
      // without starving another, which is exactly what the greedy pick stops.
      expect(Math.max(...counts.values())).toBeLessThanOrEqual(2);
    }
  });

  it("gives a different set almost every time", () => {
    const draws = new Set<string>();
    for (let run = 0; run < 30; run += 1) {
      draws.add(drawSurvey(QUICK_LENGTH).map((q) => q.id).sort().join(","));
    }
    // The reported complaint: the questions never changed. Thirty draws from a
    // pool of 22 collapsing to one or two sets would mean it is still fixed.
    expect(draws.size).toBeGreaterThan(5);
  });

  it("does not make the deep dive the quick check plus five", () => {
    // The old behaviour literally was DEEP = [...QUICK, ...five more], so the
    // first five questions were identical in both.
    let identicalPrefixes = 0;
    for (let run = 0; run < 20; run += 1) {
      const quick = drawSurvey(QUICK_LENGTH).map((q) => q.id);
      const deep = drawSurvey(DEEP_LENGTH).map((q) => q.id);
      if (quick.join(",") === deep.slice(0, QUICK_LENGTH).join(",")) identicalPrefixes += 1;
    }
    expect(identicalPrefixes).toBe(0);
  });

  it("is reproducible when the randomness is", () => {
    const fixed = () => 0.42;
    expect(drawSurvey(DEEP_LENGTH, fixed).map((q) => q.id))
      .toEqual(drawSurvey(DEEP_LENGTH, fixed).map((q) => q.id));
  });
});

describe("scoring", () => {
  /*
   * The pool guarantees no draw repeats a pair, but a letter still appears in
   * several pairs -- RI and RS both move R. Overwriting instead of averaging
   * would mean the later question silently cancelled the earlier one, so a
   * ten-question run would end up with the profile of a much shorter one.
   */
  it("averages a repeated dimension instead of letting the last answer win", () => {
    const first = applyAnswer(emptyScores(), { id: "a", up: "I", down: "S", axis: "riasec" }, true);
    expect(first.riasec).toEqual({ I: 85, S: 40 });

    const second = applyAnswer(first, { id: "b", up: "S", down: "I", axis: "riasec" }, true);
    expect(second.riasec.S).toBe(63);
    expect(second.riasec.I).toBe(63);
    expect(second.riasec.I).not.toBe(40);
  });

  it("keeps the two vectors apart and fills the gaps with neutral", () => {
    const scores = applyAnswer(
      emptyScores(), { id: "a", up: "O", down: "C", axis: "bigfive" }, true,
    );
    expect(scores.riasec).toEqual({});
    expect(scores.bigfive).toEqual({ O: 85, C: 40 });

    // Unanswered dimensions must fall back to neutral rather than to zero,
    // which would read to the model as a student with no interests at all.
    const profile = toStudentProfile(scores);
    expect(profile.riasec).toEqual(NEUTRAL_RIASEC);
    expect(profile.bigfive.O).toBe(85);
    expect(profile.bigfive.N).toBe(45);
  });
});

describe("landing surveys", () => {
  it("offers both lengths before asking anything", () => {
    renderSurvey();
    expect(screen.getByText(dictionary.landing.demoQuick)).toBeInTheDocument();
    expect(screen.getByText(dictionary.landing.demoDeep)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: dictionary.landing.demoYes }),
    ).not.toBeInTheDocument();
  });

  it("asks five questions in the quick check and then produces one match", async () => {
    const user = userEvent.setup();
    renderSurvey();

    await user.click(screen.getByText(dictionary.landing.demoQuick));
    expect(visibleQuestion()).toBeTruthy();

    await answerAll(user, QUICK_LENGTH);

    await waitFor(
      () => expect(screen.getByText(dictionary.landing.demoResult)).toBeInTheDocument(),
      { timeout: 15000 },
    );
    const career = screen
      .getAllByRole("link")
      .find((link) => link.getAttribute("href")?.includes("/careers/"));
    expect(career).toBeDefined();
    expect(career?.textContent?.trim()).not.toBe("");
  }, 30000);

  it("asks ten in the deep dive and shows three matches with their majors", async () => {
    const user = userEvent.setup();
    renderSurvey();

    await user.click(screen.getByText(dictionary.landing.demoDeep));
    await answerAll(user, DEEP_LENGTH);

    await waitFor(
      () => expect(screen.getByText(dictionary.landing.demoResultDeep)).toBeInTheDocument(),
      { timeout: 15000 },
    );
    const careerLinks = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href")?.includes("/careers/"));
    expect(careerLinks).toHaveLength(3);
    expect(screen.getAllByText(new RegExp(dictionary.landing.demoMajors)).length)
      .toBeGreaterThan(0);
  }, 30000);

  it("asks a different first question on a second run", async () => {
    // Twelve runs against a 15-question interest pool: seeing the same opener
    // every single time would mean the draw is not reaching the component.
    const seen = new Set<string>();
    for (let run = 0; run < 12; run += 1) {
      const user = userEvent.setup();
      const { unmount } = renderSurvey();
      await user.click(screen.getByText(dictionary.landing.demoQuick));
      const question = visibleQuestion();
      if (question) seen.add(question);
      unmount();
    }
    expect(seen.size).toBeGreaterThan(1);
  }, 30000);

  it("separates a yes-to-everything student from a no-to-everything one", async () => {
    const user = userEvent.setup();
    const { unmount } = renderSurvey();

    await user.click(screen.getByText(dictionary.landing.demoDeep));
    await answerAll(user, DEEP_LENGTH);
    await waitFor(
      () => expect(screen.getByText(dictionary.landing.demoResultDeep)).toBeInTheDocument(),
      { timeout: 15000 },
    );
    const agreed = screen
      .getAllByRole("link")
      .find((link) => link.getAttribute("href")?.includes("/careers/"))
      ?.getAttribute("href");
    unmount();

    renderSurvey();
    await user.click(screen.getByText(dictionary.landing.demoDeep));
    for (let index = 0; index < DEEP_LENGTH; index += 1) {
      await user.click(
        await screen.findByRole("button", { name: dictionary.landing.demoNo }),
      );
    }
    await waitFor(
      () => expect(screen.getByText(dictionary.landing.demoResultDeep)).toBeInTheDocument(),
      { timeout: 15000 },
    );
    const disagreed = screen
      .getAllByRole("link")
      .find((link) => link.getAttribute("href")?.includes("/careers/"))
      ?.getAttribute("href");

    expect(agreed).toBeTruthy();
    expect(disagreed).toBeTruthy();
    expect(agreed).not.toBe(disagreed);
  }, 45000);
});
