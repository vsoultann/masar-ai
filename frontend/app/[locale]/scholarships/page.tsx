"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import ScholarshipCard from "@/components/ScholarshipCard";
import { EmptyState, ErrorBox, SectionHeading, Skeleton } from "@/components/ui";
import { indexBy, loadCareerIndex, loadMajors, loadScholarships } from "@/lib/data/client";
import { localiseDigits } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import { revealContainer } from "@/lib/motion";
import { useProfile } from "@/lib/store/profile";
import type { CareerSummary, Major, Scholarship } from "@/lib/types";

/**
 * Scholarships and funding.
 *
 * The page exists because "how do I pay for this" was the one question the app
 * had no answer to at all — it would recommend a student a career, name the
 * universities that teach it, and stop exactly where the real obstacle starts.
 *
 * Two things shape the layout:
 *
 *  1. **Sorted around the student when there is one.** With a completed
 *     profile the list leads with programmes scoped to their emirate, their
 *     MOE track and the majors behind their recommended careers. Without one it
 *     leads with the widest coverage, because for a visitor with no profile the
 *     most useful record is the one most people are eligible for.
 *
 *  2. **The three-mistakes block sits above the grid, not below it.** It is the
 *     part of this page most likely to change what a student actually does —
 *     need-based funds go unclaimed because students assume they will not
 *     qualify — and nobody scrolls past 37 cards to read advice.
 */
export default function ScholarshipsPage() {
  const { locale, t } = useLocale();
  const profile = useProfile((state) => state.profile);

  const [scholarships, setScholarships] = useState<Scholarship[] | null>(null);
  const [majors, setMajors] = useState<Map<string, Major>>(new Map());
  const [careers, setCareers] = useState<CareerSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("");
  const [coverage, setCoverage] = useState("");
  const [audience, setAudience] = useState("");
  const [level, setLevel] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadScholarships(), loadMajors(), loadCareerIndex()])
      .then(([rows, majorRows, careerRows]) => {
        if (cancelled) return;
        setScholarships(rows);
        setMajors(indexBy(majorRows));
        setCareers(careerRows);
      })
      .catch(() => {
        if (!cancelled) setError(t.common.error);
      });
    return () => {
      cancelled = true;
    };
  }, [t.common.error]);

  const COVERAGE_ORDER = useMemo(
    () => ({
      full_plus_stipend: 5,
      free_for_nationals: 4,
      full_tuition: 3,
      sponsored_with_bond: 2,
      partial_tuition: 1,
    }),
    [],
  );

  const filtered = useMemo(() => {
    if (!scholarships) return [];
    const needle = query.trim().toLowerCase();

    const matched = scholarships.filter((row) => {
      if (kind && row.kind !== kind) return false;
      if (coverage && row.coverage !== coverage) return false;
      if (audience && row.audience !== audience) return false;
      if (level && !row.levels.includes(level as "undergraduate" | "postgraduate")) return false;
      if (!needle) return true;
      // Both languages, and the field ids too, so "nursing" finds the health
      // workforce programme even though the word is not in its description.
      return (
        row.name.en.toLowerCase().includes(needle)
        || row.name.ar.includes(needle)
        || row.provider.en.toLowerCase().includes(needle)
        || row.provider.ar.includes(needle)
        || row.about.en.toLowerCase().includes(needle)
        || row.about.ar.includes(needle)
        || row.fields.some((field) => field.includes(needle.replace(/\s+/g, "_")))
      );
    });

    // A profile turns the ordering from "widest first" into "yours first".
    // The link from a student to a funding programme runs through majors:
    // saved career -> the majors that lead to it -> the programmes that fund
    // those majors. Nothing else in the profile says anything about funding.
    const careersById = indexBy(careers);
    const savedMajors = new Set(
      (profile?.savedCareers ?? []).flatMap(
        (id) => careersById.get(id)?.majors ?? [],
      ),
    );
    const score = (row: Scholarship) => {
      let value = COVERAGE_ORDER[row.coverage] ?? 0;
      if (profile?.emirate && row.emirate === profile.emirate) value += 6;
      if (row.emirate === "all") value += 3;
      if (profile?.track && row.eligibility.trackRequired.includes(profile.track)) value += 4;
      if (row.fields.some((field) => savedMajors.has(field))) value += 8;
      return value;
    };
    return [...matched].sort((a, b) => score(b) - score(a));
  }, [scholarships, query, kind, coverage, audience, level, profile, careers, COVERAGE_ORDER]);

  const hasFilters = Boolean(query || kind || coverage || audience || level);

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
        <p className="eyebrow">{t.nav.scholarships}</p>
        <h1 className="text-gradient mt-1 text-2xl font-black sm:text-3xl">
          {t.scholarships.title}
        </h1>
        <p className="mt-2 max-w-2xl leading-relaxed muted">{t.scholarships.subtitle}</p>
      </header>

      {/* --- the part that changes behaviour -------------------------------- */}
      <section className="mt-8">
        <SectionHeading title={t.scholarships.howToTitle} />
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { title: t.scholarships.howTo1Title, body: t.scholarships.howTo1Body },
            { title: t.scholarships.howTo2Title, body: t.scholarships.howTo2Body },
            { title: t.scholarships.howTo3Title, body: t.scholarships.howTo3Body },
          ].map((item, index) => (
            <div key={item.title} className="card p-4">
              <p className="display text-2xl font-black text-gradient ltr-nums">
                {localiseDigits(index + 1, locale)}
              </p>
              <h3 className="mt-1 text-sm font-bold">{item.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed muted">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-6 text-xs leading-relaxed muted">
        {profile ? t.scholarships.matchBody : t.scholarships.matchNoProfile}
        {!profile && (
          <>
            {" "}
            <Link href={`/${locale}/assessment`} className="text-[var(--brand)] underline">
              {t.landing.ctaPrimary}
            </Link>
          </>
        )}
      </p>

      {/* --- filters --------------------------------------------------------- */}
      <div className="card mt-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold">{t.scholarships.search}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.scholarships.searchPlaceholder}
            className="w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold">{t.scholarships.provider}</span>
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value)}
            className="w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm"
          >
            <option value="">{t.scholarships.allKinds}</option>
            <option value="government">{t.scholarships.kindGovernment}</option>
            <option value="university">{t.scholarships.kindUniversity}</option>
            <option value="employer">{t.scholarships.kindEmployer}</option>
            <option value="sector">{t.scholarships.kindSector}</option>
            <option value="foundation">{t.scholarships.kindFoundation}</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold">{t.scholarships.covers}</span>
          <select
            value={coverage}
            onChange={(event) => setCoverage(event.target.value)}
            className="w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm"
          >
            <option value="">{t.scholarships.allCoverage}</option>
            <option value="full_plus_stipend">{t.scholarships.coverageFullPlusStipend}</option>
            <option value="full_tuition">{t.scholarships.coverageFullTuition}</option>
            <option value="free_for_nationals">{t.scholarships.coverageFreeForNationals}</option>
            <option value="sponsored_with_bond">
              {t.scholarships.coverageSponsoredWithBond}
            </option>
            <option value="partial_tuition">{t.scholarships.coveragePartialTuition}</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold">{t.scholarships.openTo}</span>
          <select
            value={audience}
            onChange={(event) => setAudience(event.target.value)}
            className="w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm"
          >
            <option value="">{t.scholarships.allAudiences}</option>
            <option value="uae_nationals">{t.scholarships.audienceUaeNationals}</option>
            <option value="all">{t.scholarships.audienceAll}</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold">{t.common.level}</span>
          <select
            value={level}
            onChange={(event) => setLevel(event.target.value)}
            className="w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm"
          >
            <option value="">{t.scholarships.allLevels}</option>
            <option value="undergraduate">{t.scholarships.levelUndergraduate}</option>
            <option value="postgraduate">{t.scholarships.levelPostgraduate}</option>
          </select>
        </label>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm muted" aria-live="polite">
          {scholarships === null
            ? t.common.loading
            : t.scholarships.resultsCount.replace(
              "{count}",
              localiseDigits(filtered.length, locale),
            )}
        </p>
        {hasFilters && (
          <button
            type="button"
            className="btn btn-ghost text-sm"
            onClick={() => {
              setQuery("");
              setKind("");
              setCoverage("");
              setAudience("");
              setLevel("");
            }}
          >
            {t.careers.clearFilters}
          </button>
        )}
      </div>

      {scholarships === null ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-72" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-6">
          <EmptyState message={t.scholarships.noResults} />
        </div>
      ) : (
        <motion.div
          key={`${kind}|${coverage}|${audience}|${level}|${query}`}
          variants={revealContainer(0.03)}
          initial="hidden"
          animate="show"
          className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {filtered.map((scholarship) => (
            <ScholarshipCard
              key={scholarship.id}
              scholarship={scholarship}
              majors={majors}
            />
          ))}
        </motion.div>
      )}

      <p className="mt-8 text-xs leading-relaxed muted">{t.scholarships.indicativeWarning}</p>
    </div>
  );
}
