"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import Logo from "@/components/Logo";
import SchemePicker from "@/components/SchemePicker";
import { useProfile } from "@/lib/store/profile";
import { switchLocalePath, type Locale } from "@/lib/i18n";
import { resolveTheme, setTheme, type Theme } from "@/lib/theme";
import { useLocale } from "@/lib/locale-context";

function useTheme() {
  const [theme, setThemeState] = useState<Theme>("light");
  const pathname = usePathname();

  /*
   * Re-read on every navigation, not only on mount.
   *
   * The header remounts when the locale changes, and it used to read
   * `data-theme` off the document at that moment — which was precisely the
   * moment React had just stripped the attribute. The icon then showed the
   * wrong state until the next click. Reading the resolved value instead of
   * the DOM attribute makes the header agree with ThemeKeeper by construction.
   */
  useEffect(() => {
    setThemeState(resolveTheme());
  }, [pathname]);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setThemeState(next);
  };

  return { theme, toggle };
}

export default function Header() {
  const { locale, t } = useLocale();
  // There is no account in v2: "signed in" means a profile exists in this
  // browser's storage. `hydrated` distinguishes "no profile" from "not read
  // from storage yet", so the header does not flash the signed-out nav on
  // every load for a student who has a profile.
  const profile = useProfile((state) => state.profile);
  const hydrated = useProfile((state) => state.hydrated);
  const clearProfile = useProfile((state) => state.clear);
  const user = hydrated ? profile : null;
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const other = t.meta.otherLocale as Locale;
  // Ordered by how often a signed-in student needs them: their own pages first,
  // then the catalogs, then the mentor. About is deliberately absent -- every
  // other header link is about the student, and About lives in the footer.
  const links: { href: string; label: string }[] = [];
  if (user) {
    links.push({ href: `/${locale}/dashboard`, label: t.nav.dashboard });
    links.push({ href: `/${locale}/results`, label: t.nav.results });
  }
  links.push({ href: `/${locale}/careers`, label: t.nav.careers });
  links.push({ href: `/${locale}/universities`, label: t.nav.universities });
  // Straight after universities: the two are one decision, and a student who
  // has just seen a tuition band is exactly the student who needs this next.
  links.push({ href: `/${locale}/scholarships`, label: t.nav.scholarships });
  links.push({ href: `/${locale}/mentor`, label: t.nav.mentor });
  if (user?.role === "admin") links.push({ href: `/${locale}/admin`, label: t.nav.admin });

  const isActive = (href: string) =>
    href === `/${locale}` ? pathname === href : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b bg-[var(--surface-translucent)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href={`/${locale}`} className="flex items-center gap-2.5 shrink-0">
          <Logo size={36} />
          <span className="flex flex-col leading-tight">
            <span className="text-base font-bold">{t.brand.name}</span>
            <span className="hidden text-[11px] muted sm:block">{t.brand.tagline}</span>
          </span>
        </Link>

        {/* The nav grew to eight items in v2 and overflowed at md. The
            secondary ones appear only from lg; everything stays reachable on
            small screens through the menu below. */}
        <nav aria-label={t.nav.menu} className="mx-auto hidden items-center gap-1 md:flex">
          {links.map((link, index) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                index >= 4 ? "hidden lg:inline-block" : ""
              } ${
                isActive(link.href)
                  ? "bg-[var(--surface-3)] text-[var(--ink)]"
                  : "muted hover:bg-[var(--surface-2)]"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-2 md:ms-0">
          <button
            type="button"
            onClick={toggle}
            aria-label={t.nav.toggleTheme}
            className="btn btn-ghost !px-2.5 !py-2"
          >
            <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
          </button>

          <SchemePicker />

          <button
            type="button"
            onClick={() => router.push(switchLocalePath(pathname, other))}
            aria-label={t.nav.toggleLanguage}
            className="btn btn-ghost !px-3 !py-2 text-sm"
            lang={other}
          >
            {t.meta.other}
          </button>

          {/* /login and /register were removed with server auth; linking to
              them here was a dead 404 on every page. A visitor without a
              profile starts the assessment, which creates one. */}
          {user ? (
            <div className="hidden sm:flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  clearProfile();
                  router.push(`/${locale}`);
                }}
                className="btn btn-ghost !py-2 text-sm"
              >
                {t.nav.logout}
              </button>
            </div>
          ) : (
            <Link
              href={`/${locale}/assessment`}
              className="btn btn-primary hidden !py-2 text-sm sm:inline-flex"
            >
              {t.nav.createProfile}
            </Link>
          )}

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={t.nav.menu}
            className="btn btn-ghost !px-2.5 !py-2 md:hidden"
          >
            <span aria-hidden="true">{open ? "✕" : "☰"}</span>
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label={t.nav.menu} className="border-t md:hidden">
          <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-[var(--surface-2)]"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex gap-2 border-t pt-3">
              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    clearProfile();
                    router.push(`/${locale}`);
                  }}
                  className="btn btn-ghost flex-1"
                >
                  {t.nav.logout}
                </button>
              ) : (
                <Link href={`/${locale}/assessment`} className="btn btn-primary flex-1">
                  {t.nav.createProfile}
                </Link>
              )}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
