"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import SmartImage from "@/components/SmartImage";
import Sparkline from "@/components/Sparkline";
import { DemandBadge } from "@/components/ui";
import { localiseDigits } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import { cardHover, revealItem } from "@/lib/motion";
import type { CareerSummary, Sector } from "@/lib/types";

/**
 * One career in a grid.
 *
 * Takes the index record rather than the full career, so a grid of 184 cards
 * never pulls the 1.4 MB catalog. The salary line shows the entry figure
 * because that is the number a school leaver is actually deciding against; the
 * senior figure is on the detail page.
 */
export default function CareerCard({
  career,
  sector,
}: {
  career: CareerSummary;
  sector?: Sector;
}) {
  const { locale, t } = useLocale();
  const title = career.title[locale];

  return (
    <motion.article variants={revealItem} {...cardHover} className="card overflow-hidden">
      <Link href={`/${locale}/careers/${career.id}`} className="block">
        <SmartImage
          src={career.thumbnail}
          alt={title}
          seed={career.id}
          aspect="16 / 9"
          rounded={false}
        />
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {sector && (
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-semibold"
                  style={{ color: sector.color }}
                >
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: sector.color }}
                  />
                  {locale === "ar" ? sector.name_ar : sector.name_en}
                </span>
              )}
              <h3 className="mt-1 text-base font-bold leading-snug">{title}</h3>
            </div>
            <DemandBadge demand={career.demandOutlook} />
          </div>

          <p className="mt-2 line-clamp-3 text-sm leading-relaxed muted">
            {career.shortDescription[locale]}
          </p>

          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs muted">{t.careers.salary}</p>
              <p className="text-sm font-bold ltr-nums">
                {localiseDigits(career.salary.entry.toLocaleString("en-US"), locale)}
                <span className="ms-1 text-xs font-medium muted">{t.careers.perMonth}</span>
              </p>
            </div>
            <Sparkline values={career.growthTrend} />
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
