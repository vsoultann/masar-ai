"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

import CourseCard from "@/components/CourseCard";
import { EmptyState, ErrorBox, Skeleton } from "@/components/ui";
import { loadCourses, loadSkills } from "@/lib/data/client";
import { localiseDigits } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import { revealContainer, viewportOnce } from "@/lib/motion";
import type { Course, Skill } from "@/lib/types";

/** The learning-pathway catalog, browsable without a profile. */
export default function CoursesPage() {
  const { locale, t } = useLocale();

  const [courses, setCourses] = useState<Course[] | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [skill, setSkill] = useState("");
  const [level, setLevel] = useState("");
  const [cost, setCost] = useState("");
  const [language, setLanguage] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadCourses(), loadSkills()])
      .then(([courseRows, skillRows]) => {
        if (cancelled) return;
        setCourses(courseRows);
        setSkills(skillRows);
      })
      .catch(() => {
        if (!cancelled) setError(t.common.error);
      });
    return () => {
      cancelled = true;
    };
  }, [t.common.error]);

  // Only offer skills that some course actually teaches, so the filter can
  // never produce an empty result by itself.
  const taughtSkills = useMemo(() => {
    if (!courses) return [];
    const taught = new Set(courses.flatMap((course) => Object.keys(course.skills)));
    return skills
      .filter((row) => taught.has(row.id))
      .sort((a, b) =>
        (locale === "ar" ? a.name_ar : a.name_en).localeCompare(
          locale === "ar" ? b.name_ar : b.name_en,
        ),
      );
  }, [courses, skills, locale]);

  const filtered = useMemo(() => {
    if (!courses) return [];
    const needle = query.trim().toLowerCase();
    return courses.filter((course) => {
      if (skill && !(skill in course.skills)) return false;
      if (level && course.level !== level) return false;
      if (cost && course.cost !== cost) return false;
      if (language && course.language !== language && course.language !== "both") return false;
      if (!needle) return true;
      return (
        course.title_en.toLowerCase().includes(needle)
        || course.title_ar.includes(needle)
        || course.provider.toLowerCase().includes(needle)
      );
    });
  }, [courses, query, skill, level, cost, language]);

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
        <h1 className="text-2xl font-black sm:text-3xl">{t.nav.courses}</h1>
        <p className="mt-2 max-w-2xl muted">{t.courses.subtitle}</p>
      </header>

      <div className="card mt-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="block lg:col-span-2">
          <span className="mb-1 block text-xs font-semibold">{t.careers.search}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.courses.searchPlaceholder}
            className="w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold">{t.careers.skills}</span>
          <select
            value={skill}
            onChange={(event) => setSkill(event.target.value)}
            className="w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm"
          >
            <option value="">{t.courses.allSkills}</option>
            {taughtSkills.map((row) => (
              <option key={row.id} value={row.id}>
                {locale === "ar" ? row.name_ar : row.name_en}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold">{t.common.level}</span>
          <select
            value={level}
            onChange={(event) => setLevel(event.target.value)}
            className="w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm"
          >
            <option value="">{t.courses.allLevels}</option>
            <option value="beginner">{t.common.beginner}</option>
            <option value="intermediate">{t.common.intermediate}</option>
            <option value="advanced">{t.common.advanced}</option>
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold">{t.common.cost}</span>
            <select
              value={cost}
              onChange={(event) => setCost(event.target.value)}
              className="w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm"
            >
              <option value="">{t.courses.allCosts}</option>
              <option value="free">{t.common.free}</option>
              <option value="paid">{t.common.paid}</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold">{t.common.language}</span>
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              className="w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm"
            >
              <option value="">{t.courses.allLanguages}</option>
              <option value="en">{t.common.languageEn}</option>
              <option value="ar">{t.common.languageAr}</option>
            </select>
          </label>
        </div>
      </div>

      <p className="mt-4 text-sm muted" aria-live="polite">
        {courses === null
          ? t.common.loading
          : `${localiseDigits(filtered.length, locale)} ${t.courses.resultsCount}`}
      </p>

      {courses === null ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-44" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-6">
          <EmptyState message={t.courses.noResults} />
        </div>
      ) : (
        <motion.div
          variants={revealContainer(0.03)}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {filtered.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </motion.div>
      )}
    </div>
  );
}
