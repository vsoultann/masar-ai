"use client";

import { createContext, useContext } from "react";

import type { Dictionary, Locale } from "@/lib/i18n";

interface LocaleValue {
  locale: Locale;
  dir: "rtl" | "ltr";
  t: Dictionary;
  /**
   * Picks the `_en` or `_ar` variant of a bilingual API field.
   *
   * Typed as `object` rather than `Record<string, unknown>` on purpose: every
   * API type is a declared interface, and interfaces have no implicit index
   * signature, so the stricter parameter type rejects all of them.
   */
  pick: (record: object, base: string) => string;
  /**
   * Looks up a dictionary map keyed by a catalog id (work environments,
   * institution types, and so on).
   *
   * These maps are typed from en.json as exact object literals, so indexing
   * them with a `string` from the data is a type error even though every key
   * is present. The lookup is centralised here with one cast and a fallback,
   * rather than casting at each of the dozen call sites.
   */
  lookup: (map: object, key: string) => string;
}

const LocaleContext = createContext<LocaleValue | null>(null);

export function LocaleProvider({
  locale,
  dictionary,
  children,
}: {
  locale: Locale;
  dictionary: Dictionary;
  children: React.ReactNode;
}) {
  const value: LocaleValue = {
    locale,
    dir: locale === "ar" ? "rtl" : "ltr",
    t: dictionary,
    lookup: (map, key) =>
      (map as Record<string, string>)[key] ?? key,
    pick: (record, base) => {
      const fields = record as Record<string, unknown>;
      return String(fields[`${base}_${locale}`] ?? fields[`${base}_en`] ?? "");
    },
  };
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleValue {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used inside <LocaleProvider>");
  return context;
}
