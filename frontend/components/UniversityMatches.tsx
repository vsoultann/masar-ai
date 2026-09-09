"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

import UniversityCard from "@/components/UniversityCard";
import { EmptyState, Skeleton } from "@/components/ui";
import { loadUniversities } from "@/lib/data/client";
import {
  groupMatches, matchUniversities, type UniversityMatch,
} from "@/lib/matching/universities";
import { useLocale } from "@/lib/locale-context";
import { revealContainer, revealItem, viewportOnce } from "@/lib/motion";
import { useProfile } from "@/lib/store/profile";
import type { Career } from "@/lib/types";

/**
 * "Where to study this" for one career.
 *
 * Works without a profile: with no location the matches simply come back
 * ungrouped by distance rather than empty, because a visitor browsing the
 * catalog before doing the assessment still deserves an answer.
 */
export default function UniversityMatches({
  career,
  limit = 6,
}: {
  career: Career;
  limit?: number;
}) {
  const { locale, t } = useLocale();
  const profile = useProfile((state) => state.profile);
  const [matches, setMatches] = useState<UniversityMatch[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadUniversities()
      .then((universities) => {
        if (!cancelled) setMatches(matchUniversities(career, universities, profile));
      })
      .catch(() => {
        if (!cancelled) setMatches([]);
      });
    return () => {
      cancelled = true;
    };
  }, [career, profile]);

  if (matches === null) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-40" />)}
      </div>
    );
  }

  if (matches.length === 0) {
    return <EmptyState message={t.universities.noResults} />;
  }

  const hasLocation = matches.some((match) => match.distanceKm !== null);
  const grouped = hasLocation ? groupMatches(matches) : [{ group: "elsewhere" as const, matches }];
  const groupLabel: Record<UniversityMatch["group"], string> = {
    in_area: t.universities.inYourArea,
    same_emirate: t.universities.sameEmirate,
    elsewhere: t.universities.elsewhere,
  };

  let shown = 0;

  return (
    <div className="space-y-6">
      {!hasLocation && <p className="text-sm muted">{t.universities.noLocation}</p>}

      {grouped.map((bucket) => {
        if (shown >= limit) return null;
        const visible = bucket.matches.slice(0, limit - shown);
        shown += visible.length;
        return (
          <div key={bucket.group}>
            {hasLocation && (
              <h3 className="mb-3 text-sm font-semibold">{groupLabel[bucket.group]}</h3>
            )}
            <motion.div
              variants={revealContainer(0.05)}
              initial="hidden"
              whileInView="show"
              viewport={viewportOnce}
              className="grid gap-3 sm:grid-cols-2"
            >
              {visible.map((match) => (
                <motion.div key={match.university.id} variants={revealItem}>
                  <UniversityCard match={match} />
                </motion.div>
              ))}
            </motion.div>
          </div>
        );
      })}

      <p className="text-xs muted">{t.universities.indicativeWarning}</p>

      <Link href={`/${locale}/universities`} className="btn btn-ghost text-sm">
        {t.universities.title}
      </Link>
    </div>
  );
}
