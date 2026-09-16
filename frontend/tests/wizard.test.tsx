import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AssessmentPage from "@/app/[locale]/assessment/page";
import { getDictionary } from "@/lib/i18n";
import { LocaleProvider } from "@/lib/locale-context";
import { useProfile } from "@/lib/store/profile";
import type { Questionnaire } from "@/lib/types";

const push = vi.fn();
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/en/assessment",
  useRouter: () => ({ push, replace, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

function questionnaire(id: string, count: number): Questionnaire {
  return {
    id,
    name_en: id,
    name_ar: id,
    scale: [
      { value: 1, label_en: "Strongly disagree", label_ar: "لا أوافق بشدة" },
      { value: 3, label_en: "Neutral", label_ar: "محايد" },
      { value: 5, label_en: "Strongly agree", label_ar: "أوافق بشدة" },
    ],
    dimensions: [{ code: "R", name_en: "Realistic", name_ar: "الواقعي" }],
    items: Array.from({ length: count }, (_, index) => ({
      id: `${id}_${index + 1}`,
      dimension: "R",
      reverse: false,
      text_en: `Statement ${index + 1}`,
      text_ar: `العبارة ${index + 1}`,
    })),
  };
}

// Only the questionnaires are mocked. The profile store is the real one, so
// these tests exercise the persistence path the app actually uses rather than
// a stand-in for it.
vi.mock("@/lib/data/client", () => ({
  loadRiasec: vi.fn(async () => questionnaire("riasec", 30)),
  loadBigFive: vi.fn(async () => questionnaire("bigfive", 25)),
}));

/** The six core subjects the wizard now asks for, in the order it renders them. */
const CORE_SUBJECTS: [string, string][] = [
  ["math", "Mathematics"],
  ["physics", "Physics"],
  ["biology", "Biology"],
  ["chemistry", "Chemistry"],
  ["english", "English"],
  ["arabic", "Arabic"],
];

/** Fills every required grade, which step 2 will not advance without. */
async function fillGrades(
  user: ReturnType<typeof userEvent.setup>,
  marks: Record<string, string> = {},
) {
  for (const [id, label] of CORE_SUBJECTS) {
    const field = await screen.findByLabelText(label, { selector: `#grade-${id}` });
    await user.clear(field);
    await user.type(field, marks[id] ?? "80");
  }
}

/**
 * The statement currently on screen.
 *
 * Steps 3 and 4 now draw ten items at random from the full inventory, so no
 * test may assume "Statement 1" comes first — only that exactly one statement
 * is visible and that answering it moves to a different one.
 */
function visibleStatement(): string | null {
  for (let index = 1; index <= 30; index += 1) {
    if (screen.queryByText(`Statement ${index}`)) return `Statement ${index}`;
  }
  return null;
}

/** The ids the wizard drew for this profile, in the order it will ask them. */
const drawnRiasec = () => useProfile.getState().profile?.riasecItems ?? [];

function renderWizard(locale: "en" | "ar" = "en") {
  return render(
    <LocaleProvider locale={locale} dictionary={getDictionary(locale)}>
      <AssessmentPage />
    </LocaleProvider>,
  );
}

/** Puts the store into a known state, as though rehydration had finished. */
function seed(profile: Partial<ReturnType<typeof useProfile.getState>["profile"]> | null) {
  useProfile.setState({
    profile: profile
      ? ({
          id: "test", version: 2, fullName: "", emirate: null, city: null,
          coordinates: null, locationSource: null, school: null, gradeLevel: null,
          track: null, grades: {}, emsat: {}, riasec: {}, bigfive: {},
          riasecAnswers: {}, bigfiveAnswers: {}, completedSteps: 0,
          savedCareers: [], savedUniversities: [], role: "student",
          createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
          ...profile,
        } as NonNullable<ReturnType<typeof useProfile.getState>["profile"]>)
      : null,
    hydrated: true,
  });
}

describe("assessment wizard", () => {
  beforeEach(() => {
    seed({});
    push.mockClear();
  });

  it("starts at step 1 and shows the personal details fields", async () => {
    renderWizard();
    expect(await screen.findByLabelText("Emirate of residence")).toBeInTheDocument();
    expect(screen.getByLabelText("School")).toBeInTheDocument();
    expect(screen.getByLabelText("MOE track")).toBeInTheDocument();
  });

  it("offers all seven emirates and the three MOE tracks", async () => {
    renderWizard();
    const emirate = await screen.findByLabelText("Emirate of residence");
    // seven emirates plus the empty placeholder
    expect(within(emirate).getAllByRole("option")).toHaveLength(8);
    const track = screen.getByLabelText("MOE track");
    expect(within(track).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "General",
      "Advanced",
      "Elite",
    ]);
  });

  it("saves step 1 to the local profile and advances to the grades step", async () => {
    const user = userEvent.setup();
    renderWizard();

    const name = await screen.findByLabelText("Full name");
    await user.clear(name);
    await user.type(name, "Sara Ahmed");
    await user.selectOptions(screen.getByLabelText("Emirate of residence"), "sharjah");
    await user.type(screen.getByLabelText("School"), "Al Noor School");
    await user.selectOptions(screen.getByLabelText("MOE track"), "advanced");
    await user.click(screen.getByRole("button", { name: /save and continue/i }));

    await waitFor(() => {
      const stored = useProfile.getState().profile;
      expect(stored?.fullName).toBe("Sara Ahmed");
      expect(stored?.emirate).toBe("sharjah");
      expect(stored?.school).toBe("Al Noor School");
      expect(stored?.track).toBe("advanced");
      expect(stored?.completedSteps).toBe(1);
    });

    expect(
      await screen.findByLabelText("Mathematics", { selector: "#grade-math" }),
    ).toBeInTheDocument();
  });

  it("offers the city picker only once an emirate is chosen", async () => {
    const user = userEvent.setup();
    renderWizard();

    await screen.findByLabelText("Emirate of residence");
    expect(screen.queryByLabelText("City or area")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Emirate of residence"), "abu_dhabi");
    const city = await screen.findByLabelText("City or area");
    // Abu Dhabi's four areas plus the placeholder.
    expect(within(city).getAllByRole("option")).toHaveLength(5);
  });

  it("marks the standardised tests optional and stores only what was entered", async () => {
    const user = userEvent.setup();
    seed({ completedSteps: 1 });
    renderWizard();

    await fillGrades(user, { math: "92" });
    await user.click(screen.getByRole("button", { name: /save and continue/i }));

    await waitFor(() => {
      const stored = useProfile.getState().profile;
      expect(stored?.grades.math).toBe(92);
      // Genuinely optional — a grade 10 or 11 student has sat neither.
      expect(stored?.sat).toBeNull();
      expect(stored?.ielts).toBeNull();
    });
  });

  /*
   * The rule the reported bug asked for: an unanswered or out-of-range mark
   * must not let you continue. Before this, a blank was silently dropped on
   * submit and the student went through with nothing entered — the recommender
   * then ran on an entirely imputed academic profile and returned ten careers
   * with the confidence of a real answer.
   */
  it("refuses to continue while any subject is blank", async () => {
    const user = userEvent.setup();
    seed({ completedSteps: 1 });
    renderWizard();

    const maths = await screen.findByLabelText("Mathematics", { selector: "#grade-math" });
    await user.type(maths, "92");
    await user.click(screen.getByRole("button", { name: /save and continue/i }));

    expect(await screen.findByText("Fill in every subject before continuing."))
      .toBeInTheDocument();
    // Still on step 2, and nothing was written.
    expect(screen.getAllByText("This field is required.").length).toBe(5);
    expect(useProfile.getState().profile?.completedSteps).toBe(1);
  });

  it("refuses a mark outside 0-100, and a SAT or IELTS score off its scale", async () => {
    const user = userEvent.setup();
    seed({ completedSteps: 1 });
    renderWizard();

    await fillGrades(user, { physics: "140" });
    await user.type(await screen.findByLabelText("SAT total"), "2000");
    await user.type(screen.getByLabelText("IELTS overall band"), "9.5");
    await user.click(screen.getByRole("button", { name: /save and continue/i }));

    expect(await screen.findByText("Enter a number between 0 and 100.")).toBeInTheDocument();
    expect(screen.getByText("SAT totals are between 400 and 1600.")).toBeInTheDocument();
    expect(screen.getByText("IELTS bands are between 4.0 and 9.0.")).toBeInTheDocument();
    expect(useProfile.getState().profile?.completedSteps).toBe(1);
  });

  it("stores SAT and IELTS when given, and leaves them null when not", async () => {
    const user = userEvent.setup();
    seed({ completedSteps: 1 });
    renderWizard();

    await fillGrades(user);
    await user.type(await screen.findByLabelText("SAT total"), "1380");
    await user.click(screen.getByRole("button", { name: /save and continue/i }));

    await waitFor(() => {
      const stored = useProfile.getState().profile;
      expect(stored?.sat).toBe(1380);
      // Both are optional, and for different reasons: a grade 10 student has
      // not sat the SAT, and plenty of UAE programmes never ask for IELTS.
      expect(stored?.ielts).toBeNull();
    });
  });

  it("clears a field's error as soon as it is corrected", async () => {
    const user = userEvent.setup();
    seed({ completedSteps: 1 });
    renderWizard();

    await user.click(await screen.findByRole("button", { name: /save and continue/i }));
    expect(screen.getAllByText("This field is required.")).toHaveLength(6);

    const maths = await screen.findByLabelText("Mathematics", { selector: "#grade-math" });
    await user.type(maths, "88");
    // Leaving the error up while someone types reads as the form arguing.
    await waitFor(() =>
      expect(screen.getAllByText("This field is required.")).toHaveLength(5));
  });

  it("asks for the six core subjects and nothing else", async () => {
    seed({ completedSteps: 1 });
    renderWizard();
    await screen.findByLabelText("Mathematics", { selector: "#grade-math" });

    for (const [id] of CORE_SUBJECTS) {
      expect(document.querySelector(`#grade-${id}`), id).not.toBeNull();
    }
    // Islamic studies, social studies and computer science are not taken on
    // every MOE track, so asking for them made a mandatory form impossible.
    for (const dropped of ["islamic", "social", "computer_science"]) {
      expect(document.querySelector(`#grade-${dropped}`), dropped).toBeNull();
    }
  });

  it("resumes at the step after the last completed one", async () => {
    seed({ completedSteps: 2 });
    renderWizard();
    // Step 3 is the RIASEC questionnaire — which statement it opens on is a
    // property of the draw, not of the resume.
    await waitFor(() => expect(visibleStatement()).not.toBeNull());
  });

  it("shows one statement at a time and advances after an answer", async () => {
    const user = userEvent.setup();
    seed({ completedSteps: 2 });
    renderWizard();

    // Exactly one statement is on screen, not the whole inventory.
    await waitFor(() => expect(visibleStatement()).not.toBeNull());
    const first = visibleStatement();
    expect(
      Array.from({ length: 30 }, (_, i) => screen.queryByText(`Statement ${i + 1}`))
        .filter(Boolean),
    ).toHaveLength(1);

    await user.click(screen.getByRole("radio", { name: "Neutral" }));

    // Selecting auto-advances, so a different statement replaces it.
    await waitFor(() => expect(visibleStatement()).not.toBe(first));
    expect(screen.queryByText(first as string)).not.toBeInTheDocument();
  });

  it("draws ten statements, not the whole inventory", async () => {
    seed({ completedSteps: 2 });
    renderWizard();

    // Fifty-five statements across the two instruments was the longest thing
    // in the product and the commonest place to give up.
    await waitFor(() => expect(drawnRiasec()).toHaveLength(10));
    expect(new Set(drawnRiasec()).size).toBe(10);
  });

  it("keeps the same ten when the student comes back to finish", async () => {
    seed({ completedSteps: 2 });
    const { unmount } = renderWizard();
    await waitFor(() => expect(drawnRiasec()).toHaveLength(10));
    const first = [...drawnRiasec()];
    unmount();

    // Re-drawing on resume would change the questions under a half-finished
    // run and make "answer every statement" unsatisfiable.
    renderWizard();
    await waitFor(() => expect(drawnRiasec()).toHaveLength(10));
    expect(drawnRiasec()).toEqual(first);
  });

  it("answers from the keyboard: arrows move, digits pick, Backspace goes back", async () => {
    const user = userEvent.setup();
    seed({ completedSteps: 2 });
    renderWizard();
    // Wait for the draw, then read the order it actually produced.
    await waitFor(() => expect(drawnRiasec()).toHaveLength(10));
    await waitFor(() => expect(visibleStatement()).not.toBeNull());
    const first = visibleStatement();
    const firstId = drawnRiasec()[0];

    // "2" picks the second scale point directly and advances.
    await user.keyboard("2");
    await waitFor(() => expect(visibleStatement()).not.toBe(first));

    // Backspace returns to the previous statement, with its answer intact.
    await user.keyboard("{Backspace}");
    await waitFor(() => expect(visibleStatement()).toBe(first));
    const scale = useProfile.getState().profile?.riasecAnswers ?? {};
    expect(scale[firstId]).toBe(3);   // the fixture's second point

    // Arrow + Enter selects the highlighted option.
    await user.keyboard("{ArrowRight}{Enter}");
    await waitFor(() => {
      expect(useProfile.getState().profile?.riasecAnswers[firstId]).toBe(5);
    });
  });

  it("keeps the finish button disabled until every statement is answered", async () => {
    const user = userEvent.setup();
    // The draw is pinned here rather than left to chance: the component reads
    // its answers into local state once on mount, so they have to be in the
    // profile before it renders.
    const drawn = Array.from({ length: 10 }, (_, i) => `riasec_${i + 1}`);
    seed({
      completedSteps: 2,
      riasecItems: drawn,
      riasecAnswers: Object.fromEntries(drawn.slice(0, 9).map((id) => [id, 3])),
    });
    renderWizard();

    await waitFor(() => expect(visibleStatement()).not.toBeNull());
    const submit = screen.getByRole("button", { name: /save and continue/i });
    expect(submit).toBeDisabled();

    await user.click(screen.getByRole("radio", { name: "Neutral" }));
    await waitFor(() => expect(submit).toBeEnabled());
  });

  it("never moves completedSteps backwards when an earlier step is revisited", async () => {
    const user = userEvent.setup();
    // A student who has finished everything goes back to fix a grade.
    seed({ completedSteps: 4, grades: { math: 60 } });
    renderWizard();

    // Resumes at step 4's questionnaire.
    await waitFor(() => expect(visibleStatement()).not.toBeNull());
    // Jump back to step 2 via the progress control.
    await user.click(screen.getByRole("button", { name: /your grades/i }));

    await fillGrades(user, { math: "95" });
    await user.click(screen.getByRole("button", { name: /save and continue/i }));

    await waitFor(() => {
      const stored = useProfile.getState().profile;
      expect(stored?.grades.math).toBe(95);
      // Correcting a grade must not discard the finished questionnaires.
      expect(stored?.completedSteps).toBe(4);
    });
  });

  it("renders the wizard in Arabic when the locale is Arabic", async () => {
    renderWizard("ar");
    expect(await screen.findByLabelText("إمارة الإقامة")).toBeInTheDocument();
  });
});
