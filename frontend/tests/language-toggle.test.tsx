import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Header from "@/components/Header";
import { getDictionary } from "@/lib/i18n";
import { LocaleProvider } from "@/lib/locale-context";
import { useProfile } from "@/lib/store/profile";
import type { Profile } from "@/lib/types";

const push = vi.fn();
let pathname = "/en/careers";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

/*
 * "Signed in" in v2 means a profile exists in this browser's storage, so the
 * header reads the profile store rather than an auth module. Seeding the store
 * is what flips the navigation into its signed-in shape.
 */
function signIn() {
  useProfile.setState({ profile: { id: "test" } as Profile, hydrated: true });
}

function renderHeader(locale: "en" | "ar") {
  return render(
    <LocaleProvider locale={locale} dictionary={getDictionary(locale)}>
      <Header />
    </LocaleProvider>,
  );
}

/** The desktop nav only -- the wordmark and the call to action are not menu items. */
function navHrefs(): string[] {
  const [desktop] = screen.getAllByRole("navigation");
  return within(desktop)
    .getAllByRole("link")
    .map((link) => link.getAttribute("href") ?? "");
}

describe("language toggle", () => {
  beforeEach(() => {
    push.mockClear();
    pathname = "/en/careers";
    useProfile.setState({ profile: null, hydrated: true });
  });

  it("offers Arabic while the site is in English", () => {
    renderHeader("en");
    expect(screen.getByRole("button", { name: /switch language/i })).toHaveTextContent(
      "العربية",
    );
  });

  it("offers English while the site is in Arabic", () => {
    pathname = "/ar/careers";
    renderHeader("ar");
    expect(screen.getByRole("button", { name: /تغيير اللغة/ })).toHaveTextContent("English");
  });

  it("navigates to the same page in the other language", async () => {
    const user = userEvent.setup();
    renderHeader("en");
    await user.click(screen.getByRole("button", { name: /switch language/i }));
    expect(push).toHaveBeenCalledWith("/ar/careers");
  });

  it("keeps the current path when toggling back", async () => {
    const user = userEvent.setup();
    pathname = "/ar/careers/data_scientist";
    renderHeader("ar");
    await user.click(screen.getByRole("button", { name: /تغيير اللغة/ }));
    expect(push).toHaveBeenCalledWith("/en/careers/data_scientist");
  });

  it("renders navigation labels in the active language", () => {
    renderHeader("ar");
    expect(screen.getByRole("link", { name: "المهن" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "الجامعات" })).toBeInTheDocument();
  });

  /*
   * Ordered by how close a link is to the student's own work. Reviewer
   * feedback, 2026-09-11: every header link is about the user except About,
   * which belongs in the footer.
   */
  it("orders the navigation from the student outwards", () => {
    renderHeader("en");
    const labels = navHrefs();
    expect(labels).toEqual(["/en/careers", "/en/universities", "/en/mentor"]);
  });

  it("puts the student's own pages first once signed in", () => {
    signIn();
    renderHeader("en");
    const labels = navHrefs();
    expect(labels).toEqual([
      "/en/dashboard",
      "/en/results",
      "/en/careers",
      "/en/universities",
      "/en/mentor",
    ]);
  });

  it("keeps About out of the header", () => {
    renderHeader("en");
    expect(screen.queryByRole("link", { name: "About" })).not.toBeInTheDocument();
  });

  it("exposes an accessible theme toggle", () => {
    renderHeader("en");
    expect(
      screen.getByRole("button", { name: /switch between light and dark/i }),
    ).toBeInTheDocument();
  });
});
