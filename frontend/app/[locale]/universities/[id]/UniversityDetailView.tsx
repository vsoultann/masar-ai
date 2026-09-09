"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import SmartImage from "@/components/SmartImage";
import { Chip, ErrorBox, Loading, SectionHeading, Skeleton } from "@/components/ui";
import { indexBy, loadMajors, loadUniversity } from "@/lib/data/client";
import { localiseDigits } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import { assessEligibility, haversineKm, studentLocation } from "@/lib/matching/universities";
import { useProfile } from "@/lib/store/profile";
import type { Major, University } from "@/lib/types";

const UniversityMap = dynamic(() => import("@/components/UniversityMap"), {
  ssr: false,
  loading: () => <Skeleton className="h-[320px]" />,
});

export default function UniversityDetailView() {
  const { locale, t, lookup } = useLocale();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const profile = useProfile((state) => state.profile);
  const toggleSaved = useProfile((state) => state.toggleSavedUniversity);
  const isSaved = !!profile?.savedUniversities.includes(id ?? "");

  const [university, setUniversity] = useState<University | null>(null);
  const [majors, setMajors] = useState<Map<string, Major>>(new Map());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    Promise.all([loadUniversity(id), loadMajors()])
      .then(([found, majorRows]) => {
        if (cancelled) return;
        if (!found) setError(t.errors.notFound);
        else setUniversity(found);
        setMajors(indexBy(majorRows));
      })
      .catch(() => {
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
        <Link href={`/${locale}/universities`} className="btn btn-ghost mt-4">
          {t.universities.title}
        </Link>
      </div>
    );
  }

  if (!university) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Loading />
      </div>
    );
  }

  const you = studentLocation(profile);
  const distanceKm = you ? haversineKm(you, university.coordinates) : null;
  const eligibility = profile ? assessEligibility(university, profile) : null;
  const eligibilityLabel = {
    likely_eligible: t.universities.eligibleLikely,
    borderline: t.universities.eligibleBorderline,
    below_indicative: t.universities.eligibleBelow,
  } as const;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link href={`/${locale}/universities`} className="text-sm muted hover:text-[var(--ink)]">
        <span aria-hidden="true" className="flip-rtl inline-block">←</span>{" "}
        {t.universities.title}
      </Link>

      <header className="mt-4">
        <h1 className="text-2xl font-black sm:text-3xl">{university.name[locale]}</h1>
        <p className="mt-1 text-sm muted">
          {lookup(t.universities.typeLabels, university.type)} ·{" "}
          {lookup(t.emirates, university.emirate)}
          {distanceKm !== null && (
            <>
              {" · "}
              <span className="ltr-nums">
                {localiseDigits(Math.round(distanceKm), locale)}
              </span>{" "}
              {t.universities.distanceAway}
            </>
          )}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {eligibility && <Chip tone={eligibility === "likely_eligible" ? "brand" : eligibility === "borderline" ? "neutral" : "warn"}>
            {eligibilityLabel[eligibility]}
          </Chip>}
          <Chip>{lookup(t.universities.tuitionLabels, university.tuitionBand)}</Chip>
          <Chip>{university.accreditation}</Chip>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={university.website}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary text-sm"
          >
            {t.universities.officialSite}
          </a>
          {profile && (
            <button
              type="button"
              onClick={() => toggleSaved(university.id)}
              aria-pressed={isSaved}
              className={`btn text-sm ${isSaved ? "btn-primary" : "btn-ghost"}`}
            >
              {isSaved ? t.careers.saved : t.careers.save}
            </button>
          )}
        </div>
      </header>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <SmartImage
          src={university.media.hero}
          alt={university.name[locale]}
          seed={university.id}
          aspect="16 / 10"
        />
        <UniversityMap universities={[university]} you={you} height={260} />
      </div>

      <section className="mt-8">
        <SectionHeading title={t.universities.campusLife} />
        <p className="max-w-3xl leading-relaxed">{university.campusLife[locale]}</p>
        <p className="mt-2 text-sm muted">{university.address[locale]}</p>
      </section>

      <section className="mt-10">
        <SectionHeading title={t.universities.admission} />
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-start text-sm">
            <tbody>
              <tr className="border-b">
                <th className="p-3 text-start font-medium muted">{t.universities.minAverage}</th>
                <td className="p-3 ltr-nums">
                  {localiseDigits(university.admission.minHighSchoolPercent, locale)}%
                </td>
              </tr>
              {Object.entries(university.admission.emsatRequirements).map(([subject, score]) => (
                <tr key={subject} className="border-b">
                  <th className="p-3 text-start font-medium muted">
                    {t.universities.emsat} · {lookup(t.subjects, subject)}
                  </th>
                  <td className="p-3 ltr-nums">{localiseDigits(score, locale)}</td>
                </tr>
              ))}
              <tr className="border-b">
                <th className="p-3 text-start font-medium muted">{t.universities.trackRequired}</th>
                <td className="p-3">
                  {university.admission.trackRequired
                    .map((track) => lookup(t.tracks, track))
                    .join("، ")}
                </td>
              </tr>
              <tr className="border-b">
                <th className="p-3 text-start font-medium muted">{t.universities.languages}</th>
                <td className="p-3">
                  {university.languageOfInstruction
                    .map((language) =>
                      language === "ar" ? t.common.languageAr : t.common.languageEn,
                    )
                    .join("، ")}
                </td>
              </tr>
              <tr>
                <th className="p-3 text-start font-medium muted">{t.universities.established}</th>
                <td className="p-3 ltr-nums">{localiseDigits(university.established, locale)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs muted">{university.admission.notes[locale]}</p>
        <p className="mt-1 text-xs muted">{t.universities.indicativeWarning}</p>
      </section>

      <section className="mt-10">
        <SectionHeading title={t.universities.allMajors} />
        <ul className="flex flex-wrap gap-2">
          {university.majorsOffered.map((majorId) => {
            const major = majors.get(majorId);
            return (
              <li key={majorId}>
                <Chip>{major ? major.name[locale] : majorId}</Chip>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
