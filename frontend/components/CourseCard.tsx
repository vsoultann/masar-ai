"use client";

import { formatWeeks } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import type { Course } from "@/lib/types";
import { Chip } from "@/components/ui";

export default function CourseCard({
  course,
  forSkill,
  kind,
}: {
  course: Course;
  forSkill?: string;
  kind?: "close_gap" | "strengthen";
}) {
  const { locale, t, pick } = useLocale();

  const languageLabel =
    course.language === "both"
      ? t.common.languageBoth
      : course.language === "ar"
        ? t.common.languageAr
        : t.common.languageEn;
  const levelLabel = t.common[course.level];

  return (
    <article className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h4 className="font-semibold leading-snug">{pick(course, "title")}</h4>
        {kind && (
          <Chip tone={kind === "close_gap" ? "brand" : "neutral"}>
            {kind === "close_gap" ? t.dashboard.closeGap : t.dashboard.strengthen}
          </Chip>
        )}
      </div>

      <p className="mt-1.5 text-sm muted">{pick(course, "description")}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Chip>{course.provider}</Chip>
        {course.provider_type === "uae" && <Chip tone="accent">{t.common.uaeProvider}</Chip>}
        <Chip>{levelLabel}</Chip>
        <Chip>{formatWeeks(course.duration_weeks, locale)}</Chip>
        <Chip tone={course.cost === "free" ? "brand" : "neutral"}>
          {course.cost === "free" ? t.common.free : t.common.paid}
        </Chip>
        <Chip>{languageLabel}</Chip>
      </div>

      {forSkill && (
        <p className="mt-2.5 text-xs muted">
          {t.dashboard.forSkill}: <span className="font-medium">{forSkill}</span>
        </p>
      )}
    </article>
  );
}
