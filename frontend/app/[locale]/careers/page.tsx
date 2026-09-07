"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import CareerCard from "@/components/CareerCard";
import { EmptyState, ErrorBox, Loading, SectionHeading } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { localiseDigits } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import type { Career, Sector } from "@/lib/types";

function CareersExplorer() {
  const { locale, t, pick } = useLocale();
  const searchParams = useSearchParams();

  const [careers, setCareers] = useState<Career[] | null>(null);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [sector, setSector] = useState(searchParams.get("sector") ?? "");
  const [demand, setDemand] = useState("");

  useEffect(() => {
    api
      .get<{ sectors: Sector[] }>("/api/sectors", false)
      .then((body) => setSectors(body.sectors))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    api
      .get<{ careers: Career[] }>("/api/careers?limit=200", false)
      .then((body) => {
        if (!cancelled) setCareers(body.careers);
      })
      .catch((caught) => {
        if (cancelled) return;
        setError(caught instanceof ApiError ? caught.localised(locale) : t.common.error);
        setCareers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [locale, t.common.error]);

  const sectorNames = useMemo(
    () => Object.fromEntries(sectors.map((entry) => [entry.id, entry])),
    [sectors],
  );

  // Filtering runs in the browser: the whole catalog is 60 rows, so a round
  // trip per keystroke would be slower and would make the Arabic search feel
  // laggy for no benefit.
  const filtered = useMemo(() => {
    if (!careers) return [];
    const needle = query.trim().toLowerCase();
    return careers.filter((career) => {
      if (sector && career.sector !== sector) return false;
      if (demand && career.demand !== demand) return false;
      if (!needle) return true;
      return (
        career.title_en.toLowerCase().includes(needle) ||
        career.title_ar.includes(query.trim()) ||
        career.description_en.toLowerCase().includes(needle) ||
        career.description_ar.includes(query.trim())
      );
    });
  }, [careers, query, sector, demand]);

  const hasFilters = Boolean(query || sector || demand);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <SectionHeading title={t.careers.title} subtitle={t.careers.subtitle} />

      <div className="card mb-6 grid gap-3 p-4 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <label htmlFor="career-search" className="mb-1 block text-xs font-medium">
            {t.careers.search}
          </label>
          <input
            id="career-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.careers.searchPlaceholder}
            className="field"
          />
        </div>
        <div>
          <label htmlFor="career-sector" className="mb-1 block text-xs font-medium">
            {t.careers.sector}
          </label>
          <select
            id="career-sector"
            value={sector}
            onChange={(event) => setSector(event.target.value)}
            className="field"
          >
            <option value="">{t.careers.allSectors}</option>
            {sectors.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {pick(entry, "name")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="career-demand" className="mb-1 block text-xs font-medium">
            {t.careers.demand}
          </label>
          <select
            id="career-demand"
            value={demand}
            onChange={(event) => setDemand(event.target.value)}
            className="field"
          >
            <option value="">{t.careers.allDemand}</option>
            <option value="very_high">{t.common.veryHigh}</option>
            <option value="high">{t.common.high}</option>
            <option value="moderate">{t.common.moderate}</option>
          </select>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <p aria-live="polite" className="text-sm muted ltr-nums">
          {localiseDigits(filtered.length, locale)} {t.careers.resultsCount}
        </p>
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setSector("");
              setDemand("");
            }}
            className="btn btn-ghost !py-1.5 text-sm"
          >
            {t.careers.clearFilters}
          </button>
        )}
      </div>

      {error && <ErrorBox message={error} />}
      {careers === null && !error && <Loading />}
      {careers !== null && filtered.length === 0 && !error && (
        <EmptyState message={t.careers.noResults} />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((career) => (
          <CareerCard
            key={career.id}
            career={career}
            sectorName={
              sectorNames[career.sector] ? pick(sectorNames[career.sector], "name") : undefined
            }
            sectorColor={sectorNames[career.sector]?.color}
          />
        ))}
      </div>
    </div>
  );
}

export default function CareersPage() {
  // useSearchParams needs a Suspense boundary in the App Router.
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-10 sm:px-6" />}>
      <CareersExplorer />
    </Suspense>
  );
}
