"use client";

import Link from "next/link";

import { TEAM } from "@/lib/team";
import { useLocale } from "@/lib/locale-context";

export default function Footer() {
  const { locale, t } = useLocale();

  return (
    <footer className="mt-16 border-t bg-[var(--surface-2)]">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--brand)] text-[var(--brand-ink)] font-bold"
            >
              م
            </span>
            <span className="font-bold">{t.brand.name}</span>
          </div>
          <p className="mt-3 text-sm muted max-w-xs">{t.brand.tagline}</p>
          <p className="mt-3 text-xs muted">
            {t.landing.eyebrow} · {t.brand.year}
          </p>
        </div>

        <nav aria-label={t.nav.menu}>
          <h2 className="text-sm font-semibold">{t.nav.menu}</h2>
          <ul className="mt-3 space-y-2 text-sm muted">
            <li>
              <Link href={`/${locale}`} className="hover:text-[var(--ink)]">
                {t.nav.home}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/careers`} className="hover:text-[var(--ink)]">
                {t.nav.careers}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/about`} className="hover:text-[var(--ink)]">
                {t.nav.about}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/dashboard`} className="hover:text-[var(--ink)]">
                {t.nav.dashboard}
              </Link>
            </li>
          </ul>
        </nav>

        <div>
          <h2 className="text-sm font-semibold">{t.landing.teamTitle}</h2>
          <ul className="mt-3 space-y-1.5 text-sm muted">
            {TEAM.map((member) => (
              <li key={member.name}>{member.name}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t">
        <p className="mx-auto max-w-7xl px-4 py-4 text-xs muted sm:px-6">
          © {t.brand.year} {t.brand.name} · MIT License
        </p>
      </div>
    </footer>
  );
}
