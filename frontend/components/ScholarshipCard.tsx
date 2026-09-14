"use client";

import { motion } from "framer-motion";
import { useState } from "react";

import { Chip } from "@/components/ui";
import { localiseDigits } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import { cardHover, revealItem } from "@/lib/motion";
import type { Scholarship } from "@/lib/types";

/**
 * One funding route.
 *
 * The obligation is not collapsed into the coverage chip and never will be. A
 * programme that pays for everything and commits four years of your life after
 * graduation is a genuinely good option for some students and a bad one for
 * others, and the only way to get that decision wrong for everyone is to
 * display it as "full tuition" and leave the rest to the small print.
 */
export default function ScholarshipCard({
  scholarship,
  majors,
}: {
  scholarship: Scholarship;
  majors: Map<string, { name: { en: string; ar: string } }>;
}) {
  const { locale, t, lookup } = useLocale();
  const [open, setOpen] = useState(false);

  const coverage = lookup(
    {
      full_plus_stipend: t.scholarships.coverageFullPlusStipend,
      full_tuition: t.scholarships.coverageFullTuition,
      free_for_nationals: t.scholarships.coverageFreeForNationals,
      partial_tuition: t.scholarships.coveragePartialTuition,
      sponsored_with_bond: t.scholarships.coverageSponsoredWithBond,
    },
    scholarship.coverage,
  );
  const kind = lookup(
    {
      government: t.scholarships.kindGovernment,
      university: t.scholarships.kindUniversity,
      employer: t.scholarships.kindEmployer,
      foundation: t.scholarships.kindFoundation,
      sector: t.scholarships.kindSector,
    },
    scholarship.kind,
  );
  const audience = lookup(
    {
      uae_nationals: t.scholarships.audienceUaeNationals,
      residents: t.scholarships.audienceResidents,
      all: t.scholarships.audienceAll,
    },
    scholarship.audience,
  );

  const minimum = scholarship.eligibility.minHighSchoolPercent;

  return (
    <motion.article variants={revealItem} {...cardHover} className="card flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">{kind}</p>
          <h3 className="mt-1 text-base font-bold leading-snug">{scholarship.name[locale]}</h3>
          <p className="mt-0.5 text-xs muted">{scholarship.provider[locale]}</p>
        </div>
        {/* The coverage band is the first thing a student scans for, so it
            gets the strongest colour on the card. */}
        <span className="shrink-0 rounded-full bg-[var(--brand)]/12 px-2.5 py-1 text-[11px] font-semibold text-[var(--brand)]">
          {coverage}
        </span>
      </div>

      <p className="mt-3 line-clamp-4 text-sm leading-relaxed muted">
        {scholarship.about[locale]}
      </p>

      <ul className="mt-3 flex flex-wrap gap-1.5">
        <li>
          <Chip tone="accent">{audience}</Chip>
        </li>
        <li>
          <Chip>
            {scholarship.emirate === "all"
              ? t.scholarships.emirateAll
              : lookup(t.emirates, scholarship.emirate)}
          </Chip>
        </li>
        {scholarship.levels.map((level) => (
          <li key={level}>
            <Chip>
              {level === "undergraduate"
                ? t.scholarships.levelUndergraduate
                : t.scholarships.levelPostgraduate}
            </Chip>
          </li>
        ))}
      </ul>

      {scholarship.obligation && (
        <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
          <span className="font-bold">{t.scholarships.obligation}:</span>{" "}
          {scholarship.obligation[locale]}
        </p>
      )}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="mt-3 flex items-center justify-between gap-2 text-start text-xs font-semibold text-[var(--brand)]"
      >
        {t.scholarships.eligibility}
        <span aria-hidden="true">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="mt-2 space-y-2 border-t pt-3 text-xs">
          <p className="flex justify-between gap-3">
            <span className="muted">{t.scholarships.minAverage}</span>
            <span className="font-semibold ltr-nums">
              {minimum === null
                ? t.scholarships.noThreshold
                : `${localiseDigits(minimum, locale)}%`}
            </span>
          </p>
          {scholarship.eligibility.trackRequired.length > 0 && (
            <p className="flex justify-between gap-3">
              <span className="muted">{t.scholarships.trackRequired}</span>
              <span className="font-semibold">
                {scholarship.eligibility.trackRequired
                  .map((track) => lookup(t.tracks, track))
                  .join("، ")}
              </span>
            </p>
          )}
          <div>
            <p className="mb-1 muted">{t.scholarships.fields}</p>
            <ul className="flex flex-wrap gap-1">
              {scholarship.fields.slice(0, 10).map((field) => (
                <li key={field}>
                  <Chip>{majors.get(field)?.name[locale] ?? field}</Chip>
                </li>
              ))}
            </ul>
          </div>
          <p className="leading-relaxed muted">{scholarship.eligibility.notes[locale]}</p>
        </div>
      )}

      <a
        href={scholarship.website}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-ghost mt-4 w-full text-sm"
      >
        {t.scholarships.officialSite}
      </a>
    </motion.article>
  );
}
