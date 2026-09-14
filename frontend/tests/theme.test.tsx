import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ThemeKeeper from "@/components/ThemeKeeper";
import ThemeScript from "@/components/ThemeScript";
import {
  applyDisplaySettings, resolveScheme, resolveTheme, resolveUiStyle,
  SCHEME_KEY, SCHEMES, setTheme, THEME_KEY, UI_KEY, UI_STYLES,
} from "@/lib/theme";

/*
 * A local localStorage.
 *
 * This jsdom setup has none, and the profile tests currently rely on the store
 * coping with its absence — so it is stubbed here rather than in tests/setup.ts,
 * where giving every suite real persistence would leak state between them.
 */
const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => void store.set(key, String(value)),
  removeItem: (key: string) => void store.delete(key),
  clear: () => store.clear(),
  key: (index: number) => [...store.keys()][index] ?? null,
  get length() {
    return store.size;
  },
});

let pathname = "/en/careers";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

beforeEach(() => {
  localStorage.clear();
  const root = document.documentElement;
  delete root.dataset.theme;
  delete root.dataset.scheme;
  delete root.dataset.ui;
  pathname = "/en/careers";
});

describe("display settings", () => {
  it("prefers the stored value over the operating system", () => {
    localStorage.setItem(THEME_KEY, "dark");
    expect(resolveTheme()).toBe("dark");

    localStorage.setItem(THEME_KEY, "light");
    expect(resolveTheme()).toBe("light");
  });

  it("falls back to the system preference, then to light", () => {
    // tests/setup.ts stubs matchMedia to report no match.
    expect(resolveTheme()).toBe("light");
  });

  it("ignores a stored value that is not a known option", () => {
    localStorage.setItem(SCHEME_KEY, "chartreuse");
    localStorage.setItem(UI_KEY, "brutalist");
    expect(resolveScheme()).toBe(SCHEMES[0]);
    expect(resolveUiStyle()).toBe(UI_STYLES[0]);
  });

  it("writes all three onto the document", () => {
    localStorage.setItem(THEME_KEY, "dark");
    localStorage.setItem(SCHEME_KEY, "royal");
    localStorage.setItem(UI_KEY, "glass");

    applyDisplaySettings();

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.dataset.scheme).toBe("royal");
    expect(document.documentElement.dataset.ui).toBe("glass");
  });
});

describe("switching language", () => {
  /*
   * The reported bug, in the shape it actually happened.
   *
   * `<html>` is rendered by the locale layout, a server component that cannot
   * read localStorage, so `data-theme` is only ever added at runtime. Crossing
   * from /en to /ar re-renders that layout, React reconciles `<html>` against
   * a tree with no such attribute and removes it — and a dark page turned
   * white. Navigating *within* a locale keeps the same layout instance, which
   * is why only the language toggle showed it.
   */
  it("keeps a dark page dark", () => {
    localStorage.setItem(THEME_KEY, "dark");
    const { rerender } = render(<ThemeKeeper />);
    expect(document.documentElement.dataset.theme).toBe("dark");

    // What the locale change does to the element React owns.
    delete document.documentElement.dataset.theme;
    pathname = "/ar/careers";
    rerender(<ThemeKeeper />);

    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("keeps a light page light for a student whose device prefers dark", () => {
    // The other direction, which a system-preference fallback alone would get
    // wrong: an explicit choice of light must survive the navigation too.
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true } as MediaQueryList);
    localStorage.setItem(THEME_KEY, "light");

    const { rerender } = render(<ThemeKeeper />);
    delete document.documentElement.dataset.theme;
    pathname = "/ar";
    rerender(<ThemeKeeper />);

    expect(document.documentElement.dataset.theme).toBe("light");
    vi.restoreAllMocks();
  });

  it("keeps the accent scheme and interface style too", () => {
    // Same mechanism, same fix, and they were silently resetting as well.
    localStorage.setItem(SCHEME_KEY, "sunset");
    localStorage.setItem(UI_KEY, "minimal");

    const { rerender } = render(<ThemeKeeper />);
    delete document.documentElement.dataset.scheme;
    delete document.documentElement.dataset.ui;
    pathname = "/ar";
    rerender(<ThemeKeeper />);

    expect(document.documentElement.dataset.scheme).toBe("sunset");
    expect(document.documentElement.dataset.ui).toBe("minimal");
  });

  it("leaves the document alone when nothing changed", async () => {
    localStorage.setItem(THEME_KEY, "dark");
    render(<ThemeKeeper />);

    // Observed rather than spied on: `dataset` is a proxy whose setters cannot
    // be intercepted, and a mutation record is the more honest evidence anyway
    // — it is exactly what the browser would act on.
    const mutations: string[] = [];
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.attributeName) mutations.push(record.attributeName);
      }
    });
    observer.observe(document.documentElement, { attributes: true });

    applyDisplaySettings();
    await Promise.resolve();
    observer.disconnect();

    // Rewriting an unchanged value would invalidate style on every navigation
    // for no reason.
    expect(mutations).toEqual([]);
  });
});

describe("the pre-paint script", () => {
  it("uses the same keys and options as the module", () => {
    // The inline script cannot import anything — it runs before the bundle
    // exists — so the two are only guaranteed to agree if this holds.
    const { container } = render(<ThemeScript />);
    const source = container.querySelector("script")?.innerHTML ?? "";

    for (const key of [THEME_KEY, SCHEME_KEY, UI_KEY]) {
      expect(source, key).toContain(JSON.stringify(key));
    }
    expect(source).toContain(JSON.stringify([...SCHEMES]));
    expect(source).toContain(JSON.stringify([...UI_STYLES]));
  });
});

describe("setTheme", () => {
  it("writes through to storage and the document", () => {
    setTheme("dark");
    expect(localStorage.getItem(THEME_KEY)).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
