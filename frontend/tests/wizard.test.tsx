import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import OnboardingPage from "@/app/[locale]/onboarding/page";
import { getDictionary } from "@/lib/i18n";
import { LocaleProvider } from "@/lib/locale-context";
import type { Profile, Questionnaire } from "@/lib/types";

const push = vi.fn();
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/en/onboarding",
  useRouter: () => ({ push, replace, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

// A single frozen object: returning a fresh one on every render would change
// its identity each time, which is exactly the fragility the page must not have.
const testUser = {
  id: 1,
  email: "student@masar.ae",
  full_name: "Test Student",
  role: "student",
};

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: testUser, loading: false }),
}));

const emptyProfile: Profile = {
  full_name: "",
  emirate: null,
  school: null,
  grade_level: null,
  track: null,
  grades: {},
  emsat: {},
  riasec: {},
  bigfive: {},
  riasec_answers: {},
  bigfive_answers: {},
  completed_steps: 0,
  is_complete: false,
};

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

const state = { profile: emptyProfile };
const put = vi.fn(async (path: string, body: Record<string, unknown>) => {
  const step = Number(path.slice(-1));
  state.profile = { ...state.profile, ...body, completed_steps: step } as Profile;
  return state.profile;
});

vi.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {
    localised() {
      return "error";
    }
  },
  api: {
    get: vi.fn(async (path: string) => {
      if (path === "/api/profile") return state.profile;
      if (path.endsWith("riasec")) return questionnaire("riasec", 30);
      if (path.endsWith("bigfive")) return questionnaire("bigfive", 25);
      throw new Error(`unexpected GET ${path}`);
    }),
    put: (path: string, body: Record<string, unknown>) => put(path, body),
  },
}));

function renderWizard(locale: "en" | "ar" = "en") {
  return render(
    <LocaleProvider locale={locale} dictionary={getDictionary(locale)}>
      <OnboardingPage />
    </LocaleProvider>,
  );
}

describe("onboarding wizard", () => {
  beforeEach(() => {
    state.profile = { ...emptyProfile };
    put.mockClear();
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

  it("saves step 1 and advances to the grades step", async () => {
    const user = userEvent.setup();
    renderWizard();

    const name = await screen.findByLabelText("Full name");
    // The field is prefilled from the account, so clear it before typing.
    await user.clear(name);
    await user.type(name, "Sara Ahmed");
    await user.selectOptions(screen.getByLabelText("Emirate of residence"), "sharjah");
    await user.type(screen.getByLabelText("School"), "Al Noor School");
    await user.selectOptions(screen.getByLabelText("MOE track"), "advanced");
    await user.click(screen.getByRole("button", { name: /save and continue/i }));

    await waitFor(() => expect(put).toHaveBeenCalledTimes(1));
    expect(put).toHaveBeenCalledWith("/api/profile/step1", {
      full_name: "Sara Ahmed",
      emirate: "sharjah",
      school: "Al Noor School",
      grade_level: "12",
      track: "advanced",
    });
    expect(
      await screen.findByLabelText("Mathematics", { selector: "#grade-math" }),
    ).toBeInTheDocument();
  });

  it("marks EmSAT as optional and only submits the scores that were entered", async () => {
    const user = userEvent.setup();
    state.profile = { ...emptyProfile, completed_steps: 1 };
    renderWizard();

    // "Mathematics" labels both a subject grade and an EmSAT score.
    const maths = await screen.findByLabelText("Mathematics", { selector: "#grade-math" });
    await user.type(maths, "92");
    await user.click(screen.getByRole("button", { name: /save and continue/i }));

    await waitFor(() => expect(put).toHaveBeenCalled());
    expect(put).toHaveBeenCalledWith("/api/profile/step2", {
      grades: { math: 92 },
      emsat: {},
    });
  });

  it("resumes at the step after the last completed one", async () => {
    state.profile = { ...emptyProfile, completed_steps: 2 };
    renderWizard();
    // Step 3 is the RIASEC questionnaire.
    expect(await screen.findByText("Statement 1")).toBeInTheDocument();
  });

  it("blocks submission until every statement is answered", async () => {
    const user = userEvent.setup();
    state.profile = { ...emptyProfile, completed_steps: 2 };
    renderWizard();

    await screen.findByText("Statement 1");
    const submit = screen.getByRole("button", { name: /save and continue/i });
    expect(submit).toBeDisabled();

    await user.click(screen.getAllByLabelText("Neutral")[0]);
    // The counter is assembled from several text nodes, so match on the
    // element's combined text rather than on a single node.
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === "P" && element.textContent?.trim() === "1 / 30 answered",
      ),
    ).toBeInTheDocument();
    expect(submit).toBeDisabled();
  });

  it("renders the wizard in Arabic when the locale is Arabic", async () => {
    renderWizard("ar");
    expect(await screen.findByLabelText("إمارة الإقامة")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "حفظ ومتابعة" })).toBeInTheDocument();
  });
});
