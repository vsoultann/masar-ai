import { readFile } from "node:fs/promises";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import MiniDemo from "@/components/MiniDemo";
import { getDictionary } from "@/lib/i18n";
import { LocaleProvider } from "@/lib/locale-context";
import {
  applyAnswer, DEEP_SURVEY, emptyScores, NEUTRAL_RIASEC, QUICK_SURVEY,
  toStudentProfile,
} from "@/lib/survey";

/**
 * The landing-page surveys.
 *
 * Run against the real catalogs and the real model bundle, not fixtures. The
 * whole claim the page makes about these — "both surveys run the real model,
 * the same one behind the full assessment" — is only true if this path works
 * end to end, so the test exercises it end to end.
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

describe("landing surveys", () => {
  it("offers both lengths before asking anything", () => {
    renderSurvey();
    expect(screen.getByText(dictionary.landing.demoQuick)).toBeInTheDocument();
    expect(screen.getByText(dictionary.landing.demoDeep)).toBeInTheDocument();
    // No question is shown until a length is picked.
    expect(
      screen.queryByRole("button", { name: dictionary.landing.demoYes }),
    ).not.toBeInTheDocument();
  });

  it("asks five questions in the quick check and then produces one match", async () => {
    const user = userEvent.setup();
    renderSurvey();

    await user.click(screen.getByText(dictionary.landing.demoQuick));
    expect(await screen.findByText(dictionary.survey.quick[0])).toBeInTheDocument();

    await answerAll(user, 5);

    await waitFor(
      () => expect(screen.getByText(dictionary.landing.demoResult)).toBeInTheDocument(),
      { timeout: 15000 },
    );
    // The real model ran: a career from the real catalog is linked, and the
    // link points at a detail page that exists.
    const links = screen.getAllByRole("link");
    const career = links.find((link) => link.getAttribute("href")?.includes("/careers/"));
    expect(career).toBeDefined();
    expect(career?.textContent?.trim()).not.toBe("");
  }, 30000);

  it("asks ten in the deep dive and shows three matches with their majors", async () => {
    const user = userEvent.setup();
    renderSurvey();

    await user.click(screen.getByText(dictionary.landing.demoDeep));
    await answerAll(user, 10);

    await waitFor(
      () => expect(screen.getByText(dictionary.landing.demoResultDeep)).toBeInTheDocument(),
      { timeout: 15000 },
    );
    const careerLinks = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href")?.includes("/careers/"));
    expect(careerLinks).toHaveLength(3);
    // Majors are the half of the answer a student choosing a degree needs.
    expect(screen.getAllByText(new RegExp(dictionary.landing.demoMajors)).length)
      .toBeGreaterThan(0);
  }, 30000);

  it("separates a yes-to-everything student from a no-to-everything one", async () => {
    const user = userEvent.setup();
    const { unmount } = renderSurvey();

    await user.click(screen.getByText(dictionary.landing.demoDeep));
    await answerAll(user, 10);
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
    for (let index = 0; index < 10; index += 1) {
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

  it("shows every survey question in Arabic too", () => {
    const arabic = getDictionary("ar");
    expect(arabic.survey.quick).toHaveLength(5);
    expect(arabic.survey.deep).toHaveLength(10);
    // The deep dive opens with the quick check's questions, in both languages,
    // so a student who does both is never asked to contradict themselves.
    expect(arabic.survey.deep.slice(0, 5)).toEqual(arabic.survey.quick);
    expect(dictionary.survey.deep.slice(0, 5)).toEqual(dictionary.survey.quick);
    for (const question of [...arabic.survey.quick, ...arabic.survey.deep]) {
      expect(question).toMatch(/[؀-ۿ]/);
    }
  });

  /*
   * The bug this pins: the deep dive asks about the same RIASEC letter more
   * than once — q1 lowers S, q5 raises it, q8 lowers I after q1 raised it.
   * Overwriting instead of averaging would mean the later answer silently
   * cancelled the earlier one, so ten answers would produce exactly the
   * profile of the last five and the extra five questions would be theatre.
   */
  it("averages repeated dimensions instead of letting the last answer win", () => {
    const first = applyAnswer(emptyScores(), { id: "a", up: "I", down: "S", axis: "riasec" }, true);
    expect(first.riasec).toEqual({ I: 85, S: 40 });

    // The reverse question on the same pair must land between the two, not on
    // the second one's value.
    const second = applyAnswer(first, { id: "b", up: "S", down: "I", axis: "riasec" }, true);
    expect(second.riasec.S).toBe(63);
    expect(second.riasec.I).toBe(63);
    expect(second.riasec.I).not.toBe(40);
  });

  it("keeps the two vectors apart", () => {
    const scores = applyAnswer(emptyScores(), { id: "a", up: "O", down: "C", axis: "bigfive" }, true);
    expect(scores.riasec).toEqual({});
    expect(scores.bigfive).toEqual({ O: 85, C: 40 });

    // Unanswered dimensions fall back to neutral rather than to zero, which
    // would read to the model as a student with no interests at all.
    const profile = toStudentProfile(scores);
    expect(profile.riasec).toEqual(NEUTRAL_RIASEC);
    expect(profile.bigfive.O).toBe(85);
    expect(profile.bigfive.N).toBe(45);
  });

  it("keeps the deep dive a superset of the quick check", () => {
    expect(QUICK_SURVEY).toHaveLength(5);
    expect(DEEP_SURVEY).toHaveLength(10);
    expect(DEEP_SURVEY.slice(0, 5)).toEqual(QUICK_SURVEY);
    // The question text must line up with the dimensions, in both languages.
    expect(dictionary.survey.quick).toHaveLength(QUICK_SURVEY.length);
    expect(dictionary.survey.deep).toHaveLength(DEEP_SURVEY.length);
    expect(getDictionary("ar").survey.deep).toHaveLength(DEEP_SURVEY.length);
  });

  it("moves a distinct dimension pair in every question of the quick check", () => {
    // Five questions that all pushed the same letter would be one question
    // asked five times.
    const pairs = QUICK_SURVEY.map((question) => [question.up, question.down].sort().join("-"));
    expect(new Set(pairs).size).toBe(QUICK_SURVEY.length - 1);
    expect(new Set(QUICK_SURVEY.flatMap((q) => [q.up, q.down])).size).toBe(6);
  });
});