"use client";

import Link from "next/link";

import { localiseDigits } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import type { Career } from "@/lib/types";
import { DemandBadge } from "@/components/ui";

export default function CareerCard({
  career,
  sectorName,
  sectorColor,
}: {
  career: Career;
  sectorName?: string;
  sectorColor?: string;
}) {
  const { locale, t, pick } = useLocale();
  const salary = career.salary_aed;

  return (
    <article className="card flex flex-col p-5 transition-colors hover:border-[var(--brand)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {sectorName && (
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold"
              style={{ color: sectorColor }}
            >
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full"
                style={{ background: sectorColor }}
              />
              {sectorName}
            </span>
          )}
          <h3 className="mt-1 font-bold leading-snug">
            <Link href={`/${locale}/careers/${career.id}`} className="hover:underline">
              {pick(career, "title")}
            </Link>
          </h3>
        </div>
        <DemandBadge demand={career.demand} />
      </div>

      <p className="mt-2.5 line-clamp-3 text-sm muted">{pick(career, "description")}</p>

      <dl className="mt-4 flex items-baseline gap-2 text-sm">
        <dt className="muted">{t.careers.salary}:</dt>
        <dd className="font-semibold ltr-nums">
          {localiseDigits(salary.min.toLocaleString("en-US"), locale)}–
          {localiseDigits(salary.max.toLocaleString("en-US"), locale)}
        </dd>
        <dd className="text-xs muted">{t.careers.perMonth}</dd>
      </dl>

      <Link
        href={`/${locale}/careers/${career.id}`}
        className="btn btn-ghost mt-4 !py-2 text-sm"
      >
        {t.dashboard.viewCareer}
      </Link>
    </article>
  );
}
