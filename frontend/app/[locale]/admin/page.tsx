"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ModelComparisonChart, SectorDistribution } from "@/components/charts";
import { Chip, EmptyState, SectionHeading, StatTile } from "@/components/ui";
import {
  loadCareerIndex, loadCourses, loadMajors, loadSectors, loadSkills, loadUniversities,
} from "@/lib/data/client";
import { localiseDigits } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import { loadModel } from "@/lib/ml/inference";
import { ADMIN_CODE, useProfile } from "@/lib/store/profile";

/**
 * Local admin mode.
 *
 * This is not an access-control boundary and does not pretend to be one. The
 * site is static: every catalog, the model bundle and this page's source are
 * public files that anyone can fetch directly. A password prompt here would
 * guard nothing while implying it guarded something, which is worse than no
 * prompt at all.
 *
 * What it actually is: a catalog inspection view — sizes, cross-reference
 * health, the model's published metrics, and a cache reset — kept behind a
 * documented code so it does not clutter the student-facing navigation.
 *
 * v1's admin panel had student lists, catalog CRUD and a retrain button. All
 * three needed a server and a database. Retraining in particular is a Python
 * pipeline that produces artifacts committed to the repository; it belongs in
 * `python ml/train.py`, not behind a button that cannot run it.
 */

interface Counts {
  careers: number;
  courses: number;
  universities: number;
  majors: number;
  skills: number;
  sectors: number;
}

export default function AdminPage() {
  const { locale, t } = useLocale();

  const profile = useProfile((state) => state.profile);
  const hydrated = useProfile((state) => state.hydrated);
  const unlockAdmin = useProfile((state) => state.unlockAdmin);

  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState(false);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [sectorSpread, setSectorSpread] = useState<
    { name: string; value: number; color: string }[]
  >([]);
  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);
  const [modelInfo, setModelInfo] = useState<{ name: string; trainedAt: string } | null>(null);

  const isAdmin = hydrated && profile?.role === "admin";

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;

    Promise.all([
      loadCareerIndex(), loadCourses(), loadUniversities(),
      loadMajors(), loadSkills(), loadSectors(), loadModel(),
    ])
      .then(([careers, courses, universities, majors, skills, sectors, bundle]) => {
        if (cancelled) return;
        setCounts({
          careers: careers.length,
          courses: courses.length,
          universities: universities.length,
          majors: majors.length,
          skills: skills.length,
          sectors: sectors.length,
        });

        const bySector = new Map<string, number>();
        for (const career of careers) {
          bySector.set(career.sector, (bySector.get(career.sector) ?? 0) + 1);
        }
        setSectorSpread(
          sectors
            .map((sector) => ({
              name: locale === "ar" ? sector.name_ar : sector.name_en,
              value: bySector.get(sector.id) ?? 0,
              color: sector.color,
            }))
            .sort((a, b) => b.value - a.value),
        );

        setMetrics(bundle.metrics as Record<string, unknown>);
        setModelInfo({
          name: bundle.generatedFrom.model,
          trainedAt: bundle.generatedFrom.trainedAt,
        });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [isAdmin, locale]);

  if (!hydrated) return <div className="mx-auto max-w-5xl px-4 py-16" />;

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <h1 className="text-xl font-black">{t.nav.admin}</h1>
        <p className="mt-2 text-sm muted">{t.admin.unlockHelp}</p>
        <form
          className="card mt-5 space-y-3 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!profile) {
              setCodeError(true);
              return;
            }
            const ok = unlockAdmin(code);
            setCodeError(!ok);
          }}
        >
          <label htmlFor="admin-code" className="block text-sm font-medium">
            {t.admin.unlockLabel}
          </label>
          <input
            id="admin-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm"
            autoComplete="off"
          />
          {codeError && (
            <p role="alert" className="text-sm text-[var(--uae-red-muted)]">
              {profile ? t.admin.unlockWrong : t.admin.unlockNoProfile}
            </p>
          )}
          <button type="submit" className="btn btn-primary w-full">
            {t.admin.unlock}
          </button>
          <p className="text-xs muted">{t.admin.unlockNote.replace("{code}", ADMIN_CODE)}</p>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <header>
        <h1 className="text-2xl font-black sm:text-3xl">{t.nav.admin}</h1>
        <p className="mt-2 max-w-2xl text-sm muted">{t.admin.staticNote}</p>
      </header>

      {counts === null ? (
        <div className="mt-8">
          <EmptyState message={t.common.loading} />
        </div>
      ) : (
        <>
          <section className="mt-8">
            <SectionHeading title={t.admin.catalogTitle} />
            <div className="grid gap-3 sm:grid-cols-3">
              <StatTile label={t.nav.careers} value={localiseDigits(counts.careers, locale)} />
              <StatTile label={t.nav.courses} value={localiseDigits(counts.courses, locale)} />
              <StatTile
                label={t.nav.universities}
                value={localiseDigits(counts.universities, locale)}
              />
              <StatTile label={t.admin.majors} value={localiseDigits(counts.majors, locale)} />
              <StatTile label={t.admin.skills} value={localiseDigits(counts.skills, locale)} />
              <StatTile label={t.careers.sector} value={localiseDigits(counts.sectors, locale)} />
            </div>
          </section>

          <section className="mt-10">
            <SectionHeading title={t.admin.sectorSpread} />
            <div className="card p-4">
              <SectorDistribution data={sectorSpread} />
            </div>
          </section>

          {metrics !== null && modelInfo && (
            <section className="mt-10">
              <SectionHeading title={t.model.comparison} />
              <div className="card p-4">
                <p className="mb-3 text-sm muted">
                  {t.admin.modelServed}: <strong>{modelInfo.name}</strong> ·{" "}
                  {new Date(modelInfo.trainedAt).toLocaleDateString(
                    locale === "ar" ? "ar-AE" : "en-GB",
                  )}
                </p>
                <ModelComparisonChart
                  data={Object.entries(
                    (metrics.comparison ?? {}) as Record<
                      string,
                      {
                        cv_accuracy_mean: number;
                        cv_macro_f1_mean: number;
                        test: { accuracy: number };
                      }
                    >,
                  ).map(([model, row]) => ({
                    model,
                    cv: row.cv_accuracy_mean,
                    f1: row.cv_macro_f1_mean,
                    test: row.test.accuracy,
                  }))}
                />
              </div>
              <p className="mt-2 text-xs muted">{t.admin.retrainNote}</p>
            </section>
          )}

          <section className="mt-10">
            <SectionHeading title={t.admin.maintenance} />
            <div className="card space-y-3 p-5">
              <p className="text-sm muted">{t.admin.cacheNote}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-ghost text-sm"
                  onClick={() => {
                    // The data layer caches per page load, so a reload is
                    // genuinely all a "cache reset" can mean on a static site.
                    window.location.reload();
                  }}
                >
                  {t.admin.resetCache}
                </button>
                <Link href={`/${locale}/model`} className="btn btn-ghost text-sm">
                  {t.model.title}
                </Link>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <Chip>{t.admin.validatedInCi}</Chip>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
