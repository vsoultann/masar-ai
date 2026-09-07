import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Header from "@/components/Header";
import { getDictionary } from "@/lib/i18n";
import { LocaleProvider } from "@/lib/locale-context";

const push = vi.fn();
let pathname = "/en/careers";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

// The header only needs to know whether someone is signed in.
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: null, loading: false, logout: vi.fn() }),
}));

function renderHeader(locale: "en" | "ar") {
  return render(
    <LocaleProvider locale={locale} dictionary={getDictionary(locale)}>
      <Header />
    </LocaleProvider>,
  );
}

describe("language toggle", () => {
  beforeEach(() => {
    push.mockClear();
    pathname = "/en/careers";
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
    expect(screen.getByRole("link", { name: "عن المشروع" })).toBeInTheDocument();
  });

  it("exposes an accessible theme toggle", () => {
    renderHeader("en");
    expect(
      screen.getByRole("button", { name: /switch between light and dark/i }),
    ).toBeInTheDocument();
  });
});
