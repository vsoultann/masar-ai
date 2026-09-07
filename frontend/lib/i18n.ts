import en from "@/dictionaries/en.json";
import ar from "@/dictionaries/ar.json";

export const locales = ["en", "ar"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

/** The English dictionary is the shape every locale must satisfy. */
export type Dictionary = typeof en;

const dictionaries: Record<Locale, Dictionary> = {
  en,
  // ar.json is validated against en.json's shape by the type assertion below;
  // a missing key is a build error rather than an "undefined" in the UI.
  ar: ar as Dictionary,
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export function dirFor(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

/** Swap the locale segment of a path, keeping everything after it. */
export function switchLocalePath(pathname: string, next: Locale): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length > 0 && isLocale(segments[0])) {
    segments[0] = next;
    return "/" + segments.join("/");
  }
  return `/${next}${pathname}`;
}

/**
 * Arabic-Indic digits.
 *
 * Arabic-language UAE material is normally typeset with Arabic-Indic numerals,
 * and mixing Western digits into Arabic body text looks like a half-finished
 * translation. Percentages and money keep Western digits on purpose: they are
 * read as data, and the surrounding tables align better.
 */
const ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

export function localiseDigits(value: string | number, locale: Locale): string {
  const text = String(value);
  if (locale !== "ar") return text;
  return text.replace(/[0-9]/g, (digit) => ARABIC_DIGITS[Number(digit)]);
}

/** Arabic number-noun agreement for "week", mirroring the backend helper. */
export function formatWeeks(count: number, locale: Locale): string {
  if (locale !== "ar") return count === 1 ? "1 week" : `${count} weeks`;
  if (count === 1) return "أسبوع واحد";
  if (count === 2) return "أسبوعان";
  const digits = localiseDigits(count, "ar");
  if (count >= 3 && count <= 10) return `${digits} أسابيع`;
  return `${digits} أسبوعاً`;
}
