"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

import { BAND_COLOR, Chip, ResistanceScale, Skeleton, useBandLabel } from "@/components/ui";
import { indexBy, loadCareerIndex, loadResistanceGlossary, loadSkills } from "@/lib/data/client";
import { localiseDigits } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import { revealContainer, revealItem } from "@/lib/motion";
import type { AiResistanceGlossary, Career, Skill } from "@/lib/types";

/**
 * The full AI-resistance readout on a career page.
 *
 * Three decisions worth stating, because they are what separates this from the
 * "will AI take your job? 73%!" widgets it resembles:
 *
 *  1. **The breakdown is shown, not summarised.** Every component that moved
 *     the score is listed with its signed contribution, and the rows add up to
 *     the number. A student who disagrees with the score can see exactly which
 *     assumption to disagree with.
 *
 *  2. **The scope of the claim is on screen, not in a footnote.** The panel
 *     says what the index measures and what it cannot, next to the number,
 *     every time. A number this quotable will be screenshotted without its
 *     context unless the context is inside the screenshot.
 *
 *  3. **A low score is never phrased as a warning.** Software engineering
 *     scores 36 here. That is a real fact about the shape of the work and it is
 *     worth knowing before choosing a major; it is not advice to avoid the
 *     field, and the copy does not let it read as one.
 */
export default function AiResistancePanel({ career }: { career: Career }) {
  const { locale, t } = useLocale();
  const bandLabel = useBandLabel();

  const [glossary, setGlossary] = useState<AiResistanceGlossary | null>(null);
  const [skills, setSkills] = useState<Map<string, Skill>>(new Map());
  const [percentile, setPercentile] = useState<number | null>(null);
  const [showMethod, setShowMethod] = useState(false);

  const resistance = career.aiResistance;

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadResistanceGlossary(), loadSkills(), loadCareerIndex()])
      .then(([glossaryRows, skillRows, index]) => {
        if (cancelled) return;
        setGlossary(glossaryRows);
        setSkills(indexBy(skillRows));
        // Where this career sits against the rest of the catalog. More useful
        // than the raw number: "68" means nothing until you know that most
        // careers here score below it.
        const below = index.filter(
          (row) => row.aiResistance.score < resistance.score,
        ).length;
        setPercentile(Math.round((below / index.length) * 100));
      })
      .catch(() => {
        if (!cancelled) setGlossary(null);
      });
    return () => {
      cancelled = true;
    };
  }, [resistance.score]);

  if (!glossary) return <Skeleton className="h-64" />;

  const color = BAND_COLOR[resistance.band];
  const band = glossary.bands[resistance.band];
  const skillName = (id: string) => {
    const skill = skills.get(id);
    return skill ? (locale === "ar" ? skill.name_ar : skill.name_en) : id;
  };

  return (
    <motion.div
      variants={revealContainer(0.06)}
      initial="hidden"
      animate="show"
      className="card overflow-hidden"
    >
      {/* --- the number ---------------------------------------------------- */}
      <motion.div
        variants={revealItem}
        className="border-b p-5"
        style={{ background: `color-mix(in oklab, ${color} 7%, transparent)` }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow">{t.resistance.title}</p>
            <p className="mt-1 flex items-baseline gap-2">
              <span
                className="display text-5xl font-black ltr-nums"
                style={{ color }}
              >
                {localiseDigits(resistance.score, locale)}
              </span>
              <span className="text-sm font-semibold muted">{t.resistance.scoreOf}</span>
            </p>
            <p className="mt-1 text-lg font-bold" style={{ color }}>
              {bandLabel(resistance.band)}
            </p>
          </div>
          <span className="rounded-full border px-2.5 py-1 text-[11px] font-semibold muted">
            {t.resistance.notForecast}
          </span>
        </div>

        <p className="mt-4 max-w-2xl leading-relaxed">{band.summary[locale]}</p>

        <div className="mt-5 max-w-xl">
          <ResistanceScale value={resistance.score} band={resistance.band} />
        </div>

        {percentile !== null && (
          <p className="mt-3 text-xs muted">
            {t.resistance.higherThan.replace("{percent}", String(percentile))}
          </p>
        )}
      </motion.div>

      {/* --- both sides of it ---------------------------------------------- */}
      <div className="grid gap-px bg-[var(--line)] sm:grid-cols-2">
        <motion.div variants={revealItem} className="bg-[var(--surface-2-translucent)] p-5">
          <h3 className="text-sm font-bold" style={{ color: "var(--band-exposed)" }}>
            {t.resistance.exposedTitle}
          </h3>
          <ul className="mt-3 space-y-2.5">
            {resistance.exposedGroups.map((group) => (
              <li key={group} className="flex gap-2.5 text-sm leading-relaxed">
                <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--band-exposed)]" />
                <span>{glossary.groups[group]?.exposed[locale]}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div variants={revealItem} className="bg-[var(--surface-2-translucent)] p-5">
          <h3 className="text-sm font-bold" style={{ color: "var(--band-anchored)" }}>
            {t.resistance.protectedTitle}
          </h3>
          <ul className="mt-3 space-y-2.5">
            {resistance.protectedGroups.map((group) => (
              <li key={group} className="flex gap-2.5 text-sm leading-relaxed">
                <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--band-anchored)]" />
                <span>{glossary.groups[group]?.protected[locale]}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>

      {/* --- what to do about it -------------------------------------------- */}
      <motion.div variants={revealItem} className="border-t p-5">
        <h3 className="text-sm font-bold">{t.resistance.hedgeTitle}</h3>
        <p className="mt-1.5 max-w-2xl text-xs leading-relaxed muted">
          {t.resistance.hedgeBody}
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {resistance.hedgeSkills.map((skill) => (
            <li key={skill}>
              <Chip tone="brand">{skillName(skill)}</Chip>
            </li>
          ))}
        </ul>
      </motion.div>

      {/* --- the audit trail ------------------------------------------------ */}
      <motion.div variants={revealItem} className="border-t p-5">
        <h3 className="text-sm font-bold">{t.resistance.driversTitle}</h3>
        <p className="mt-1.5 max-w-2xl text-xs leading-relaxed muted">
          {t.resistance.driversBody}
        </p>

        <ul className="mt-4 space-y-2">
          <li className="flex items-center gap-3 text-sm">
            <span className="w-44 shrink-0 truncate muted sm:w-56">
              {t.resistance.baseline}
            </span>
            <span className="flex-1" />
            <span className="w-12 shrink-0 text-end font-semibold ltr-nums">
              {localiseDigits(50, locale)}
            </span>
          </li>

          {resistance.drivers.map((driver) => {
            const positive = driver.effect >= 0;
            // Widths are relative to the largest possible single contribution
            // (22 points), so bars are comparable across careers rather than
            // rescaled per card.
            const width = Math.min(100, (Math.abs(driver.effect) / 22) * 100);
            return (
              <li key={driver.id} className="flex items-center gap-3 text-sm">
                <span className="w-44 shrink-0 truncate muted sm:w-56">
                  {glossary.drivers[driver.id]?.[locale] ?? driver.id}
                </span>
                <span className="relative flex h-2 flex-1 items-center">
                  <span aria-hidden="true" className="absolute inset-x-0 h-px bg-[var(--line)]" />
                  <span
                    aria-hidden="true"
                    className="absolute h-2 rounded-full"
                    style={{
                      width: `${width / 2}%`,
                      insetInlineStart: positive ? "50%" : undefined,
                      insetInlineEnd: positive ? undefined : "50%",
                      background: positive
                        ? "var(--band-anchored)"
                        : "var(--band-exposed)",
                    }}
                  />
                </span>
                <span
                  className="w-12 shrink-0 text-end font-semibold ltr-nums"
                  style={{
                    color: positive ? "var(--band-anchored)" : "var(--band-exposed)",
                  }}
                >
                  {positive ? "+" : "−"}
                  {localiseDigits(Math.abs(driver.effect).toFixed(1), locale)}
                </span>
              </li>
            );
          })}

          <li className="flex items-center gap-3 border-t pt-2 text-sm font-bold">
            <span className="w-44 shrink-0 truncate sm:w-56">{t.resistance.title}</span>
            <span className="flex-1" />
            <span className="w-12 shrink-0 text-end ltr-nums" style={{ color }}>
              {localiseDigits(resistance.score, locale)}
            </span>
          </li>
        </ul>
      </motion.div>

      {/* --- the limits ------------------------------------------------------ */}
      <motion.div variants={revealItem} className="border-t bg-[var(--surface-3)]/40 p-5">
        <button
          type="button"
          onClick={() => setShowMethod((open) => !open)}
          aria-expanded={showMethod}
          className="flex w-full items-center justify-between gap-3 text-start text-sm font-semibold"
        >
          {t.resistance.methodTitle}
          <span aria-hidden="true" className="muted">{showMethod ? "−" : "+"}</span>
        </button>
        <p className="mt-2 text-xs leading-relaxed muted">{glossary.basis[locale]}</p>
        {showMethod && (
          <p className="mt-3 max-w-3xl text-xs leading-relaxed muted">
            {glossary.method[locale]}
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}
