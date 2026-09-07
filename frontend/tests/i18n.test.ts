import { describe, expect, it } from "vitest";

import ar from "@/dictionaries/ar.json";
import en from "@/dictionaries/en.json";
import { formatWeeks, isLocale, localiseDigits, switchLocalePath } from "@/lib/i18n";

function flatten(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    flatten(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("dictionaries", () => {
  it("have identical key sets in both languages", () => {
    // A missing Arabic key would render as an empty string in the UI rather
    // than failing loudly, so it has to be caught here.
    expect(flatten(ar).sort()).toEqual(flatten(en).sort());
  });

  it("have no empty strings", () => {
    for (const dictionary of [en, ar]) {
      const walk = (value: unknown, path: string) => {
        if (typeof value === "string") {
          expect(value.trim(), path).not.toBe("");
          return;
        }
        for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
          walk(child, `${path}.${key}`);
        }
      };
      walk(dictionary, "root");
    }
  });

  it("declare the right direction for each locale", () => {
    expect(en.meta.dir).toBe("ltr");
    expect(ar.meta.dir).toBe("rtl");
  });
});

describe("switchLocalePath", () => {
  it("swaps the locale segment and keeps the rest of the path", () => {
    expect(switchLocalePath("/en/careers/data_scientist", "ar")).toBe(
      "/ar/careers/data_scientist",
    );
    expect(switchLocalePath("/ar/dashboard", "en")).toBe("/en/dashboard");
  });

  it("handles the locale root", () => {
    expect(switchLocalePath("/en", "ar")).toBe("/ar");
  });

  it("prefixes a path that has no locale yet", () => {
    expect(switchLocalePath("/careers", "ar")).toBe("/ar/careers");
  });
});

describe("isLocale", () => {
  it("accepts only supported locales", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("ar")).toBe(true);
    expect(isLocale("fr")).toBe(false);
  });
});

describe("localiseDigits", () => {
  it("converts to Arabic-Indic numerals in Arabic only", () => {
    expect(localiseDigits(2026, "ar")).toBe("٢٠٢٦");
    expect(localiseDigits(2026, "en")).toBe("2026");
  });

  it("leaves non-digits untouched", () => {
    expect(localiseDigits("15,000", "ar")).toBe("١٥,٠٠٠");
  });
});

describe("formatWeeks", () => {
  it("applies Arabic number-noun agreement", () => {
    expect(formatWeeks(1, "ar")).toBe("أسبوع واحد");
    expect(formatWeeks(2, "ar")).toBe("أسبوعان");
    expect(formatWeeks(8, "ar")).toBe("٨ أسابيع");
    expect(formatWeeks(16, "ar")).toBe("١٦ أسبوعاً");
  });

  it("pluralises simply in English", () => {
    expect(formatWeeks(1, "en")).toBe("1 week");
    expect(formatWeeks(8, "en")).toBe("8 weeks");
  });
});
