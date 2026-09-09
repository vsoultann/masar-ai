"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import SmartImage from "@/components/SmartImage";
import { Chip } from "@/components/ui";
import { localiseDigits } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import { cardHover } from "@/lib/motion";
import type { Eligibility, UniversityMatch } from "@/lib/matching/universities";
import type { University } from "@/lib/types";

/**
 * One institution, either as a match for a career or as a plain catalog entry.
 *
 * The eligibility chip is phrased as guidance, never as a rejection: the
 * thresholds behind it are indicative and the student's grades are not final.
 * "Below the indicative bar" is as strong as the wording gets, and it is
 * always shown next to the caveat.
 */
export default function UniversityCard({
  match,
  university,
  action,
}: {
  match?: UniversityMatch;
  university?: University;
  action?: React.ReactNode;
}) {
  const { locale, t, lookup } = useLocale();
  const institution = match?.university ?? university;
  if (!institution) return null;

  const eligibilityLabel: Record<Eligibility, string> = {
    likely_eligible: t.universities.eligibleLikely,
    borderline: t.universities.eligibleBorderline,
    below_indicative: t.universities.eligibleBelow,
  };
  const eligibilityTone: Record<Eligibility, "brand" | "neutral" | "warn"> = {
    likely_eligible: "brand",
    borderline: "neutral",
    below_indicative: "warn",
  };

  return (
    <motion.article {...cardHover} className="card flex h-full flex-col overflow-hidden">
      <Link href={`/${locale}/universities/${institution.id}`} className="block">
        <SmartImage
          src={institution.media.thumbnail}
          alt={institution.name[locale]}
          seed={institution.id}
          aspect="16 / 9"
          rounded={false}
        />
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/${locale}/universities/${institution.id}`} className="min-w-0">
            <h3 className="text-sm font-bold leading-snug">{institution.name[locale]}</h3>
            <p className="mt-0.5 text-xs muted">
              {lookup(t.universities.typeLabels, institution.type)}
            </p>
          </Link>
          {match?.distanceKm !== null && match?.distanceKm !== undefined && (
            <span className="shrink-0 text-xs font-semibold muted ltr-nums">
              {localiseDigits(Math.round(match.distanceKm), locale)} {t.universities.distanceAway}
            </span>
          )}
        </div>

        {match && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Chip tone={eligibilityTone[match.eligibility]}>
              {eligibilityLabel[match.eligibility]}
            </Chip>
            <Chip>
              {localiseDigits(match.matchedMajors.length, locale)} {t.universities.majorsMatched}
            </Chip>
          </div>
        )}

        <div className="mt-auto flex items-center gap-2 pt-4">
          <Link
            href={`/${locale}/universities/${institution.id}`}
            className="btn btn-ghost text-xs"
          >
            {t.universities.viewDetails}
          </Link>
          {action}
        </div>
      </div>
    </motion.article>
  );
}
