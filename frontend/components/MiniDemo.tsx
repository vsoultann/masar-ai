"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";

import CareerArt from "@/components/art/CareerArt";
import MatchRing from "@/components/MatchRing";
import { ResistanceBadge } from "@/components/ui";
import { indexBy, loadCareerIndex, loadMajors } from "@/lib/data/client";
import { localiseDigits } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import { loadModel, recommend } from "@/lib/ml/inference";
import { popIn, spring } from "@/lib/motion";
import {
  applyAnswer, DEEP_SURVEY, emptyScores, QUICK_SURVEY, toStudentProfile,
  type SurveyScores,
} from "@/lib/survey";
import type { CareerSummary, Major } from "@/lib/types";

/**
 * The landing-page surveys, as a component.
 *
 * The dimensions each question moves live in `lib/survey.ts` and the question
 * text lives in the dictionaries; this file is the flow between them — pick a
 * length, answer, see the result.
 *
 * Both lengths run the real model: the same bundle, the same blend, the same
 * code path as /results. That is the whole reason this is on the landing page,
 * and it is also why the copy under the result is careful — ten answers is a
 * conversation starter, not an assessment, and the note says so in those words.
 *
 * The questions are written about *choosing* — a major, a commitment, what you
 * would keep if a machine took the rest — rather than about liking school
 * subjects. A student who has decided they "like physics" has not decided
 * anything; a student who knows whether they would rather carry a decision or
 * follow a correct procedure has.
 */

type Variant = "quick" | "deep";

interface Outcome {
  career: CareerSummary;
  match: number;
  majors: Major[];
}

export default function MiniDemo() {
  const { locale, t } = useLocale();

  const [variant, setVariant] = useState<Variant | null>(null);
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState<SurveyScores>(emptyScores);
  const [results, setResults] = useState<Outcome[] | null>(null);
  const [busy, setBusy] = useState(false);

  const questions = variant === "deep" ? DEEP_SURVEY : QUICK_SURVEY;
  const prompts = variant === "deep" ? t.survey.deep : t.survey.quick;

  const answer = async (agree: boolean) => {
    const next = applyAnswer(scores, questions[step], agree);
    setScores(next);

    if (step < questions.length - 1) {
      setStep(step + 1);
      return;
    }

    setBusy(true);
    try {
      const [bundle, index, majorRows] = await Promise.all([
        loadModel(),
        loadCareerIndex(),
        loadMajors(),
      ]);
      const ranked = recommend(
        toStudentProfile(next),
        bundle,
        variant === "deep" ? 3 : 1,
      ).recommendations;

      const careersById = indexBy(index);
      const majorsById = indexBy(majorRows);
      const outcomes = ranked
        .map((row) => {
          const career = careersById.get(row.careerId);
          if (!career) return null;
          return {
            career,
            match: row.match,
            majors: career.majors
              .slice(0, 3)
              .map((id) => majorsById.get(id))
              .filter((major): major is Major => major !== undefined),
          };
        })
        .filter((row): row is Outcome => row !== null);

      if (outcomes.length > 0) setResults(outcomes);
    } finally {
      setBusy(false);
    }
  };

  const restart = (next: Variant | null) => {
    setVariant(next);
    setStep(0);
    setScores(emptyScores());
    setResults(null);
  };

  /* ------------------------------------------------------------ the picker */
  if (!variant) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {(
          [
            {
              id: "quick" as const,
              title: t.landing.demoQuick,
              blurb: t.landing.demoQuickBlurb,
              count: QUICK_SURVEY.length,
              time: t.landing.demoQuickTime,
            },
            {
              id: "deep" as const,
              title: t.landing.demoDeep,
              blurb: t.landing.demoDeepBlurb,
              count: DEEP_SURVEY.length,
              time: t.landing.demoDeepTime,
            },
          ]
        ).map((option) => (
          <motion.button
            key={option.id}
            type="button"
            whileTap={{ scale: 0.98 }}
            transition={spring}
            onClick={() => restart(option.id)}
            className="card p-5 text-start transition-colors hover:border-[var(--brand)]"
          >
            <p className="eyebrow">{option.time}</p>
            <p className="display mt-1 text-3xl font-black text-gradient ltr-nums">
              {localiseDigits(option.count, locale)}
            </p>
            <h3 className="mt-1 text-base font-bold">{option.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed muted">{option.blurb}</p>
            <span className="btn btn-primary mt-4 w-full text-sm">{t.landing.demoStart}</span>
          </motion.button>
        ))}
      </div>
    );
  }

  /* ------------------------------------------------------------ the result */
  if (results) {
    const deep = variant === "deep";
    return (
      <motion.div variants={popIn} initial="hidden" animate="show" className="card p-6 sm:p-8">
        <p className="eyebrow">{deep ? t.landing.demoResultDeep : t.landing.demoResult}</p>

        <ul className="mt-4 space-y-4">
          {results.map((outcome) => (
            <li key={outcome.career.id} className="flex items-start gap-4">
              <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg">
                <CareerArt
                  sector={outcome.career.sector}
                  seed={outcome.career.id}
                  className="h-full w-full"
                />
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/${locale}/careers/${outcome.career.id}`}
                  className="text-base font-black hover:text-[var(--brand)]"
                >
                  {outcome.career.title[locale]}
                </Link>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <ResistanceBadge
                    value={outcome.career.aiResistance.score}
                    band={outcome.career.aiResistance.band}
                  />
                </div>
                {deep && outcome.majors.length > 0 && (
                  <p className="mt-1.5 text-xs leading-relaxed muted">
                    <span className="font-semibold">{t.landing.demoMajors}:</span>{" "}
                    {outcome.majors.map((major) => major.name[locale]).join("، ")}
                  </p>
                )}
              </div>
              <MatchRing value={outcome.match} size={52} />
            </li>
          ))}
        </ul>

        <p className="mt-5 text-xs leading-relaxed muted">
          {deep ? t.landing.demoNoteDeep : t.landing.demoNote}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/${locale}/assessment`} className="btn btn-primary text-sm">
            {t.landing.ctaPrimary}
          </Link>
          <button
            type="button"
            onClick={() => restart(variant)}
            className="btn btn-ghost text-sm"
          >
            {t.landing.demoAgain}
          </button>
          <button
            type="button"
            onClick={() => restart(null)}
            className="btn btn-ghost text-sm"
          >
            {t.landing.demoSwitch}
          </button>
        </div>
      </motion.div>
    );
  }

  /* ----------------------------------------------------------- a question */
  /*
   * No AnimatePresence around the question.
   *
   * An exit animation keeps the outgoing question mounted while the incoming
   * one renders, which puts two identical "That's me" buttons in the accessible
   * tree at once — and the one a screen reader or a test reaches first is the
   * stale one, whose handler still answers the previous question. Keying a
   * plain motion.div on `step` remounts and animates the new question in with
   * no overlap at all.
   */
  return (
    <div className="card relative overflow-hidden p-6 sm:p-8">
      <div>
        <motion.div key={step} variants={popIn} initial="hidden" animate="show">
          <div className="flex items-center justify-between gap-3">
            <p className="eyebrow">
              {t.landing.demoQuestionOf} {localiseDigits(step + 1, locale)}{" "}
              {t.common.of} {localiseDigits(questions.length, locale)}
            </p>
            <button
              type="button"
              onClick={() => restart(null)}
              className="text-xs muted underline underline-offset-2 hover:text-[var(--ink)]"
            >
              {t.landing.demoSwitch}
            </button>
          </div>

          <div className="mt-3 flex items-center gap-1.5">
            {questions.map((question, index) => (
              <span
                key={question.id}
                aria-hidden
                className={`h-1 flex-1 rounded-full transition-colors ${
                  index <= step ? "bg-[var(--brand)]" : "bg-[var(--surface-3)]"
                }`}
              />
            ))}
          </div>

          <p className="mt-5 text-lg font-semibold leading-relaxed">{prompts[step]}</p>

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
      </div>
    </div>
  );
}
