"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";

import CareerArt from "@/components/art/CareerArt";
import MatchRing from "@/components/MatchRing";
import { indexBy, loadCareerIndex } from "@/lib/data/client";
import { useLocale } from "@/lib/locale-context";
import { loadModel, recommend } from "@/lib/ml/inference";
import { popIn, spring } from "@/lib/motion";
import type { CareerSummary } from "@/lib/types";

/**
 * A three-question taste of the real thing.
 *
 * This runs the actual model — the same bundle, the same blend, the same code
 * path as /results — on a profile built from three answers and neutral defaults
 * for everything else. It is not a mock or a lookup table, which is why the
 * result is worth showing and why the copy is careful to call it a taste rather
 * than a recommendation: three answers is not an assessment, and the CTA says
 * so.
 *
 * Each question moves one RIASEC dimension pair, so the three answers actually
 * separate the sectors rather than nudging a single axis.
 */

const QUESTIONS = [
  { id: "q1", up: "I", down: "S" },
  { id: "q2", up: "R", down: "A" },
  { id: "q3", up: "E", down: "C" },
] as const;

export default function MiniDemo() {
  const { locale, t } = useLocale();
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [result, setResult] = useState<{ career: CareerSummary; match: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const answer = async (agree: boolean) => {
    const question = QUESTIONS[step];
    const next = {
      ...scores,
      [question.up]: agree ? 85 : 35,
      [question.down]: agree ? 40 : 80,
    };
    setScores(next);

    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
      return;
    }

    setBusy(true);
    try {
      const [bundle, index] = await Promise.all([loadModel(), loadCareerIndex()]);
      const top = recommend(
        {
          riasec: { R: 50, I: 50, A: 50, S: 50, E: 50, C: 50, ...next },
          bigfive: { O: 60, C: 60, E: 50, A: 55, N: 45 },
          grades: {},
          emsat: {},
          track: "advanced",
          emirate: "abu_dhabi",
        },
        bundle,
        1,
      ).recommendations[0];
      const career = indexBy(index).get(top.careerId);
      if (career) setResult({ career, match: top.match });
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setStep(0);
    setScores({});
    setResult(null);
  };

  return (
    <div className="card relative overflow-hidden p-6 sm:p-8">
      <AnimatePresence mode="wait">
        {result ? (
          <motion.div key="result" variants={popIn} initial="hidden" animate="show">
            <p className="text-xs font-semibold uppercase tracking-wide muted">
              {t.landing.demoResult}
            </p>
            <div className="mt-4 flex items-center gap-4">
              <div className="h-20 w-32 shrink-0 overflow-hidden rounded-lg">
                <CareerArt
                  sector={result.career.sector}
                  seed={result.career.id}
                  className="h-full w-full"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-black">{result.career.title[locale]}</h3>
                <p className="mt-1 line-clamp-2 text-sm muted">
                  {result.career.shortDescription[locale]}
                </p>
              </div>
              <MatchRing value={result.match} size={56} />
            </div>

            <p className="mt-4 text-xs muted">{t.landing.demoNote}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/${locale}/assessment`} className="btn btn-primary text-sm">
                {t.landing.ctaPrimary}
              </Link>
              <button type="button" onClick={reset} className="btn btn-ghost text-sm">
                {t.landing.demoAgain}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div key={step} variants={popIn} initial="hidden" animate="show" exit={{ opacity: 0 }}>
            <div className="flex items-center gap-1.5">
              {QUESTIONS.map((question, index) => (
                <span
                  key={question.id}
                  aria-hidden
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    index <= step ? "bg-[var(--brand)]" : "bg-[var(--surface-3)]"
                  }`}
                />
              ))}
            </div>

            <p className="mt-5 text-lg font-semibold leading-relaxed">
              {t.landing.demoQuestions[step]}
            </p>

            <div className="mt-5 flex gap-2">
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                transition={spring}
                disabled={busy}
                onClick={() => void answer(true)}
                className="btn btn-primary flex-1"
              >
                {t.landing.demoYes}
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                transition={spring}
                disabled={busy}
                onClick={() => void answer(false)}
                className="btn btn-ghost flex-1"
              >
                {t.landing.demoNo}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
