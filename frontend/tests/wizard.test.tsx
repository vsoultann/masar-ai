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

  it("marks EmSAT as optional and only stores the scores that were entered", async () => {
    const user = userEvent.setup();
    seed({ completedSteps: 1 });
    renderWizard();

    await fillGrades(user, { math: "92" });
    await user.click(screen.getByRole("button", { name: /save and continue/i }));

    await waitFor(() => {
      const stored = useProfile.getState().profile;
      expect(stored?.grades.math).toBe(92);
      // EmSAT is genuinely optional — a grade 10 or 11 student has not sat it.
      expect(stored?.emsat).toEqual({});
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

  it("refuses a mark outside 0-100, and an EmSAT score off its band", async () => {
    const user = userEvent.setup();
    seed({ completedSteps: 1 });
    renderWizard();

    await fillGrades(user, { physics: "140" });
    const emsatMaths = await screen.findByLabelText("Mathematics", { selector: "#emsat-math" });
    await user.type(emsatMaths, "120");
    await user.click(screen.getByRole("button", { name: /save and continue/i }));

    expect(await screen.findByText("Enter a number between 0 and 100.")).toBeInTheDocument();
    expect(screen.getByText("EmSAT scores are between 500 and 1500.")).toBeInTheDocument();
    expect(useProfile.getState().profile?.completedSteps).toBe(1);
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
    // Step 3 is the RIASEC questionnaire.
    expect(await screen.findByText("Statement 1")).toBeInTheDocument();
  });

  it("shows one statement at a time and advances after an answer", async () => {
    const user = userEvent.setup();
    seed({ completedSteps: 2 });
    renderWizard();

    // Only the current statement is on screen, not all thirty.
    expect(await screen.findByText("Statement 1")).toBeInTheDocument();
    expect(screen.queryByText("Statement 2")).not.toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Neutral" }));

    // Selecting auto-advances, so statement 2 replaces statement 1.
    expect(await screen.findByText("Statement 2")).toBeInTheDocument();
    expect(screen.queryByText("Statement 1")).not.toBeInTheDocument();
  });

  it("answers from the keyboard: arrows move, digits pick, Backspace goes back", async () => {
    const user = userEvent.setup();
    seed({ completedSteps: 2 });
    renderWizard();
    await screen.findByText("Statement 1");

    // "2" picks the second scale point directly and advances.
    await user.keyboard("2");
    expect(await screen.findByText("Statement 2")).toBeInTheDocument();

    // Backspace returns to the previous statement, with its answer intact.
    await user.keyboard("{Backspace}");
    expect(await screen.findByText("Statement 1")).toBeInTheDocument();
    const scale = useProfile.getState().profile?.riasecAnswers ?? {};
    expect(scale.riasec_1).toBe(3);   // the fixture's second point

    // Arrow + Enter selects the highlighted option.
    await user.keyboard("{ArrowRight}{Enter}");
    await waitFor(() => {
      expect(useProfile.getState().profile?.riasecAnswers.riasec_1).toBe(5);
    });
  });

  it("keeps the finish button disabled until every statement is answered", async () => {
    const user = userEvent.setup();
    // 29 of 30 answered: the flow resumes on the one remaining gap.
    const answers = Object.fromEntries(
      Array.from({ length: 29 }, (_, i) => [`riasec_${i + 1}`, 3]),
    );
    seed({ completedSteps: 2, riasecAnswers: answers });
    renderWizard();

    expect(await screen.findByText("Statement 30")).toBeInTheDocument();
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

    await screen.findByText("Statement 1");   // resumes at step 4's questionnaire
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
