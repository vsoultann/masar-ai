"use client";

import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { Grid3x3, Map as MapIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import UniversityCard from "@/components/UniversityCard";
import { Chip, EmptyState, ErrorBox, Skeleton } from "@/components/ui";
import { loadMajors, loadUniversities } from "@/lib/data/client";
import { localiseDigits } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import { haversineKm, studentLocation } from "@/lib/matching/universities";
import { revealContainer, revealItem, spring } from "@/lib/motion";
import { useProfile } from "@/lib/store/profile";
import type { Major, University } from "@/lib/types";

// Leaflet touches `window` at module scope, so it can only be loaded in the
// browser — importing it during the static export would fail the build.
const UniversityMap = dynamic(() => import("@/components/UniversityMap"), {
  ssr: false,
  loading: () => <Skeleton className="h-[460px]" />,
});

const EMIRATES = [
  "abu_dhabi", "dubai", "sharjah", "ajman",
  "umm_al_quwain", "ras_al_khaimah", "fujairah",
] as const;
const TYPES = [
  "federal_public", "local_public", "private", "international_branch", "technical",
] as const;
const TUITION = ["free_for_nationals", "public_subsidised", "mid", "premium"] as const;

const MAX_COMPARE = 3;

export default function UniversitiesPage() {
  const { locale, t, lookup } = useLocale();
  const profile = useProfile((state) => state.profile);

  const [universities, setUniversities] = useState<University[] | null>(null);
  const [majors, setMajors] = useState<Major[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [emirate, setEmirate] = useState("");
  const [type, setType] = useState("");
  const [tuition, setTuition] = useState("");
  const [radius, setRadius] = useState(300);
  const [view, setView] = useState<"grid" | "map">("grid");
  const [compare, setCompare] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadUniversities(), loadMajors()])
      .then(([universityRows, majorRows]) => {
        if (cancelled) return;
        setUniversities(universityRows);
        setMajors(majorRows);
      })
      .catch(() => {
        if (!cancelled) setError(t.common.error);
      });
    return () => {
      cancelled = true;
    };
  }, [t.common.error]);

  const you = useMemo(() => studentLocation(profile), [profile]);
  const majorsById = useMemo(
    () => new Map(majors.map((major) => [major.id, major])),
    [majors],
  );

  const filtered = useMemo(() => {
    if (!universities) return [];
    const needle = query.trim().toLowerCase();
    return universities
      .map((university) => ({
        university,
        distanceKm: you ? haversineKm(you, university.coordinates) : null,
      }))
      .filter(({ university, distanceKm }) => {
        if (emirate && university.emirate !== emirate) return false;
        if (type && university.type !== type) return false;
        if (tuition && university.tuitionBand !== tuition) return false;
        if (you && distanceKm !== null && distanceKm > radius) return false;
        if (!needle) return true;
        return (
          university.name.en.toLowerCase().includes(needle)
          || university.name.ar.includes(needle)
          || university.shortName.en.toLowerCase().includes(needle)
          // Searching a subject is the common case: "where can I study medicine".
          || university.majorsOffered.some((id) => {
            const major = majorsById.get(id);
            return (
              major?.name.en.toLowerCase().includes(needle)
              || major?.name.ar.includes(needle)
            );
          })
        );
      })
      .sort((a, b) =>
        a.distanceKm !== null && b.distanceKm !== null
          ? a.distanceKm - b.distanceKm
          : a.university.name.en.localeCompare(b.university.name.en),
      );
  }, [universities, query, emirate, type, tuition, radius, you, majorsById]);

  const compared = useMemo(
    () => (universities ?? []).filter((university) => compare.includes(university.id)),
    [universities, compare],
  );

  const toggleCompare = (id: string) =>
    setCompare((current) =>
      current.includes(id)
        ? current.filter((entry) => entry !== id)
        : current.length >= MAX_COMPARE
          ? current
          : [...current, id],
    );

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <ErrorBox message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 pb-28 sm:px-6">
      <header>
        <h1 className="text-2xl font-black sm:text-3xl">{t.universities.title}</h1>
        <p className="mt-2 max-w-3xl muted">{t.universities.subtitle}</p>
      </header>

      <div className="card mt-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block lg:col-span-2">
          <span className="mb-1 block text-xs font-semibold">{t.universities.search}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.universities.searchPlaceholder}
            className="w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold">{t.wizard.emirate}</span>
          <select
            value={emirate}
            onChange={(event) => setEmirate(event.target.value)}
            className="w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm"
          >
            <option value="">{t.universities.allEmirates}</option>
            {EMIRATES.map((id) => (
              <option key={id} value={id}>{lookup(t.emirates, id)}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold">{t.universities.allTypes}</span>
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            className="w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm"
          >
            <option value="">{t.universities.allTypes}</option>
            {TYPES.map((id) => (
              <option key={id} value={id}>{lookup(t.universities.typeLabels, id)}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold">{t.universities.tuition}</span>
          <select
            value={tuition}
            onChange={(event) => setTuition(event.target.value)}
            className="w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm"
          >
            <option value="">{t.universities.allTuition}</option>
            {TUITION.map((id) => (
              <option key={id} value={id}>{lookup(t.universities.tuitionLabels, id)}</option>
            ))}
          </select>
        </label>

        {you && (
          <label className="block lg:col-span-2">
            <span className="mb-1 block text-xs font-semibold">
              {t.universities.distanceAway}: {localiseDigits(radius, locale)}
            </span>
            <input
              type="range"
              min={20}
              max={300}
              step={10}
              value={radius}
              onChange={(event) => setRadius(Number(event.target.value))}
              className="w-full accent-[var(--brand)]"
            />
          </label>
        )}

        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => setView("grid")}
            aria-pressed={view === "grid"}
            className={`btn text-sm ${view === "grid" ? "btn-primary" : "btn-ghost"}`}
          >
            <Grid3x3 size={15} aria-hidden className="me-1.5" />
            {t.universities.gridView}
          </button>
          <button
            type="button"
            onClick={() => setView("map")}
            aria-pressed={view === "map"}
            className={`btn text-sm ${view === "map" ? "btn-primary" : "btn-ghost"}`}
          >
            <MapIcon size={15} aria-hidden className="me-1.5" />
            {t.universities.mapView}
          </button>
        </div>
      </div>

      <p className="mt-4 text-sm muted" aria-live="polite">
        {universities === null
          ? t.common.loading
          : `${localiseDigits(filtered.length, locale)} ${t.universities.resultsCount}`}
      </p>

      {!you && <p className="mt-1 text-xs muted">{t.universities.noLocation}</p>}

      {universities === null ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-56" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-6">
          <EmptyState message={t.universities.noResults} />
        </div>
      ) : view === "map" ? (
        <div className="mt-4">
          <UniversityMap
            universities={filtered.map((row) => row.university)}
            you={you}
          />
        </div>
      ) : (
        <motion.div
          key={`${emirate}|${type}|${tuition}|${radius}|${query}`}
          variants={revealContainer(0.03)}
          initial="hidden"
          animate="show"
          className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {filtered.map(({ university }) => (
            <motion.div key={university.id} variants={revealItem}>
              <UniversityCard
                university={university}
                action={
                  <button
                    type="button"
                    onClick={() => toggleCompare(university.id)}
                    aria-pressed={compare.includes(university.id)}
                    disabled={!compare.includes(university.id) && compare.length >= MAX_COMPARE}
                    className="btn btn-ghost text-xs"
                  >
                    {t.universities.compare}
                  </button>
                }
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* --- compare tray -------------------------------------------------- */}
      <AnimatePresence>
        {compared.length > 0 && (
          <motion.aside
            initial={{ y: 90, opacity: 0 }}
            animate={{ y: 0, opacity: 1, transition: spring }}
            exit={{ y: 90, opacity: 0 }}
            className="pin-bottom fixed inset-x-0 bottom-0 z-30 border-t bg-[var(--surface-translucent)] backdrop-blur-xl"
          >
            <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
              <span className="text-xs font-semibold">
                {t.universities.compareTray} ({localiseDigits(compared.length, locale)}/
                {localiseDigits(MAX_COMPARE, locale)})
              </span>
              <div className="flex flex-1 flex-wrap gap-1.5">
                {compared.map((university) => (
                  <button
                    key={university.id}
                    type="button"
                    onClick={() => toggleCompare(university.id)}
                    title={t.common.close}
                  >
                    <Chip tone="brand">{university.shortName[locale]} ×</Chip>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setCompare([])}
                className="btn btn-ghost text-xs"
              >
                {t.universities.clearCompare}
              </button>
            </div>

            {compared.length >= 2 && (
              <div className="mx-auto max-w-6xl overflow-x-auto px-4 pb-4 sm:px-6">
                <table className="w-full min-w-[36rem] text-start text-xs">
                  <thead>
                    <tr className="text-start muted">
                      <th className="p-2 text-start font-semibold">—</th>
                      {compared.map((university) => (
                        <th key={university.id} className="p-2 text-start font-semibold">
                          {university.shortName[locale]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {([
                      [t.universities.minAverage, (u: University) =>
                        `${localiseDigits(u.admission.minHighSchoolPercent, locale)}%`],
                      [t.universities.tuition, (u: University) =>
                        lookup(t.universities.tuitionLabels, u.tuitionBand)],
                      [t.universities.allTypes, (u: University) =>
                        lookup(t.universities.typeLabels, u.type)],
                      [t.universities.established, (u: University) =>
                        localiseDigits(u.established, locale)],
                      [t.universities.allMajors, (u: University) =>
                        localiseDigits(u.majorsOffered.length, locale)],
                    ] as const).map(([label, render]) => (
                      <tr key={label} className="border-t">
                        <th className="p-2 text-start font-medium muted">{label}</th>
                        {compared.map((university) => (
                          <td key={university.id} className="p-2 ltr-nums">
                            {render(university)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
