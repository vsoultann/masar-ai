"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import CampusArt from "@/components/art/CampusArt";
import CareerArt from "@/components/art/CareerArt";
import CountUp from "@/components/CountUp";
import MiniDemo from "@/components/MiniDemo";
import TypedHeadline from "@/components/TypedHeadline";
import { SectionHeading } from "@/components/ui";
import { loadCareerIndex, loadSectors } from "@/lib/data/client";
import { useLocale } from "@/lib/locale-context";
import { cardHover, revealContainer, revealItem, viewportOnce } from "@/lib/motion";
import { useProfile } from "@/lib/store/profile";
import { SUPERVISOR, TEAM } from "@/lib/team";
import type { CareerSummary, Sector } from "@/lib/types";

/**
 * The landing page.
 *
 * Every figure on it is read from the catalogs rather than typed into the copy,
 * so the page cannot claim 140 careers after the catalog grows to 184 — which
 * is exactly the kind of stale marketing number that undermines everything
 * beside it.
 */
export default function LandingPage() {
  const { locale, t } = useLocale();
  const reduced = useReducedMotion();
  const profile = useProfile((state) => state.profile);

  const [sectors, setSectors] = useState<Sector[] | null>(null);
  const [careers, setCareers] = useState<CareerSummary[]>([]);

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 90]);
  const heroFade = useTransform(scrollYProgress, [0, 0.8], [1, reduced ? 1 : 0.25]);

  useEffect(() => {
    Promise.all([loadSectors(), loadCareerIndex()])
      .then(([sectorRows, careerRows]) => {
        setSectors(sectorRows);
        setCareers(careerRows);
      })
      .catch(() => setSectors([]));
  }, []);

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
    { title: t.landing.f1Title, body: t.landing.f1Body },
    { title: t.landing.f2Title, body: t.landing.f2Body },
    { title: t.landing.f3Title, body: t.landing.f3Body },
    { title: t.landing.f4Title, body: t.landing.f4Body },
    { title: t.landing.f5Title, body: t.landing.f5Body },
    { title: t.landing.f6Title, body: t.landing.f6Body },
  ];

  // Career count per sector, for the showcase tiles.
  const bySector = new Map<string, CareerSummary[]>();
  for (const career of careers) {
    const bucket = bySector.get(career.sector);
    if (bucket) bucket.push(career);
    else bySector.set(career.sector, [career]);
  }

  // A handful of cards that drift behind the hero.
  const floaters = careers.length > 0
    ? ["radiologist", "commercial_pilot", "software_engineer", "architect", "lawyer", "chef"]
        .map((id) => careers.find((career) => career.id === id))
        .filter((career): career is CareerSummary => career !== undefined)
    : [];

  return (
    <div className="overflow-clip">
      {/* ------------------------------------------------------------- hero */}
      <section ref={heroRef} className="relative">
        <motion.div
          style={{ y: heroY, opacity: heroFade }}
          className="mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24"
        >
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand)]" aria-hidden />
                {t.landing.eyebrow}
              </motion.p>

              {/* The gradient clips the whole subtree's glyphs, so the typed
                  text inherits it as it appears, character by character. The
                  caret keeps its own solid brand fill and stays visible. */}
              <h1 className="text-gradient mt-5 text-4xl font-black leading-[1.1] sm:text-5xl lg:text-6xl">
                <TypedHeadline phrases={[t.landing.heroLine1, t.landing.heroLine2]} />
              </h1>

              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.15 } }}
                className="mt-5 max-w-xl text-base leading-relaxed muted sm:text-lg"
              >
                {t.landing.subtitle}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.25 } }}
                className="mt-7 flex flex-wrap gap-3"
              >
                <Link href={startHref} className="btn btn-primary px-5 py-2.5">
                  {t.landing.ctaPrimary}
                </Link>
                <Link href={`/${locale}/careers`} className="btn btn-ghost px-5 py-2.5">
                  {t.landing.exploreCareers}
                </Link>
              </motion.div>
            </div>

            {/* Drifting career cards.
                They were decorative and aria-hidden, which made six obvious
                affordances do nothing when clicked — the commonest way a
                landing page teaches someone that nothing on it is real. They
                are links now: they lift and brighten on hover and go to the
                career. Still frozen under reduced motion. */}
            <div className="relative hidden h-[26rem] lg:block">
              {floaters.map((career, index) => {
                const angle = (index / floaters.length) * Math.PI * 2;
                const x = Math.cos(angle) * 120;
                const y = Math.sin(angle) * 140;
                return (
                  <motion.div
                    key={career.id}
                    className="absolute left-1/2 top-1/2 w-52"
                    style={{ marginLeft: x - 104, marginTop: y - 66 }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      y: reduced ? 0 : [0, index % 2 ? 10 : -10, 0],
                    }}
                    transition={{
                      opacity: { delay: 0.1 * index },
                      scale: { delay: 0.1 * index },
                      y: { duration: 6 + index, repeat: Infinity, ease: "easeInOut" },
                    }}
                    whileHover={reduced ? undefined : { scale: 1.06, zIndex: 10 }}
                  >
                    <Link
                      href={`/${locale}/careers/${career.id}`}
                      className="group block overflow-hidden rounded-xl border shadow-xl transition-[border-color,box-shadow] hover:border-[var(--brand)] hover:shadow-2xl focus-visible:border-[var(--brand)]"
                    >
                      <div className="relative">
                        <CareerArt
                          sector={career.sector}
                          seed={career.id}
                          className="h-28 w-full"
                        />
                        {/* Appears on hover so the card reads as a link before
                            it is clicked, not after. */}
                        <span className="absolute inset-0 grid place-items-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                          <span className="rounded-full bg-[var(--brand)] px-3 py-1 text-[11px] font-bold text-[var(--brand-ink)]">
                            {t.careers.viewCareer}
                          </span>
                        </span>
                      </div>
                      <p className="truncate bg-[var(--surface)] px-3 py-2 text-xs font-semibold group-hover:text-[var(--brand)]">
                        {career.title[locale]}
                      </p>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ------------------------------------------------------------ stats */}
      <section className="border-y bg-[var(--surface-2-translucent)] backdrop-blur-md">
        <motion.dl
          variants={revealContainer(0.08)}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 sm:px-6 lg:grid-cols-4"
        >
          {[
            { value: careers.length, label: t.landing.statsCareers },
            { value: 50, label: t.landing.statsInstitutions },
            { value: sectors?.length ?? 0, label: t.landing.statsSectors },
            { value: 2, label: t.landing.statsLanguages },
          ].map((stat) => (
            <motion.div key={stat.label} variants={revealItem}>
              <dt className="display text-gradient text-3xl font-black sm:text-4xl">
                <CountUp value={stat.value} />
              </dt>
              <dd className="mt-1 text-sm muted">{stat.label}</dd>
            </motion.div>
          ))}
        </motion.dl>
      </section>

      {/* -------------------------------------------------------- try it */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="eyebrow">{t.landing.eyebrow}</p>
            <h2 className="text-gradient mt-1 text-2xl font-black sm:text-3xl">
              {t.landing.demoTitle}
            </h2>
            <p className="mt-3 max-w-md leading-relaxed muted">{t.landing.demoSubtitle}</p>
          </div>
          <MiniDemo />
        </div>
      </section>

      {/* ------------------------------------------------------- how it works */}
      <section className="border-t bg-[var(--surface-2-translucent)] backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <SectionHeading title={t.landing.howTitle} />
          <p className="-mt-2 mb-8 max-w-2xl muted">{t.landing.howSubtitle}</p>

          <motion.ol
            variants={revealContainer(0.1)}
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
          >
            {steps.map((step, index) => (
              <motion.li key={step.title} variants={revealItem} className="card p-5">
                <span
                  aria-hidden
                  className="grid h-9 w-9 place-items-center rounded-full bg-[var(--brand)] text-sm font-black text-[var(--brand-ink)]"
                >
                  {index + 1}
                </span>
                <h3 className="mt-3 font-bold">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed muted">{step.body}</p>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </section>

      {/* ---------------------------------------------------- sector showcase */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <SectionHeading title={t.landing.sectorsTitle} />
        <p className="-mt-2 mb-8 max-w-2xl muted">{t.landing.sectorsSubtitle}</p>

        <motion.div
          variants={revealContainer(0.05)}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {(sectors ?? []).map((sector) => {
            const count = bySector.get(sector.id)?.length ?? 0;
            if (count === 0) return null;
            return (
              <motion.div key={sector.id} variants={revealItem} {...cardHover}>
                <Link
                  href={`/${locale}/careers?sector=${sector.id}`}
                  className="group block overflow-hidden rounded-[var(--radius-card)] border"
                >
                  <div className="relative h-32 overflow-hidden">
                    <div className="h-full w-full transition-transform duration-500 group-hover:scale-110">
                      <CareerArt sector={sector.id} seed={sector.id} className="h-full w-full" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 bg-[var(--surface)] p-4">
                    <h3 className="text-sm font-bold">
                      {locale === "ar" ? sector.name_ar : sector.name_en}
                    </h3>
                    <span className="shrink-0 text-xs font-semibold muted ltr-nums">
                      <CountUp value={count} /> {t.landing.sectorCareers}
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* ------------------------------------------------------- universities */}
      <section className="border-y bg-[var(--surface-2-translucent)] backdrop-blur-md">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2">
          <div className="grid grid-cols-2 gap-3">
            {["uaeu", "ku", "aus", "mbru"].map((id, index) => (
              <motion.div
                key={id}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0, transition: { delay: index * 0.08 } }}
                viewport={viewportOnce}
                className="overflow-hidden rounded-xl border"
              >
                <CampusArt
                  type={index % 2 ? "federal_public" : "private"}
                  seed={id}
                  className="h-28 w-full"
                />
              </motion.div>
            ))}
          </div>
          <div>
            <h2 className="text-2xl font-black sm:text-3xl">{t.universities.title}</h2>
            <p className="mt-3 max-w-md leading-relaxed muted">{t.universities.subtitle}</p>
            <Link href={`/${locale}/universities`} className="btn btn-primary mt-5">
              {t.landing.exploreUniversities}
            </Link>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- features */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <SectionHeading title={t.landing.featuresTitle} />
        <motion.div
          variants={revealContainer(0.06)}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature) => (
            <motion.div key={feature.title} variants={revealItem} className="card p-5">
              <h3 className="font-bold">{feature.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed muted">{feature.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* --------------------------------------------------------------- team */}
      <section className="border-t bg-[var(--surface-2-translucent)] backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <SectionHeading title={t.landing.teamTitle} />
          <p className="-mt-2 mb-8 max-w-2xl muted">{t.landing.teamSubtitle}</p>

          <motion.ul
            variants={revealContainer(0.07)}
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {/* The supervisor first, and deliberately not styled like a member:
                accent border, accent initials and a bold accent role line, so
                the distinction is visible before anyone reads the label. */}
            <motion.li
              variants={revealItem}
              className="card border-[var(--accent)]/45 p-5 text-center"
              style={{ background: "color-mix(in oklab, var(--accent) 7%, transparent)" }}
            >
              <span
                aria-hidden
                className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--accent)]/15 text-lg font-black text-[var(--accent)]"
              >
                {SUPERVISOR.split(" ").slice(0, 2).map((part) => part[0]).join("")}
              </span>
              <h3 className="mt-3 text-sm font-black leading-tight text-[var(--accent)]">
                {SUPERVISOR}
              </h3>
              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-[var(--accent)]">
                {t.landing.supervisorLabel}
              </p>
            </motion.li>

            {TEAM.map((member) => (
              <motion.li key={member.name} variants={revealItem} className="card p-5 text-center">
                <span
                  aria-hidden
                  className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--brand)]/12 text-lg font-black text-[var(--brand)]"
                >
                  {member.name
                    .split(" ")
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join("")}
                </span>
                <h3 className="mt-3 text-sm font-bold leading-tight">{member.name}</h3>
                <p className="mt-1 text-xs muted">
                  {t.about[member.roleKey as keyof typeof t.about] as string}
                </p>
              </motion.li>
            ))}
          </motion.ul>
        </div>
      </section>

      {/* ---------------------------------------------------------- final CTA */}
      <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
        <h2 className="text-gradient text-3xl font-black sm:text-4xl">
          {t.landing.ctaFinalTitle}
        </h2>
        <p className="mx-auto mt-4 max-w-xl leading-relaxed muted">{t.landing.ctaFinalBody}</p>
        <Link href={startHref} className="btn btn-primary mt-7 px-6 py-3 text-base">
          {t.landing.ctaPrimary}
        </Link>
      </section>
    </div>
  );
}
