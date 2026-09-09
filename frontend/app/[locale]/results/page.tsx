"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import CountUp from "@/components/CountUp";
import MatchRing from "@/components/MatchRing";
import { SectorDistribution } from "@/components/charts";
import { Chip, EmptyState, ErrorBox, SectionHeading } from "@/components/ui";
import { indexBy, loadCareerIndex, loadSectors } from "@/lib/data/client";
import { useLocale } from "@/lib/locale-context";
import { loadModel, recommend, type RecommendationResult } from "@/lib/ml/inference";
import { revealContainer, revealItem, spring } from "@/lib/motion";
import { isComplete, useProfile } from "@/lib/store/profile";
import type { CareerSummary, Sector } from "@/lib/types";

/**
 * The ranked results.
 *
 * Scoring happens in this browser, against the model bundle — see
 * lib/ml/inference.ts and the parity test that pins it to the Python pipeline.
 *
 * The "analysing" sequence names the four stages that genuinely run. It is
 * capped at ~2.6s and skippable, because a progress animation that outlasts the
 * work it describes is a lie told slowly.
 */

const STAGE_MS = 650;

export default function ResultsPage() {
  const { locale, t } = useLocale();
  const reduced = useReducedMotion();

  const profile = useProfile((state) => state.profile);
  const hydrated = useProfile((state) => state.hydrated);

  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [careers, setCareers] = useState<Map<string, CareerSummary>>(new Map());
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const stages = useMemo(
    () => [
      t.results.stepNormalise,
      t.results.stepMatch,
      t.results.stepGaps,
      t.results.stepUniversities,
    ],
    [t],
  );

  useEffect(() => {
    if (!hydrated || !profile || !isComplete(profile)) return;
    let cancelled = false;

    Promise.all([loadModel(), loadCareerIndex(), loadSectors()])
      .then(([bundle, careerRows, sectorRows]) => {
        if (cancelled) return;
        setCareers(indexBy(careerRows));
        setSectors(sectorRows);
        setResult(
          recommend(
            {
              grades: profile.grades,
              emsat: profile.emsat,
              riasec: profile.riasec,
              bigfive: profile.bigfive,
              track: profile.track,
              emirate: profile.emirate,
            },
            bundle,
            10,
          ),
        );
      })
      .catch(() => {
        if (!cancelled) setError(t.common.error);
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated, profile, t.common.error]);

  // Advance the stage labels. Reduced motion skips the sequence entirely
  // rather than showing it instantly, which would just flash.
  useEffect(() => {
    if (revealed) return;
    if (reduced) {
      setRevealed(true);
      return;
    }
    if (stage >= stages.length) {
      setRevealed(true);
      return;
    }
    const timer = window.setTimeout(() => setStage((current) => current + 1), STAGE_MS);
    return () => window.clearTimeout(timer);
  }, [stage, stages.length, revealed, reduced]);

  if (!hydrated) return <div className="mx-auto max-w-5xl px-4 py-16" />;

  if (!profile || !isComplete(profile)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <EmptyState message={t.results.noProfile} />
        <Link href={`/${locale}/assessment`} className="btn btn-primary mt-5">
          {t.results.startAssessment}
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <ErrorBox message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  const ready = result !== null && revealed;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <AnimatePresence mode="wait">
        {!ready ? (
          <motion.div
            key="analysing"
            exit={{ opacity: 0, y: -12 }}
            className="grid min-h-[50vh] place-items-center"
          >
            <div className="w-full max-w-sm text-center">
              <p className="text-lg font-bold">{t.results.analysing}</p>
              <ol className="mt-6 space-y-2 text-start">
                {stages.map((label, index) => (
                  <li
                    key={label}
                    className={`flex items-center gap-2 text-sm transition-opacity ${
                      index <= stage ? "opacity-100" : "opacity-40"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] ${
                        index < stage
                          ? "bg-[var(--brand)] text-[var(--brand-ink)]"
                          : "bg-[var(--surface-3)]"
                      }`}
                    >
                      {index < stage ? "✓" : index + 1}
                    </span>
                    {label}
                  </li>
                ))}
              </ol>
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className="btn btn-ghost mt-6 text-sm"
              >
                {t.results.skip}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <header>
              <h1 className="text-2xl font-black sm:text-3xl">{t.results.title}</h1>
              <p className="mt-2 muted">{t.results.subtitle}</p>
            </header>

            <motion.ol
              variants={revealContainer(0.08)}
              initial="hidden"
              animate="show"
              className="mt-6 space-y-3"
            >
              {result!.recommendations.map((item, index) => {
                const career = careers.get(item.careerId);
                if (!career) return null;
                return (
                  <motion.li key={item.careerId} variants={revealItem}>
                    <Link
                      href={`/${locale}/careers/${item.careerId}`}
                      className="card flex items-start gap-4 p-4 transition-shadow hover:shadow-md"
                    >
                      <MatchRing value={item.match} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {index === 0 && (
                            <motion.span
                              initial={{ scale: 0.7, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1, transition: spring }}
                            >
                              <Chip tone="brand">{t.results.topMatch}</Chip>
                            </motion.span>
                          )}
                          <h2 className="text-base font-bold">{career.title[locale]}</h2>
                          <Chip
                            tone={
                              item.confidence === "high"
                                ? "brand"
                                : item.confidence === "moderate"
                                  ? "neutral"
                                  : "warn"
                            }
                          >
                            {t.results.confidence}:{" "}
                            {item.confidence === "high"
                              ? t.results.confidenceHigh
                              : item.confidence === "moderate"
                                ? t.results.confidenceModerate
                                : t.results.confidenceLow}
                          </Chip>
                        </div>

                        <p className="mt-1 line-clamp-2 text-sm muted">
                          {career.shortDescription[locale]}
                        </p>

                        {item.reasons.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-semibold">{t.results.why}</p>
                            <ul className="mt-1 flex flex-wrap gap-1.5">
                              {item.reasons.map((reason) => (
                                <li key={reason.factor}>
                                  <Chip>{reason.label[locale]}</Chip>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </Link>
                  </motion.li>
                );
              })}
            </motion.ol>

            <p className="mt-3 text-xs muted">{t.results.confidenceNote}</p>

            <section className="mt-10">
              <SectionHeading title={t.results.sectorBreakdown} />
              <div className="card p-4">
                <SectorDistribution
                  data={Object.entries(result!.sectorProbabilities)
                    .slice(0, 8)
                    .map(([id, probability]) => {
                      const sector = sectors.find((row) => row.id === id);
                      return {
                        name: sector
                          ? locale === "ar"
                            ? sector.name_ar
                            : sector.name_en
                          : id,
                        value: Math.round(probability * 1000) / 10,
                        color: sector?.color ?? "var(--brand)",
                      };
                    })}
                />
              </div>
            </section>

            <div className="mt-8 flex flex-wrap gap-2">
              <Link href={`/${locale}/skills`} className="btn btn-primary">
                {t.skills.title}
              </Link>
              <Link href={`/${locale}/universities`} className="btn btn-ghost">
                {t.universities.title}
              </Link>
              <Link href={`/${locale}/assessment`} className="btn btn-ghost">
                {t.results.retake}
              </Link>
            </div>

            <p className="mt-6 text-xs muted">
              <CountUp value={careers.size} /> {t.careers.resultsCount} ·{" "}
              {t.model.parityNote}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
