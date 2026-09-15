"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import CourseCard from "@/components/CourseCard";
import SmartImage from "@/components/SmartImage";
import Sparkline from "@/components/Sparkline";
import UniversityMatches from "@/components/UniversityMatches";
import { Chip, DemandBadge, ErrorBox, Loading, Meter, SectionHeading } from "@/components/ui";
import {
  indexBy, loadCareer, loadCareersByIds, loadCoursesByIds, loadInitiatives,
  loadMajors, loadSectors, loadSkills,
} from "@/lib/data/client";
import { localiseDigits } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import { revealContainer, revealItem, viewportOnce } from "@/lib/motion";
import { useProfile } from "@/lib/store/profile";
import type {
  Career, CareerSummary, Course, Initiative, Major, Sector, Skill,
} from "@/lib/types";

interface Resolved {
  career: Career;
  sector?: Sector;
  skills: (Skill & { requiredLevel: number })[];
  majors: Major[];
  initiatives: Initiative[];
  courses: Course[];
  related: CareerSummary[];
}

export default function CareerDetailView() {
  const { locale, t, lookup } = useLocale();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [data, setData] = useState<Resolved | null>(null);
  const [error, setError] = useState<string | null>(null);

  const profile = useProfile((state) => state.profile);
  const toggleSaved = useProfile((state) => state.toggleSavedCareer);
  const isSaved = !!profile?.savedCareers.includes(id ?? "");

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setError(null);

    (async () => {
      const career = await loadCareer(id);
      if (!career) {
        if (!cancelled) setError(t.errors.notFound);
        return;
      }
      // One await for everything the page needs; the data layer shares
      // in-flight requests, so the shared catalogs are fetched once.
      const [sectors, skills, majors, initiatives, courses, related] = await Promise.all([
        loadSectors(), loadSkills(), loadMajors(), loadInitiatives(),
        loadCoursesByIds(career.topCourses),
        loadCareersByIds(career.relatedCareers),
      ]);
      if (cancelled) return;

      const skillsById = indexBy(skills);
      const majorsById = indexBy(majors);
      const initiativesById = indexBy(initiatives);

      setData({
        career,
        sector: indexBy(sectors).get(career.sector),
        skills: career.requiredSkills
          .map((entry) => {
            const skill = skillsById.get(entry.skill);
            return skill ? { ...skill, requiredLevel: entry.requiredLevel } : null;
          })
          .filter((s): s is Skill & { requiredLevel: number } => s !== null),
        majors: career.educationPath.relatedMajors
          .map((m) => majorsById.get(m))
          .filter((m): m is Major => m !== undefined),
        initiatives: career.strategicInitiatives
          .map((i) => initiativesById.get(i))
          .filter((i): i is Initiative => i !== undefined),
        courses,
        related,
      });
    })().catch(() => {
      if (!cancelled) setError(t.common.error);
    });

    return () => {
      cancelled = true;
    };
  }, [id, t.common.error, t.errors.notFound]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <ErrorBox message={error} />
        <Link href={`/${locale}/careers`} className="btn btn-ghost mt-4">
          {t.careers.backToCareers}
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Loading />
      </div>
    );
  }

  const { career, sector, skills, majors, initiatives, courses, related } = data;
  const salary = career.salaryAED;
  const number = (value: number) => localiseDigits(value.toLocaleString("en-US"), locale);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link href={`/${locale}/careers`} className="text-sm muted hover:text-[var(--ink)]">
        <span aria-hidden="true" className="flip-rtl inline-block">←</span>{" "}
        {t.careers.backToCareers}
      </Link>

      <motion.header
        variants={revealContainer()}
        initial="hidden"
        animate="show"
        className="mt-4"
      >
        <motion.div variants={revealItem}>
          {sector && (
            <span
              className="inline-flex items-center gap-1.5 text-xs font-semibold"
              style={{ color: sector.color }}
            >
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full"
                style={{ background: sector.color }}
              />
              {locale === "ar" ? sector.name_ar : sector.name_en}
            </span>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black sm:text-3xl">{career.title[locale]}</h1>
            <DemandBadge demand={career.demandOutlook} />
          </div>
          <p className="mt-3 max-w-3xl leading-relaxed muted">
            {career.shortDescription[locale]}
          </p>
        </motion.div>

        <motion.div variants={revealItem} className="mt-5 flex flex-wrap gap-2">
          {profile && (
            <button
              type="button"
              onClick={() => toggleSaved(career.id)}
              className={`btn ${isSaved ? "btn-primary" : "btn-ghost"}`}
              aria-pressed={isSaved}
            >
              {isSaved ? t.careers.saved : t.careers.save}
            </button>
          )}
          <Link href={`/${locale}/skills?career=${career.id}`} className="btn btn-ghost">
            {t.skills.title}
          </Link>
        </motion.div>
      </motion.header>

      <div className="mt-6">
        <SmartImage
          src={career.media.hero}
          alt={career.title[locale]}
          seed={career.id}
          aspect="21 / 9"
          art={{ kind: "career", sector: career.sector }}
        />
      </div>

      {/* --- salary and trend ------------------------------------------- */}
      <section className="card mt-6 grid gap-5 p-5 sm:grid-cols-[1fr_auto]">
        <div>
          <h2 className="text-sm font-semibold">{t.careers.salary}</h2>
          <dl className="mt-2 flex flex-wrap gap-x-8 gap-y-3">
            {([
              [t.careers.salaryEntry, salary.entry],
              [t.careers.salaryMid, salary.mid],
              [t.careers.salarySenior, salary.senior],
            ] as const).map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs muted">{label}</dt>
                <dd className="text-xl font-black ltr-nums">{number(value)}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-xs muted">{salary.note[locale]}</p>
        </div>
        <div className="sm:text-end">
          <h2 className="text-sm font-semibold">{t.careers.growth}</h2>
          <div className="mt-2 flex sm:justify-end">
            <Sparkline values={career.growthTrend} width={120} height={36} />
          </div>
          <p className="mt-2 max-w-[16rem] text-xs muted">{t.careers.trendNote}</p>
        </div>
      </section>

      {/* --- prose -------------------------------------------------------- */}
      <section className="mt-10">
        <SectionHeading title={t.careers.about} />
        <div className="max-w-3xl space-y-4 leading-relaxed">
          {career.longDescription[locale].split("\n\n").map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </section>

      <section className="card mt-8 p-5">
        <h2 className="text-lg font-bold">{t.careers.dayInTheLife}</h2>
        <p className="mt-2 max-w-3xl leading-relaxed muted">{career.dayInTheLife[locale]}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {career.workEnvironment.map((environment) => (
            <Chip key={environment}>{lookup(t.environments, environment)}</Chip>
          ))}
        </div>
      </section>

      {/* --- education ---------------------------------------------------- */}
      <section className="mt-10">
        <SectionHeading title={t.careers.education} />
        <div className="card p-5">
          <p className="font-semibold">{career.educationPath.minimumQualification[locale]}</p>
          <p className="mt-1 text-sm muted">
            {t.careers.typicalYears}:{" "}
            <span className="ltr-nums">{localiseDigits(career.educationPath.typicalYears, locale)}</span>{" "}
            {t.careers.years}
          </p>

          <h3 className="mt-4 text-sm font-semibold">{t.careers.relatedMajors}</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {majors.map((major) => (
              <li key={major.id}>
                <Chip tone="brand">{major.name[locale]}</Chip>
              </li>
            ))}
          </ul>

          {career.educationPath.licensingBodies.length > 0 && (
            <>
              <h3 className="mt-4 text-sm font-semibold">{t.careers.licensing}</h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {career.educationPath.licensingBodies.map((body) => (
                  <li key={body.en}>
                    <Chip>{body[locale]}</Chip>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>

      {/* --- where to study ------------------------------------------------ */}
      <section className="mt-10">
        <SectionHeading title={t.careers.whereToStudy} />
        <UniversityMatches career={career} />
      </section>

      {/* --- skills -------------------------------------------------------- */}
      <section className="mt-10">
        <SectionHeading title={t.careers.skills} />
        <div className="grid gap-3 sm:grid-cols-2">
          {skills.slice(0, 10).map((skill) => (
            <Meter
              key={skill.id}
              value={skill.requiredLevel}
              label={locale === "ar" ? skill.name_ar : skill.name_en}
              right={`${localiseDigits(skill.requiredLevel, locale)}/100`}
            />
          ))}
        </div>
      </section>

      {/* --- UAE relevance ------------------------------------------------- */}
      <section className="mt-10">
        <SectionHeading title={t.careers.uaeRelevance} />
        <p className="max-w-3xl leading-relaxed">{career.uaeRelevance[locale]}</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="card p-4">
            <h3 className="text-sm font-semibold">{t.careers.employers}</h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {career.employers[locale].map((employer) => (
                <li key={employer}>
                  <Chip>{employer}</Chip>
                </li>
              ))}
            </ul>
          </div>
          {initiatives.length > 0 && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold">{t.careers.initiatives}</h3>
              <ul className="mt-2 space-y-2">
                {initiatives.map((initiative) => (
                  <li key={initiative.id}>
                    <p className="text-sm font-semibold">
                      {locale === "ar" ? initiative.name_ar : initiative.name_en}
                    </p>
                    <p className="text-xs leading-relaxed muted">
                      {locale === "ar" ? initiative.summary_ar : initiative.summary_en}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* --- courses ------------------------------------------------------- */}
      {courses.length > 0 && (
        <section className="mt-10">
          <SectionHeading title={t.careers.relatedCourses} />
          <div className="grid gap-3 sm:grid-cols-2">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </section>
      )}

      {/* --- related careers ------------------------------------------------ */}
      {related.length > 0 && (
        <motion.section
          variants={revealContainer(0.05)}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="mt-10"
        >
          <SectionHeading title={t.careers.relatedCareers} />
          <div className="flex flex-wrap gap-2">
            {related.map((item) => (
              <motion.div key={item.id} variants={revealItem}>
                <Link href={`/${locale}/careers/${item.id}`} className="btn btn-ghost text-sm">
                  {item.title[locale]}
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}
    </div>
  );
}
