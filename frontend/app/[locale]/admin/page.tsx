"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ModelComparisonChart, SectorDistribution } from "@/components/charts";
import { Chip, EmptyState, ErrorBox, Loading, SectionHeading, StatTile } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { localiseDigits } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import type {
  AdminStats,
  AdminStudent,
  Career,
  Course,
  ModelInfo,
  ModelMetrics,
} from "@/lib/types";

type Tab = "stats" | "careers" | "courses" | "model";

export default function AdminPage() {
  const { locale, t, pick } = useLocale();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("stats");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [careers, setCareers] = useState<Career[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [model, setModel] = useState<{ model: ModelInfo; metrics: ModelMetrics } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [retraining, setRetraining] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace(`/${locale}/login`);
    else if (user.role !== "admin") router.replace(`/${locale}/dashboard`);
  }, [authLoading, user, router, locale]);

  const fail = useCallback(
    (caught: unknown) =>
      setError(caught instanceof ApiError ? caught.localised(locale) : t.common.error),
    [locale, t.common.error],
  );

  const loadCatalogs = useCallback(() => {
    api
      .get<{ careers: Career[] }>("/api/careers?limit=200", false)
      .then((body) => setCareers(body.careers))
      .catch(fail);
    api
      .get<{ courses: Course[] }>("/api/courses?limit=200", false)
      .then((body) => setCourses(body.courses))
      .catch(fail);
  }, [fail]);

  const role = user?.role;

  useEffect(() => {
    if (role !== "admin") return;
    api.get<AdminStats>("/api/admin/stats").then(setStats).catch(fail);
    api
      .get<{ students: AdminStudent[] }>("/api/admin/students")
      .then((body) => setStudents(body.students))
      .catch(fail);
    api
      .get<{ model: ModelInfo; metrics: ModelMetrics }>("/api/admin/model")
      .then(setModel)
      .catch(fail);
    loadCatalogs();
  }, [role, fail, loadCatalogs]);

  async function remove(kind: "careers" | "courses", id: string) {
    if (!window.confirm(t.admin.confirmDelete)) return;
    try {
      await api.del(`/api/admin/${kind}/${id}`);
      loadCatalogs();
      setNotice(`${id} — ${t.admin.delete}`);
      window.setTimeout(() => setNotice(null), 2500);
    } catch (caught) {
      fail(caught);
    }
  }

  async function retrain() {
    setRetraining(true);
    setError(null);
    try {
      const response = await api.post<{ model: ModelInfo; metrics: ModelMetrics }>(
        "/api/admin/model/retrain",
      );
      setModel({ model: response.model, metrics: response.metrics });
      setNotice(t.admin.retrainDone);
      window.setTimeout(() => setNotice(null), 4000);
    } catch (caught) {
      fail(caught);
    } finally {
      setRetraining(false);
    }
  }

  if (authLoading || user?.role !== "admin") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <Loading />
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "stats", label: t.admin.tabStats },
    { id: "careers", label: t.admin.tabCareers },
    { id: "courses", label: t.admin.tabCourses },
    { id: "model", label: t.admin.tabModel },
  ];

  const metrics = model?.metrics;
  const comparison = metrics?.model_comparison
    ? Object.entries(metrics.model_comparison).map(([name, row]) => ({
        model: name,
        cv: row.cv_accuracy_mean,
        f1: row.cv_macro_f1_mean,
        test: row.test.accuracy,
      }))
    : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-black">{t.admin.title}</h1>
      <p className="mt-1 text-sm muted">{t.admin.subtitle}</p>

      <div role="tablist" aria-label={t.admin.title} className="mt-6 flex flex-wrap gap-2 border-b pb-2">
        {tabs.map((entry) => (
          <button
            key={entry.id}
            role="tab"
            aria-selected={tab === entry.id}
            onClick={() => setTab(entry.id)}
            className={`rounded-lg px-3.5 py-2 text-sm font-medium ${
              tab === entry.id
                ? "bg-[var(--brand)] text-[var(--brand-ink)]"
                : "muted hover:bg-[var(--surface-2)]"
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-5">
          <ErrorBox message={error} />
        </div>
      )}
      {notice && (
        <p role="status" className="mt-4 text-sm font-medium text-[var(--brand)]">
          {notice}
        </p>
      )}

      {/* --------------------------------------------------------------- stats */}
      {tab === "stats" && (
        <div className="mt-6 space-y-10">
          {!stats && <Loading />}
          {stats && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatTile value={stats.users.total} label={t.admin.users} />
                <StatTile value={stats.users.students} label={t.admin.students} />
                <StatTile
                  value={stats.users.profiles_completed}
                  label={t.admin.completed}
                  hint={`${t.admin.completionRate}: ${localiseDigits(
                    Math.round(stats.users.completion_rate * 100),
                    locale,
                  )}%`}
                />
                <StatTile value={stats.activity.recommendation_runs} label={t.admin.runs} />
                <StatTile value={stats.catalog.careers} label={t.nav.careers} />
                <StatTile value={stats.catalog.courses} label={t.admin.tabCourses} />
                <StatTile value={stats.activity.saved_careers} label={t.admin.savedCareers} />
                <StatTile value={stats.activity.chat_messages} label={t.admin.messages} />
              </div>

              <div className="card p-4">
                <p className="text-sm">
                  <span className="muted">{t.admin.mentorMode}: </span>
                  <Chip tone={stats.mentor_mode === "anthropic" ? "brand" : "neutral"}>
                    {stats.mentor_mode === "anthropic"
                      ? t.admin.mentorApi
                      : t.admin.mentorOffline}
                  </Chip>
                </p>
              </div>

              <section>
                <SectionHeading title={t.admin.sectorDistribution} />
                {stats.sector_distribution.length === 0 ? (
                  <EmptyState message={t.admin.noData} />
                ) : (
                  <div className="card p-5">
                    <SectorDistribution
                      data={stats.sector_distribution.map((row) => ({
                        name: pick(row, "name"),
                        value: row.count,
                        color: row.color,
                      }))}
                    />
                  </div>
                )}
              </section>

              <section>
                <SectionHeading title={t.admin.mostRecommended} />
                {stats.most_recommended.length === 0 ? (
                  <EmptyState message={t.admin.noData} />
                ) : (
                  <ol className="card divide-y p-0">
                    {stats.most_recommended.map((row, index) => (
                      <li
                        key={row.career_id}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm"
                      >
                        <span className="w-6 muted ltr-nums">
                          {localiseDigits(index + 1, locale)}
                        </span>
                        <span className="flex-1">{pick(row, "title")}</span>
                        <span className="font-semibold ltr-nums">
                          {localiseDigits(row.count, locale)}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              <section>
                <SectionHeading title={t.admin.studentsTitle} />
                <div className="card overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-[var(--surface-3)]">
                      <tr>
                        {[
                          t.admin.reference,
                          t.admin.emirate,
                          t.admin.track,
                          t.admin.progress,
                          t.admin.lastMatch,
                        ].map((heading) => (
                          <th key={heading} scope="col" className="px-4 py-2.5 text-start font-semibold">
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {students.map((student) => (
                        <tr key={student.reference}>
                          <td className="px-4 py-2.5 ltr-nums">{student.reference}</td>
                          <td className="px-4 py-2.5">
                            {student.emirate
                              ? t.emirates[student.emirate as keyof typeof t.emirates]
                              : "—"}
                          </td>
                          <td className="px-4 py-2.5">
                            {student.track
                              ? t.tracks[student.track as keyof typeof t.tracks]
                              : "—"}
                          </td>
                          <td className="px-4 py-2.5 ltr-nums">
                            {localiseDigits(student.completed_steps, locale)}/
                            {localiseDigits(4, locale)}
                          </td>
                          <td className="px-4 py-2.5">{student.last_top_career ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------ catalogs */}
      {(tab === "careers" || tab === "courses") && (
        <div className="mt-6">
          <CatalogTable
            kind={tab}
            rows={tab === "careers" ? careers : courses}
            onDelete={(id) => void remove(tab, id)}
          />
        </div>
      )}

      {/* --------------------------------------------------------------- model */}
      {tab === "model" && (
        <div className="mt-6 space-y-8">
          {!model && <Loading />}
          {model && (
            <>
              <section className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="font-bold">{t.admin.modelTitle}</h2>
                    <dl className="mt-3 grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
                      <div className="flex gap-2">
                        <dt className="muted">{t.admin.modelName}:</dt>
                        <dd className="font-medium">{model.model.name}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="muted">{t.admin.trainedAt}:</dt>
                        <dd className="font-medium ltr-nums">
                          {model.model.trained_at?.slice(0, 16).replace("T", " ")}
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="muted">{t.admin.datasetRows}:</dt>
                        <dd className="font-medium ltr-nums">
                          {localiseDigits(model.model.dataset_rows ?? 0, locale)}
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="muted">{t.admin.features}:</dt>
                        <dd className="font-medium ltr-nums">
                          {localiseDigits(model.model.features ?? 0, locale)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  <div className="text-end">
                    <button
                      type="button"
                      onClick={() => void retrain()}
                      disabled={retraining}
                      className="btn btn-primary"
                    >
                      {retraining ? t.admin.retraining : t.admin.retrain}
                    </button>
                    <p className="mt-2 max-w-xs text-xs muted">{t.admin.retrainHelp}</p>
                  </div>
                </div>
              </section>

              {metrics?.selected_model && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <StatTile
                    value={`${(metrics.selected_model.test.accuracy * 100).toFixed(1)}%`}
                    label={t.admin.accuracy}
                  />
                  <StatTile
                    value={`${(metrics.selected_model.test.macro_f1 * 100).toFixed(1)}%`}
                    label={t.admin.macroF1}
                  />
                </div>
              )}

              {comparison.length > 0 && (
                <section>
                  <SectionHeading title={t.admin.comparison} />
                  <div className="card p-5">
                    <ModelComparisonChart data={comparison} />
                  </div>
                </section>
              )}

              {metrics?.selected_model && (
                <section>
                  <SectionHeading title={t.admin.perSector} />
                  <div className="card overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b bg-[var(--surface-3)]">
                        <tr>
                          {["", t.admin.precision, t.admin.recall, t.admin.f1, t.admin.support].map(
                            (heading, index) => (
                              <th
                                key={index}
                                scope="col"
                                className="px-4 py-2.5 text-start font-semibold"
                              >
                                {heading}
                              </th>
                            ),
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {Object.entries(metrics.selected_model.test.per_sector).map(
                          ([sector, row]) => (
                            <tr key={sector}>
                              <th scope="row" className="px-4 py-2 text-start font-medium">
                                {sector.replace(/_/g, " ")}
                              </th>
                              <td className="px-4 py-2 ltr-nums">{row.precision.toFixed(2)}</td>
                              <td className="px-4 py-2 ltr-nums">{row.recall.toFixed(2)}</td>
                              <td className="px-4 py-2 ltr-nums">{row.f1.toFixed(2)}</td>
                              <td className="px-4 py-2 ltr-nums">{row.support}</td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function CatalogTable({
  kind,
  rows,
  onDelete,
}: {
  kind: "careers" | "courses";
  rows: (Career | Course)[];
  onDelete: (id: string) => void;
}) {
  const { locale, t, pick } = useLocale();
  const [query, setQuery] = useState("");

  const filtered = rows.filter((row) => {
    if (!query.trim()) return true;
    const needle = query.trim().toLowerCase();
    return (
      row.id.includes(needle) ||
      row.title_en.toLowerCase().includes(needle) ||
      row.title_ar.includes(query.trim())
    );
  });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t.careers.searchPlaceholder}
          aria-label={t.careers.search}
          className="field max-w-xs"
        />
        <p className="text-sm muted ltr-nums">{localiseDigits(filtered.length, locale)}</p>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-[var(--surface-3)]">
            <tr>
              <th scope="col" className="px-4 py-2.5 text-start font-semibold">
                ID
              </th>
              <th scope="col" className="px-4 py-2.5 text-start font-semibold">
                {kind === "careers" ? t.nav.careers : t.admin.tabCourses}
              </th>
              <th scope="col" className="px-4 py-2.5 text-start font-semibold">
                {kind === "careers" ? t.careers.sector : t.common.provider}
              </th>
              <th scope="col" className="px-4 py-2.5 text-end font-semibold">
                {t.admin.delete}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-2.5 font-mono text-xs muted" dir="ltr">
                  {row.id}
                </td>
                <td className="px-4 py-2.5">{pick(row, "title")}</td>
                <td className="px-4 py-2.5 muted">
                  {"sector" in row ? row.sector.replace(/_/g, " ") : row.provider}
                </td>
                <td className="px-4 py-2.5 text-end">
                  <button
                    type="button"
                    onClick={() => onDelete(row.id)}
                    className="btn btn-ghost !py-1 text-xs !text-[var(--color-uae-red-muted)]"
                  >
                    {t.admin.delete}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
