"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import ArabesquePattern from "@/components/ArabesquePattern";
import { SectionHeading, Skeleton } from "@/components/ui";
import { localiseDigits } from "@/lib/i18n";
import { loadSectors } from "@/lib/data/client";
import { useProfile } from "@/lib/store/profile";
import { useLocale } from "@/lib/locale-context";
import { TEAM } from "@/lib/team";
import type { Sector } from "@/lib/types";

export default function LandingPage() {
  const { locale, t, pick } = useLocale();
  const profile = useProfile((state) => state.profile);
  const [sectors, setSectors] = useState<Sector[] | null>(null);

  useEffect(() => {
    loadSectors()
      .then(setSectors)
      .catch(() => setSectors([]));
  }, []);

  // There is no registration step any more: the assessment creates the local
  // profile itself, so both the new and returning visitor start in the same
  // place. A returning student with a finished assessment goes to their results.
  const startHref =
    profile && profile.completedSteps >= 4
      ? `/${locale}/results`
      : `/${locale}/assessment`;

  const steps = [
    { title: t.landing.step1Title, body: t.landing.step1Body },
    { title: t.landing.step2Title, body: t.landing.step2Body },
    { title: t.landing.step3Title, body: t.landing.step3Body },
    { title: t.landing.step4Title, body: t.landing.step4Body },
  ];

  const features = [
    { title: t.landing.f1Title, body: t.landing.f1Body, icon: "◎" },
    { title: t.landing.f2Title, body: t.landing.f2Body, icon: "◑" },
    { title: t.landing.f3Title, body: t.landing.f3Body, icon: "⌁" },
    { title: t.landing.f4Title, body: t.landing.f4Body, icon: "✦" },
    { title: t.landing.f5Title, body: t.landing.f5Body, icon: "⬡" },
    { title: t.landing.f6Title, body: t.landing.f6Body, icon: "⎙" },
  ];

  return (
    <>
      {/* ---------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden border-b">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 text-[var(--brand)]"
        >
          <ArabesquePattern opacity={0.07} />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--brand)]">
              {t.landing.eyebrow}
            </p>
            <h1 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">
              {t.landing.title}
            </h1>
            <p className="mt-5 text-base leading-relaxed muted sm:text-lg">
              {t.landing.subtitle}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={startHref} className="btn btn-primary !px-6 !py-3">
                {t.landing.ctaPrimary}
              </Link>
              <Link href={`/${locale}/careers`} className="btn btn-ghost !px-6 !py-3">
                {t.landing.ctaSecondary}
              </Link>
            </div>
            <p className="mt-4 text-xs muted ltr-nums">{t.landing.demoNote}</p>
          </div>

          <dl className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { value: 60, label: t.landing.statsCareers },
              { value: 120, label: t.landing.statsCourses },
              { value: 15, label: t.landing.statsSectors },
              { value: 55, label: t.landing.statsQuestions },
            ].map((stat) => (
              <div key={stat.label} className="card p-4">
                <dt className="sr-only">{stat.label}</dt>
                <dd>
                  <span className="block text-3xl font-black text-[var(--brand)] ltr-nums">
                    {localiseDigits(stat.value, locale)}
                  </span>
                  <span className="mt-1 block text-sm muted">{stat.label}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ------------------------------------------------------------ how it works */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <SectionHeading title={t.landing.howTitle} subtitle={t.landing.howSubtitle} />
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li key={step.title} className="card p-5">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--brand)] font-bold text-[var(--brand-ink)] ltr-nums">
                {localiseDigits(index + 1, locale)}
              </span>
              <h3 className="mt-3 font-bold">{step.title}</h3>
              <p className="mt-1.5 text-sm muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* -------------------------------------------------------------- features */}
      <section className="border-y bg-[var(--surface-2)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <SectionHeading title={t.landing.featuresTitle} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="card bg-[var(--surface)] p-5">
                <span
                  aria-hidden="true"
                  className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--brand)]/12 text-lg text-[var(--brand)]"
                >
                  {feature.icon}
                </span>
                <h3 className="mt-3 font-bold">{feature.title}</h3>
                <p className="mt-1.5 text-sm muted">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- sectors */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <SectionHeading
          title={t.landing.sectorsTitle}
          subtitle={t.landing.sectorsSubtitle}
        />
        {sectors === null ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-24" />
            ))}
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sectors.map((sector) => (
              <li key={sector.id}>
                <Link
                  href={`/${locale}/careers?sector=${sector.id}`}
                  className="card flex items-center gap-4 p-4 transition-colors hover:border-[var(--brand)]"
                >
                  <span
                    aria-hidden="true"
                    className="h-10 w-1.5 shrink-0 rounded-full"
                    style={{ background: sector.color }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{pick(sector, "name")}</span>
                    <span className="mt-0.5 block text-xs muted ltr-nums">
                      {localiseDigits(sector.career_count ?? 0, locale)}{" "}
                      {t.landing.sectorCareers}
                    </span>
                  </span>
                  <span aria-hidden="true" className="muted flip-rtl">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ------------------------------------------------------------------ team */}
      <section className="border-y bg-[var(--surface-2)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <SectionHeading title={t.landing.teamTitle} subtitle={t.landing.teamSubtitle} />
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {TEAM.map((member) => (
              <li key={member.name} className="card bg-[var(--surface)] p-4 text-center">
                <span
                  aria-hidden="true"
                  className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--brand)]/12 text-lg font-bold text-[var(--brand)]"
                >
                  {member.name.charAt(0)}
                </span>
                <p className="mt-2.5 text-sm font-semibold leading-snug">{member.name}</p>
                <p className="mt-1 text-xs muted">{t.about[member.roleKey]}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* -------------------------------------------------------------- final cta */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="card relative overflow-hidden p-8 text-center sm:p-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 text-[var(--brand)]"
          >
            <ArabesquePattern opacity={0.05} />
          </div>
          <div className="relative">
            <h2 className="text-2xl font-black sm:text-3xl">{t.landing.ctaFinalTitle}</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm muted">{t.landing.ctaFinalBody}</p>
            <Link href={startHref} className="btn btn-primary mt-6 !px-6 !py-3">
              {t.landing.ctaPrimary}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
