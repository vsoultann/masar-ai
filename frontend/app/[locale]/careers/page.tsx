"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import CareerCard from "@/components/CareerCard";
import { EmptyState, ErrorBox, Skeleton } from "@/components/ui";
import { indexBy, loadCareerIndex, loadSectors } from "@/lib/data/client";
import { localiseDigits } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import { revealContainer, viewportOnce } from "@/lib/motion";
import type { CareerSummary, Demand, Sector } from "@/lib/types";

/**
 * The careers explorer: browsable without a profile, as the brief requires.
 *
 * Filtering runs over the 184-entry index in memory. That is fast enough that
 * debouncing the search would only add latency — the whole list is already in
 * the browser, and there is no request to throttle.
 */
function CareersView() {
  const { locale, t } = useLocale();
  const searchParams = useSearchParams();

  const [careers, setCareers] = useState<CareerSummary[] | null>(null);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  // Seeded from ?sector= so the landing page's sector tiles deep-link here.
  const [sector, setSector] = useState(searchParams?.get("sector") ?? "");
  const [demand, setDemand] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadCareerIndex(), loadSectors()])
      .then(([careerRows, sectorRows]) => {
        if (cancelled) return;
        setCareers(careerRows);
        setSectors(sectorRows);
      })
      .catch(() => {
        if (!cancelled) setError(t.common.error);
      });
    return () => {
      cancelled = true;
    };
  }, [t.common.error]);

  const sectorsById = useMemo(() => indexBy(sectors), [sectors]);

  const filtered = useMemo(() => {
    if (!careers) return [];
    const needle = query.trim().toLowerCase();
    return careers.filter((career) => {
      if (sector && career.sector !== sector) return false;
      if (demand && career.demandOutlook !== demand) return false;
      if (!needle) return true;
      // Search both languages regardless of the active one: students often
      // know a career's name in English but are reading the Arabic site.
      return (
        career.title.en.toLowerCase().includes(needle)
        || career.title.ar.includes(needle)
        || career.shortDescription.en.toLowerCase().includes(needle)
        || career.shortDescription.ar.includes(needle)
      );
    });
  }, [careers, query, sector, demand]);

  const hasFilters = Boolean(query || sector || demand);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <ErrorBox message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header>
        <h1 className="text-2xl font-black sm:text-3xl">{t.careers.title}</h1>
        <p className="mt-2 max-w-2xl muted">{t.careers.subtitle}</p>
      </header>

      <div className="card mt-6 grid gap-3 p-4 sm:grid-cols-[2fr_1fr_1fr]">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold">{t.careers.search}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.careers.searchPlaceholder}
            className="w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold">{t.careers.sector}</span>
          <select
            value={sector}
            onChange={(event) => setSector(event.target.value)}
            className="w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm"
          >
            <option value="">{t.careers.allSectors}</option>
            {sectors.map((row) => (
              <option key={row.id} value={row.id}>
                {locale === "ar" ? row.name_ar : row.name_en}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold">{t.careers.demand}</span>
          <select
            value={demand}
            onChange={(event) => setDemand(event.target.value as Demand | "")}
            className="w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm"
          >
            <option value="">{t.careers.allDemand}</option>
            <option value="very_high">{t.common.veryHigh}</option>
            <option value="high">{t.common.high}</option>
            <option value="moderate">{t.common.moderate}</option>
          </select>
        </label>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm muted" aria-live="polite">
          {careers === null
            ? t.common.loading
            : `${localiseDigits(filtered.length, locale)} ${t.careers.resultsCount}`}
        </p>
        {hasFilters && (
          <button
            type="button"
            className="btn btn-ghost text-sm"
            onClick={() => {
              setQuery("");
              setSector("");
              setDemand("");
            }}
          >
            {t.careers.clearFilters}
          </button>
        )}
      </div>

      {careers === null ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-72" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-6">
          <EmptyState message={t.careers.noResults} />
        </div>
      ) : (
        <motion.div
          variants={revealContainer(0.04)}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((career) => (
              <CareerCard
                key={career.id}
                career={career}
                sector={sectorsById.get(career.sector)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

/**
 * useSearchParams opts a route out of static prerendering unless it is inside a
 * Suspense boundary, and the export fails outright without one.
 */
export default function CareersPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-16" />}>
      <CareersView />
    </Suspense>
  );
}
