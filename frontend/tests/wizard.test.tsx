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

    // "Mathematics" labels both a subject grade and an EmSAT score.
    const maths = await screen.findByLabelText("Mathematics", { selector: "#grade-math" });
    await user.type(maths, "92");
    await user.click(screen.getByRole("button", { name: /save and continue/i }));

    await waitFor(() => {
      const stored = useProfile.getState().profile;
      expect(stored?.grades).toEqual({ math: 92 });
      expect(stored?.emsat).toEqual({});
    });
  });

  it("resumes at the step after the last completed one", async () => {
    seed({ completedSteps: 2 });
    renderWizard();
    // Step 3 is the RIASEC questionnaire.
    expect(await screen.findByText("Statement 1")).toBeInTheDocument();
  });

  it("blocks submission until every statement is answered", async () => {
    const user = userEvent.setup();
    seed({ completedSteps: 2 });
    renderWizard();

    await screen.findByText("Statement 1");
    const submit = screen.getByRole("button", { name: /save and continue/i });
    expect(submit).toBeDisabled();

    await user.click(screen.getAllByLabelText("Neutral")[0]);
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === "P" && element.textContent?.trim() === "1 / 30 answered",
      ),
    ).toBeInTheDocument();
    expect(submit).toBeDisabled();
  });

  it("never moves completedSteps backwards when an earlier step is revisited", async () => {
    const user = userEvent.setup();
    // A student who has finished everything goes back to fix a grade.
    seed({ completedSteps: 4, grades: { math: 60 } });
    renderWizard();

    await screen.findByText("Statement 1");   // resumes at step 4's questionnaire
    // Jump back to step 2 via the progress control.
    await user.click(screen.getByRole("button", { name: /your grades/i }));

    const maths = await screen.findByLabelText("Mathematics", { selector: "#grade-math" });
    await user.clear(maths);
    await user.type(maths, "95");
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
