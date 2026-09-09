"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import CourseCard from "@/components/CourseCard";
import { SkillGapChart, type GapDatum } from "@/components/charts";
import { EmptyState, Meter, SectionHeading } from "@/components/ui";
import {
  indexBy, loadCareerIndex, loadCareers, loadCoursesForGaps, loadSkills,
} from "@/lib/data/client";
import { localiseDigits } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import { loadModel, recommend } from "@/lib/ml/inference";
import { drawLine, revealContainer, revealItem, viewportOnce } from "@/lib/motion";
import { estimateSkills } from "@/lib/scoring";
import { isComplete, useProfile } from "@/lib/store/profile";
import type { CareerSummary, Course, Skill } from "@/lib/types";

/**
 * Skill-gap analysis and the learning roadmap.
 *
 * The chosen career comes from ?career=, then the student's saved careers,
 * then their top match — so arriving here from a career page, from the
 * dashboard, or straight from the nav all land somewhere sensible.
 *
 * The roadmap phases the gaps rather than listing them: four phases, largest
 * gaps first, because a list of eleven skills to learn is paralysing and a
 * sequence is actionable.
 */

const PHASE_COUNT = 4;

function SkillsView() {
  const { locale, t } = useLocale();
  const searchParams = useSearchParams();

  const profile = useProfile((state) => state.profile);
  const hydrated = useProfile((state) => state.hydrated);

  const [careers, setCareers] = useState<CareerSummary[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [gaps, setGaps] = useState<GapDatum[] | null>(null);
  const [rawGaps, setRawGaps] = useState<{ skill: string; gap: number }[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [skillsById, setSkillsById] = useState<Map<string, Skill>>(new Map());

  // Pick the career to analyse.
  useEffect(() => {
    if (!hydrated || !profile || !isComplete(profile)) return;
    let cancelled = false;

    (async () => {
      const [index, bundle] = await Promise.all([loadCareerIndex(), loadModel()]);
      if (cancelled) return;
      setCareers(index);

      const requested = searchParams?.get("career");
      if (requested && index.some((career) => career.id === requested)) {
        setSelected(requested);
        return;
      }
      if (profile.savedCareers.length > 0) {
        setSelected(profile.savedCareers[0]);
        return;
      }
      const top = recommend(
        {
          grades: profile.grades, emsat: profile.emsat, riasec: profile.riasec,
          bigfive: profile.bigfive, track: profile.track, emirate: profile.emirate,
        },
        bundle,
        1,
      ).recommendations[0];
      if (top) setSelected(top.careerId);
    })().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [hydrated, profile, searchParams]);

  // Compute the gaps for the selected career.
  useEffect(() => {
    if (!selected || !profile) return;
    let cancelled = false;

    (async () => {
      const [bundle, allCareers, skills] = await Promise.all([
        loadModel(), loadCareers(), loadSkills(),
      ]);
      if (cancelled) return;

      const career = allCareers.find((row) => row.id === selected);
      if (!career) return;

      const featureRow: Record<string, number> = {
        ...profile.grades,
        ...Object.fromEntries(Object.entries(profile.riasec).map(([k, v]) => [`riasec_${k}`, v])),
        ...Object.fromEntries(Object.entries(profile.bigfive).map(([k, v]) => [`big5_${k}`, v])),
      };
      const estimates = estimateSkills(
        featureRow, bundle.skillMap.weights, bundle.skillMap.invertedFeatures,
      );

      const byId = indexBy(skills);
      setSkillsById(byId);

      const rows = career.requiredSkills.map((entry) => ({
        id: entry.skill,
        skill: byId.get(entry.skill)
          ? locale === "ar"
            ? byId.get(entry.skill)!.name_ar
            : byId.get(entry.skill)!.name_en
          : entry.skill,
        current: Math.round(estimates[entry.skill] ?? 50),
        required: entry.requiredLevel,
      }));

      setGaps(rows.map(({ skill, current, required }) => ({ skill, current, required })));

      const positive = rows
        .map((row) => ({ skill: row.id, gap: row.required - row.current }))
        .filter((row) => row.gap > 0)
        .sort((a, b) => b.gap - a.gap);
      setRawGaps(positive);
      setCourses(await loadCoursesForGaps(positive, 8));
    })().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [selected, profile, locale]);

  const phases = useMemo(() => {
    if (rawGaps.length === 0) return [];
    const labels = [t.skills.phaseNow, t.skills.phase6, t.skills.phase12, t.skills.phase24];
    const perPhase = Math.max(1, Math.ceil(rawGaps.length / PHASE_COUNT));
    return labels.map((label, index) => ({
      label,
      skills: rawGaps.slice(index * perPhase, (index + 1) * perPhase),
    })).filter((phase) => phase.skills.length > 0);
  }, [rawGaps, t]);

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

  const skillName = (id: string) => {
    const skill = skillsById.get(id);
    return skill ? (locale === "ar" ? skill.name_ar : skill.name_en) : id;
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <header>
        <h1 className="text-2xl font-black sm:text-3xl">{t.skills.title}</h1>
        <p className="mt-2 max-w-2xl muted">{t.skills.subtitle}</p>
      </header>

      <label className="mt-6 block max-w-md">
        <span className="mb-1 block text-sm font-medium">{t.skills.chooseCareer}</span>
        <select
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
          className="w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm"
        >
          {careers.map((career) => (
            <option key={career.id} value={career.id}>
              {career.title[locale]}
            </option>
          ))}
        </select>
      </label>

      {gaps && gaps.length > 0 && (
        <section className="mt-8">
          <div className="card p-4">
            <SkillGapChart data={gaps.slice(0, 8)} />
          </div>
          <p className="mt-2 text-xs muted">{t.skills.estimateNote}</p>
        </section>
      )}

      {rawGaps.length === 0 && gaps !== null && (
        <div className="mt-8">
          <EmptyState message={t.skills.noGaps} />
        </div>
      )}

      {rawGaps.length > 0 && (
        <section className="mt-10">
          <SectionHeading title={t.skills.gap} />
          <div className="grid gap-3 sm:grid-cols-2">
            {rawGaps.slice(0, 8).map((row) => (
              <Meter
                key={row.skill}
                value={row.gap}
                label={skillName(row.skill)}
                right={`+${localiseDigits(Math.round(row.gap), locale)}`}
              />
            ))}
          </div>
        </section>
      )}

      {phases.length > 0 && (
        <section className="mt-12">
          <SectionHeading title={t.skills.roadmap} />
          <p className="mb-4 text-sm muted">{t.skills.roadmapNote}</p>

          <motion.ol
            variants={revealContainer(0.12)}
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
            className="relative space-y-6 ps-6"
          >
            {/* The connecting line draws itself as the timeline scrolls in. */}
            <svg
              aria-hidden
              className="pointer-events-none absolute start-[7px] top-2 h-full w-[2px]"
              preserveAspectRatio="none"
              viewBox="0 0 2 100"
            >
              <motion.line
                x1="1" y1="0" x2="1" y2="100"
                stroke="var(--brand)"
                strokeWidth="2"
                variants={drawLine}
              />
            </svg>

            {phases.map((phase) => (
              <motion.li key={phase.label} variants={revealItem} className="relative">
                <span
                  aria-hidden
                  className="absolute -start-6 top-1.5 grid h-4 w-4 place-items-center rounded-full bg-[var(--brand)]"
                />
                <h3 className="text-sm font-bold">{phase.label}</h3>
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {phase.skills.map((row) => (
                    <li
                      key={row.skill}
                      className="rounded-full bg-[var(--surface-3)] px-2.5 py-0.5 text-[11px]"
                    >
                      {skillName(row.skill)}
                    </li>
                  ))}
                </ul>
              </motion.li>
            ))}
          </motion.ol>
        </section>
      )}

      {courses.length > 0 && (
        <section className="mt-12">
          <SectionHeading title={t.careers.relatedCourses} />
          <div className="grid gap-3 sm:grid-cols-2">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
          <Link href={`/${locale}/courses`} className="btn btn-ghost mt-4 text-sm">
            {t.nav.courses}
          </Link>
        </section>
      )}
    </div>
  );
}


/**
 * useSearchParams opts a route out of static prerendering unless it sits inside
 * a Suspense boundary — the build fails outright otherwise. The boundary lets
 * the shell prerender and the query-dependent part resolve in the browser,
 * which is what static export needs.
 */
export default function SkillsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-5xl px-4 py-16" />}>
      <SkillsView />
    </Suspense>
  );
}
