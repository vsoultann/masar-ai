"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import CourseCard from "@/components/CourseCard";
import { BigFiveBars, RiasecRadar, SkillGapChart } from "@/components/charts";
import {
  Chip,
  EmptyState,
  ErrorBox,
  Loading,
  Meter,
  SectionHeading,
  StatTile,
} from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { localiseDigits } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import type {
  EstimatedSkill,
  Profile,
  RecommendationResponse,
  Roadmap,
  SkillGap,
} from "@/lib/types";

export default function DashboardPage() {
  const { locale, t, pick } = useLocale();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [result, setResult] = useState<RecommendationResponse | null>(null);
  const [skills, setSkills] = useState<EstimatedSkill[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [gap, setGap] = useState<SkillGap | null>(null);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace(`/${locale}/login`);
  }, [authLoading, user, router, locale]);

  // See the note in the onboarding wizard: depend on the id, not the object.
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    api
      .get<Profile>("/api/profile")
      .then(setProfile)
      .catch((caught) =>
        setError(caught instanceof ApiError ? caught.localised(locale) : t.common.error),
      );
  }, [userId, locale, t.common.error]);

  useEffect(() => {
    if (!profile?.is_complete) return;
    Promise.all([
      api.get<RecommendationResponse>("/api/recommendations"),
      api.get<{ skills: EstimatedSkill[] }>("/api/skills/me"),
      api.get<{ saved: { career_id: string }[] }>("/api/saved"),
    ])
      .then(([recommendations, estimated, saved]) => {
        setResult(recommendations);
        setSkills(estimated.skills);
        setSavedIds(saved.saved.map((row) => row.career_id));
        setSelected(recommendations.recommendations[0]?.career_id ?? null);
      })
      .catch((caught) =>
        setError(caught instanceof ApiError ? caught.localised(locale) : t.common.error),
      );
  }, [profile, locale, t.common.error]);

  useEffect(() => {
    if (!selected) return;
    setGap(null);
    setRoadmap(null);
    Promise.all([
      api.get<SkillGap>(`/api/skill-gap/${selected}`),
      api.get<Roadmap>(`/api/learning-path/${selected}`),
    ])
      .then(([gapResult, roadmapResult]) => {
        setGap(gapResult);
        setRoadmap(roadmapResult);
      })
      .catch(() => undefined);
  }, [selected]);

  async function toggleSaved(careerId: string) {
    const isSaved = savedIds.includes(careerId);
    setSavedIds((current) =>
      isSaved ? current.filter((id) => id !== careerId) : [...current, careerId],
    );
    try {
      if (isSaved) await api.del(`/api/saved/${careerId}`);
      else await api.post(`/api/saved/${careerId}`);
    } catch {
      // Put the optimistic change back if the server disagreed.
      setSavedIds((current) =>
        isSaved ? [...current, careerId] : current.filter((id) => id !== careerId),
      );
    }
  }

  async function download(lang: "en" | "ar") {
    setDownloading(lang);
    try {
      await api.downloadReport(lang);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.localised(locale) : t.common.error);
    } finally {
      setDownloading(null);
    }
  }

  if (authLoading || (!profile && !error)) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <Loading />
      </div>
    );
  }

  if (profile && !profile.is_complete) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="card p-8 text-center">
          <h1 className="text-xl font-bold">{t.dashboard.incompleteTitle}</h1>
          <p className="mt-2 text-sm muted">{t.dashboard.incompleteBody}</p>
          <div className="mx-auto mt-5 max-w-xs">
            <Meter
              value={profile.completed_steps}
              max={4}
              right={`${localiseDigits(profile.completed_steps, locale)} / ${localiseDigits(4, locale)}`}
            />
          </div>
          <Link href={`/${locale}/onboarding`} className="btn btn-primary mt-6">
            {t.dashboard.continueProfile}
          </Link>
        </div>
      </div>
    );
  }

  const top = result?.recommendations ?? [];
  const gapData = (gap?.skills ?? [])
    .slice(0, 8)
    .map((entry) => ({ skill: pick(entry, "name"), current: entry.current, required: entry.required }));
  const openGaps = (gap?.skills ?? []).filter((entry) => entry.gap > 0);

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-10 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black">{t.dashboard.title}</h1>
          <p className="mt-1 text-sm muted">
            {t.dashboard.welcome}, {profile?.full_name || user?.full_name}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs muted">{t.dashboard.downloadReport}:</span>
          {(["en", "ar"] as const).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => void download(lang)}
              disabled={downloading !== null}
              className="btn btn-ghost !py-1.5 text-sm"
            >
              {downloading === lang
                ? t.dashboard.generating
                : lang === "en"
                  ? t.dashboard.downloadEn
                  : t.dashboard.downloadAr}
            </button>
          ))}
        </div>
      </header>

      {error && <ErrorBox message={error} />}
      {!result && !error && <Loading />}

      {result && (
        <>
          {/* ------------------------------------------------- recommendations */}
          <section aria-labelledby="matches">
            <SectionHeading
              id="matches"
              title={t.dashboard.topMatches}
              subtitle={t.dashboard.topMatchesHelp}
            />
            <ul className="grid gap-3 lg:grid-cols-2">
              {top.map((item) => {
                const isSelected = selected === item.career_id;
                const isSaved = savedIds.includes(item.career_id);
                return (
                  <li key={item.career_id}>
                    <article
                      className={`card h-full p-5 transition-colors ${
                        isSelected ? "border-[var(--brand)]" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          aria-hidden="true"
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--surface-3)] text-sm font-bold ltr-nums"
                        >
                          {localiseDigits(item.rank, locale)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <span
                            className="text-[11px] font-semibold"
                            style={{ color: item.sector_color }}
                          >
                            {pick(item, "sector_name")}
                          </span>
                          <h3 className="font-bold leading-snug">
                            <Link
                              href={`/${locale}/careers/${item.career_id}`}
                              className="hover:underline"
                            >
                              {pick(item.career, "title")}
                            </Link>
                          </h3>
                        </div>
                        <div className="shrink-0 text-end">
                          <span className="block text-lg font-black ltr-nums text-[var(--brand)]">
                            {localiseDigits(Math.round(item.match), locale)}%
                          </span>
                          <span className="block text-[10px] muted">{t.dashboard.match}</span>
                        </div>
                      </div>

                      <p className="mt-3 text-xs font-semibold muted">{t.dashboard.whyThis}</p>
                      <ul className="mt-1.5 space-y-1">
                        {item.reasons.map((reason) => (
                          <li key={reason.factor} className="flex gap-2 text-sm">
                            <span aria-hidden="true" className="text-[var(--brand)]">
                              ✓
                            </span>
                            <span>{pick(reason, "label")}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <Chip tone={item.confidence === "high" ? "brand" : "neutral"}>
                          {t.dashboard.confidence}: {t.common[item.confidence]}
                        </Chip>
                        <button
                          type="button"
                          onClick={() => setSelected(item.career_id)}
                          className="btn btn-ghost !py-1.5 text-xs"
                        >
                          {isSelected ? t.dashboard.selected : t.dashboard.selectCareer}
                        </button>
                        <button
                          type="button"
                          onClick={() => void toggleSaved(item.career_id)}
                          aria-pressed={isSaved}
                          className="btn btn-ghost !py-1.5 text-xs"
                        >
                          {isSaved ? `★ ${t.dashboard.saved}` : `☆ ${t.dashboard.save}`}
                        </button>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* --------------------------------------------------------- profile */}
          <section aria-labelledby="profile">
            <SectionHeading id="profile" title={t.dashboard.profileTitle} />
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="card p-5">
                <h3 className="text-sm font-bold">{t.dashboard.interests}</h3>
                <RiasecRadar scores={profile?.riasec ?? {}} />
              </div>
              <div className="card p-5">
                <h3 className="text-sm font-bold">{t.dashboard.personality}</h3>
                <BigFiveBars scores={profile?.bigfive ?? {}} />
              </div>
              <div className="card p-5">
                <h3 className="text-sm font-bold">{t.dashboard.sectorFit}</h3>
                <p className="mt-0.5 text-xs muted">{t.dashboard.sectorFitHelp}</p>
                <div className="mt-3 space-y-2.5">
                  {result.sector_probabilities.slice(0, 6).map((entry) => (
                    <Meter
                      key={entry.sector}
                      value={entry.probability * 100}
                      label={pick(entry, "name")}
                      right={`${localiseDigits((entry.probability * 100).toFixed(1), locale)}%`}
                      color={entry.color}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ------------------------------------------------------- skill gap */}
          {gap && (
            <section aria-labelledby="gap">
              <SectionHeading
                id="gap"
                title={`${t.dashboard.gapTitle} — ${pick(gap, "career_title")}`}
                subtitle={t.dashboard.gapHelp}
              />
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="card p-5">
                  <SkillGapChart data={gapData} />
                </div>
                <div className="card p-5">
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-sm font-bold">{t.dashboard.readiness}</h3>
                    <span className="text-2xl font-black ltr-nums text-[var(--brand)]">
                      {localiseDigits(Math.round(gap.readiness), locale)}%
                    </span>
                  </div>
                  <div className="mt-2">
                    <Meter value={gap.readiness} />
                  </div>
                  {openGaps.length === 0 ? (
                    <p className="mt-4 text-sm muted">{t.dashboard.noGaps}</p>
                  ) : (
                    <ul className="mt-4 space-y-3">
                      {openGaps.slice(0, 6).map((entry) => (
                        <li key={entry.skill_id}>
                          <Meter
                            value={entry.current}
                            label={pick(entry, "name")}
                            right={`${localiseDigits(Math.round(entry.current), locale)} → ${localiseDigits(entry.required, locale)}`}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* --------------------------------------------------------- roadmap */}
          {roadmap && (
            <section aria-labelledby="roadmap">
              <SectionHeading
                id="roadmap"
                title={t.dashboard.roadmapTitle}
                subtitle={t.dashboard.roadmapHelp}
              />
              <div className="mb-5 grid gap-3 sm:grid-cols-3">
                <StatTile value={roadmap.total_courses} label={t.dashboard.totalCourses} />
                <StatTile value={roadmap.total_weeks} label={t.dashboard.totalWeeks} />
                <StatTile value={roadmap.free_courses} label={t.dashboard.freeCourses} />
              </div>
              <ol className="space-y-6">
                {roadmap.phases
                  .filter((phase) => phase.courses.length > 0)
                  .map((phase) => (
                    <li key={phase.id}>
                      <h3 className="mb-3 flex items-center gap-2 font-bold">
                        <span
                          aria-hidden="true"
                          className="h-2.5 w-2.5 rounded-full bg-[var(--brand)]"
                        />
                        {pick(phase, "label")}
                      </h3>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {phase.courses.map((course) => (
                          <CourseCard
                            key={course.id}
                            course={course}
                            kind={course.kind}
                            forSkill={pick(course, "skill_name")}
                          />
                        ))}
                      </div>
                    </li>
                  ))}
              </ol>
            </section>
          )}

          {/* ---------------------------------------------------------- skills */}
          <section aria-labelledby="skills">
            <SectionHeading id="skills" title={t.dashboard.skillsTitle} />
            <div className="card grid gap-x-8 gap-y-3 p-5 sm:grid-cols-2">
              {skills.slice(0, 16).map((skill) => (
                <Meter
                  key={skill.skill_id}
                  value={skill.value}
                  label={pick(skill, "name")}
                  right={localiseDigits(Math.round(skill.value), locale)}
                />
              ))}
            </div>
          </section>

          {/* ----------------------------------------------------------- saved */}
          <section aria-labelledby="saved">
            <SectionHeading id="saved" title={t.dashboard.savedTitle} />
            {savedIds.length === 0 ? (
              <EmptyState message={t.dashboard.savedEmpty} />
            ) : (
              <ul className="flex flex-wrap gap-2">
                {savedIds.map((careerId) => {
                  const match = top.find((item) => item.career_id === careerId);
                  return (
                    <li key={careerId}>
                      <Link href={`/${locale}/careers/${careerId}`} className="btn btn-ghost !py-2 text-sm">
                        ★ {match ? pick(match.career, "title") : careerId}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
