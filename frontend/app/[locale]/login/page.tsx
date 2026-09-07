"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import ArabesquePattern from "@/components/ArabesquePattern";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLocale } from "@/lib/locale-context";

const DEMO = [
  { role: "demoStudent" as const, email: "student@masar.ae", password: "Demo@1234" },
  { role: "demoAdmin" as const, email: "admin@masar.ae", password: "Admin@1234" },
];

export default function LoginPage() {
  const { locale, t } = useLocale();
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await login(email.trim(), password);
      router.push(user.role === "admin" ? `/${locale}/admin` : `/${locale}/dashboard`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.localised(locale) : t.common.error);
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 text-[var(--brand)]">
        <ArabesquePattern opacity={0.05} />
      </div>
      <div className="relative mx-auto max-w-md px-4 py-14 sm:px-6">
        <h1 className="text-2xl font-black">{t.auth.loginTitle}</h1>
        <p className="mt-1.5 text-sm muted">{t.auth.loginSubtitle}</p>

        <form onSubmit={submit} className="card mt-6 space-y-4 p-6" noValidate>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              {t.auth.email}
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              dir="ltr"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="field"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              {t.auth.password}
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              dir="ltr"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="field"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-[var(--color-uae-red-muted)]">
              {error}
            </p>
          )}

          <button type="submit" disabled={busy} className="btn btn-primary w-full">
            {busy ? t.auth.signingIn : t.auth.submitLogin}
          </button>

          <p className="text-center text-sm muted">
            {t.auth.noAccount}{" "}
            <Link href={`/${locale}/register`} className="font-semibold text-[var(--brand)]">
              {t.nav.register}
            </Link>
          </p>
        </form>

        <section className="card mt-5 p-4">
          <h2 className="text-sm font-semibold">{t.auth.demoTitle}</h2>
          <ul className="mt-3 space-y-2">
            {DEMO.map((account) => (
              <li key={account.email} className="flex items-center justify-between gap-3">
                <span className="min-w-0 text-xs">
                  <span className="block font-medium">{t.auth[account.role]}</span>
                  <span className="block truncate muted ltr-nums" dir="ltr">
                    {account.email} · {account.password}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEmail(account.email);
                    setPassword(account.password);
                  }}
                  className="btn btn-ghost shrink-0 !py-1.5 text-xs"
                >
                  {t.auth.useDemo}
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
