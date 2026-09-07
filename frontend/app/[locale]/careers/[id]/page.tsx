"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import CourseCard from "@/components/CourseCard";
import { Chip, DemandBadge, ErrorBox, Loading, Meter, SectionHeading } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { localiseDigits } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import type { Career, Course } from "@/lib/types";

export default function CareerDetailPage() {
  const { locale, t, pick } = useLocale();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [career, setCareer] = useState<Career | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setError(null);
    api
      .get<Career>(`/api/careers/${id}`, false)
      .then(setCareer)
      .catch((caught) =>
        setError(caught instanceof ApiError ? caught.localised(locale) : t.common.error),
      );
  }, [id, locale, t.common.error]);

  useEffect(() => {
    if (!career) return;
    // Show courses that teach this career's three most important skills.
    const top = Object.entries(career.skills)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([skill]) => skill);
    Promise.all(
      top.map((skill) =>
        api.get<{ courses: Course[] }>(`/api/courses?skill=${skill}&limit=3`, false),
      ),
    )
      .then((responses) => {
        const seen = new Set<string>();
        const merged: Course[] = [];
        for (const response of responses) {
          for (const course of response.courses) {
            if (seen.has(course.id)) continue;
            seen.add(course.id);
            merged.push(course);
          }
        }
        setCourses(merged.slice(0, 6));
      })
      .catch(() => undefined);
  }, [career]);

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

  if (!career) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Loading />
      </div>
    );
  }

  const salary = career.salary_aed;
  const degrees = locale === "ar" ? career.degrees_ar : career.degrees_en;
  const employers = locale === "ar" ? career.employers_ar : career.employers_en;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link href={`/${locale}/careers`} className="text-sm muted hover:text-[var(--ink)]">
        <span aria-hidden="true" className="flip-rtl inline-block">
          ←
        </span>{" "}
        {t.careers.backToCareers}
      </Link>

      <header className="mt-4">
        {career.sector_detail && (
          <span
            className="inline-flex items-center gap-1.5 text-xs font-semibold"
            style={{ color: career.sector_detail.color }}
          >
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full"
              style={{ background: career.sector_detail.color }}
            />
            {pick(career.sector_detail, "name")}
          </span>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-black sm:text-3xl">{pick(career, "title")}</h1>
          <DemandBadge demand={career.demand} />
        </div>
        <p className="mt-3 max-w-3xl leading-relaxed muted">{pick(career, "description")}</p>
      </header>

      <section className="card mt-6 p-5">
        <h2 className="text-sm font-semibold">{t.careers.salary}</h2>
        <p className="mt-1 text-2xl font-black ltr-nums">
          {localiseDigits(salary.min.toLocaleString("en-US"), locale)}–
          {localiseDigits(salary.max.toLocaleString("en-US"), locale)}{" "}
          <span className="text-sm font-medium muted">{t.careers.perMonth}</span>
        </p>
        <p className="mt-2 text-xs muted">{t.careers.salaryNote}</p>
      </section>

      <section className="mt-10">
        <SectionHeading title={t.careers.skills} />
        <div className="grid gap-3 sm:grid-cols-2">
          {(career.skill_detail ?? []).map((skill) => (
            <Meter
              key={skill.id}
              value={skill.weight}
              label={pick(skill, "name")}
              right={`${localiseDigits(skill.weight, locale)}/100`}
            />
          ))}
        </div>
      </section>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-bold">{t.careers.degrees}</h2>
          <ul className="flex flex-wrap gap-2">
            {degrees.map((degree) => (
              <li key={degree}>
                <Chip tone="brand">{degree}</Chip>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="mb-3 text-lg font-bold">{t.careers.employers}</h2>
          <ul className="flex flex-wrap gap-2">
            {employers.map((employer) => (
              <li key={employer}>
                <Chip>{employer}</Chip>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {career.initiative_detail && career.initiative_detail.length > 0 && (
        <section className="mt-10">
          <SectionHeading title={t.careers.initiatives} />
          <ul className="grid gap-3 sm:grid-cols-2">
            {career.initiative_detail.map((initiative) => (
              <li key={initiative.id} className="card p-4">
                <h3 className="font-semibold">{pick(initiative, "name")}</h3>
                <p className="mt-1.5 text-sm muted leading-relaxed">
                  {pick(initiative, "summary")}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

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
    </div>
  );
}
