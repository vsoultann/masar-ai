"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import CareerCard from "@/components/CareerCard";
import UniversityCard from "@/components/UniversityCard";
import { BigFiveBars, RiasecRadar } from "@/components/charts";
import { EmptyState, SectionHeading, StatTile } from "@/components/ui";
import {
  indexBy, loadCareerIndex, loadSectors, loadUniversities,
} from "@/lib/data/client";
import { useLocale } from "@/lib/locale-context";
import { revealContainer, revealItem } from "@/lib/motion";
import { isComplete, useProfile } from "@/lib/store/profile";
import type { CareerSummary, Sector, University } from "@/lib/types";

/**
 * The student's own page: profile summary, saved items, and the controls for
 * moving a profile between devices.
 *
 * Export/import is not a nice-to-have here. With no account, this browser's
 * storage *is* the account, and the page says so plainly rather than letting a
 * student discover it by clearing their history.
 */
export default function DashboardPage() {
  const { locale, t, lookup } = useLocale();

  const profile = useProfile((state) => state.profile);
  const hydrated = useProfile((state) => state.hydrated);
  const exportProfile = useProfile((state) => state.exportProfile);
  const importProfile = useProfile((state) => state.importProfile);
  const clearProfile = useProfile((state) => state.clear);

  const [careers, setCareers] = useState<Map<string, CareerSummary>>(new Map());
  const [universities, setUniversities] = useState<Map<string, University>>(new Map());
  const [sectors, setSectors] = useState<Map<string, Sector>>(new Map());
  const [notice, setNotice] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadCareerIndex(), loadUniversities(), loadSectors()])
      .then(([careerRows, universityRows, sectorRows]) => {
        if (cancelled) return;
        setCareers(indexBy(careerRows));
        setUniversities(indexBy(universityRows));
        setSectors(indexBy(sectorRows));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!hydrated) return <div className="mx-auto max-w-5xl px-4 py-16" />;

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <EmptyState message={t.results.noProfile} />
        <Link href={`/${locale}/assessment`} className="btn btn-primary mt-5">
          {t.results.startAssessment}
        </Link>
      </div>
    );
  }

  const download = () => {
    const blob = new Blob([exportProfile()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `masar-profile-${profile.id.slice(0, 8)}.json`;
    anchor.click();
    // Revoking immediately can cancel the download in some browsers, so the
    // object URL is released on the next tick instead.
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const onFile = async (file: File) => {
    const text = await file.text();
    const outcome = importProfile(text);
    setNotice(
      outcome.ok
        ? t.dashboard.importOk
        : outcome.error === "notJson"
          ? t.dashboard.importFailedNotJson
          : outcome.error === "wrongFormat"
            ? t.dashboard.importFailedWrongFormat
            : t.dashboard.importFailedNotProfile,
    );
  };

  const savedCareers = profile.savedCareers
    .map((id) => careers.get(id))
    .filter((c): c is CareerSummary => c !== undefined);
  const savedUniversities = profile.savedUniversities
    .map((id) => universities.get(id))
    .filter((u): u is University => u !== undefined);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <header>
        <h1 className="text-2xl font-black sm:text-3xl">{profile.fullName || t.brand.name}</h1>
        <p className="mt-1 text-sm muted">
          {profile.emirate ? lookup(t.emirates, profile.emirate) : ""}
          {profile.school ? ` · ${profile.school}` : ""}
        </p>
      </header>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <StatTile
          label={t.wizard.track}
          value={profile.track ? lookup(t.tracks, profile.track) : "—"}
        />
        <StatTile label={t.dashboard.savedCareers} value={String(savedCareers.length)} />
        <StatTile
          label={t.results.title}
          value={isComplete(profile) ? "✓" : `${profile.completedSteps}/4`}
        />
      </div>

      {!isComplete(profile) && (
        <div className="card mt-4 p-4">
          <p className="text-sm">{t.results.noProfile}</p>
          <Link href={`/${locale}/assessment`} className="btn btn-primary mt-3 text-sm">
            {t.results.startAssessment}
          </Link>
        </div>
      )}

      {isComplete(profile) && (
        <section className="mt-10">
          <SectionHeading title={t.dashboard.title} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="card p-4">
              <h3 className="mb-2 text-sm font-semibold">{t.dashboard.riasecTitle}</h3>
              <RiasecRadar scores={profile.riasec} />
            </div>
            <div className="card p-4">
              <h3 className="mb-2 text-sm font-semibold">{t.dashboard.bigfiveTitle}</h3>
              <BigFiveBars scores={profile.bigfive} />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/${locale}/results`} className="btn btn-primary">
              {t.results.title}
            </Link>
            <Link href={`/${locale}/skills`} className="btn btn-ghost">
              {t.skills.title}
            </Link>
          </div>
        </section>
      )}

      <section className="mt-10">
        <SectionHeading title={t.dashboard.savedCareers} />
        {savedCareers.length === 0 ? (
          <EmptyState message={t.dashboard.noSaved} />
        ) : (
          <motion.div
            variants={revealContainer(0.05)}
            initial="hidden"
            animate="show"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {savedCareers.map((career) => (
              <CareerCard key={career.id} career={career} sector={sectors.get(career.sector)} />
            ))}
          </motion.div>
        )}
      </section>

      <section className="mt-10">
        <SectionHeading title={t.dashboard.savedUniversities} />
        {savedUniversities.length === 0 ? (
          <EmptyState message={t.dashboard.noSaved} />
        ) : (
          <motion.div
            variants={revealContainer(0.05)}
            initial="hidden"
            animate="show"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {savedUniversities.map((university) => (
              <motion.div key={university.id} variants={revealItem}>
                <UniversityCard university={university} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

      {/* --- portability -------------------------------------------------- */}
      <section className="mt-12">
        <SectionHeading title={t.dashboard.exportProfile} />
        <div className="card space-y-4 p-5">
          <p className="text-sm muted">{t.dashboard.localOnly}</p>

          {notice && (
            <p role="status" className="text-sm font-medium text-[var(--brand)]">
              {notice}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={download} className="btn btn-ghost text-sm">
              {t.dashboard.exportProfile}
            </button>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="btn btn-ghost text-sm"
            >
              {t.dashboard.importProfile}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void onFile(file);
                event.target.value = "";
              }}
            />
            <button
              type="button"
              className="btn btn-ghost text-sm text-[var(--uae-red-muted)]"
              onClick={() => {
                if (window.confirm(t.dashboard.deleteConfirm)) clearProfile();
              }}
            >
              {t.dashboard.deleteProfile}
            </button>
          </div>

          <p className="text-xs muted">{t.dashboard.exportHelp}</p>
        </div>
      </section>
    </div>
  );
}
