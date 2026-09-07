"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import ArabesquePattern from "@/components/ArabesquePattern";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLocale } from "@/lib/locale-context";
import type { Lang } from "@/lib/types";

export default function RegisterPage() {
  const { locale, t } = useLocale();
  const { register } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [language, setLanguage] = useState<Lang>(locale);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!fullName.trim()) errors.full_name = t.errors.required;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = t.errors.emailInvalid;
    if (password.length < 8) errors.password = t.errors.passwordShort;
    else if (!/[a-zA-Z]/.test(password) || !/\d/.test(password))
      errors.password = t.errors.passwordWeak;
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!validate()) return;
    setBusy(true);
    try {
      await register(email.trim(), password, fullName.trim(), language);
      router.push(`/${language}/onboarding`);
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.localised(locale));
        if (caught.fields.length) {
          setFieldErrors(
            Object.fromEntries(
              caught.fields.map((field) => [
                field.field,
                locale === "ar" ? field.message_ar : field.message_en,
              ]),
            ),
          );
        }
      } else {
        setError(t.common.error);
      }
      setBusy(false);
    }
  }

  const errorId = (field: string) => (fieldErrors[field] ? `${field}-error` : undefined);

  return (
    <div className="relative">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 text-[var(--brand)]">
        <ArabesquePattern opacity={0.05} />
      </div>
      <div className="relative mx-auto max-w-md px-4 py-14 sm:px-6">
        <h1 className="text-2xl font-black">{t.auth.registerTitle}</h1>
        <p className="mt-1.5 text-sm muted">{t.auth.registerSubtitle}</p>

        <form onSubmit={submit} className="card mt-6 space-y-4 p-6" noValidate>
          <div>
            <label htmlFor="full_name" className="mb-1 block text-sm font-medium">
              {t.auth.fullName}
            </label>
            <input
              id="full_name"
              required
              autoComplete="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              aria-invalid={Boolean(fieldErrors.full_name)}
              aria-describedby={errorId("full_name")}
              className="field"
            />
            {fieldErrors.full_name && (
              <p id="full_name-error" className="mt-1 text-xs text-[var(--color-uae-red-muted)]">
                {fieldErrors.full_name}
              </p>
            )}
          </div>

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
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={errorId("email")}
              className="field"
            />
            {fieldErrors.email && (
              <p id="email-error" className="mt-1 text-xs text-[var(--color-uae-red-muted)]">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              {t.auth.password}
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              dir="ltr"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? "password-error" : "password-hint"}
              className="field"
            />
            {fieldErrors.password ? (
              <p id="password-error" className="mt-1 text-xs text-[var(--color-uae-red-muted)]">
                {fieldErrors.password}
              </p>
            ) : (
              <p id="password-hint" className="mt-1 text-xs muted">
                {t.auth.passwordHint}
              </p>
            )}
          </div>

          <fieldset>
            <legend className="mb-1 block text-sm font-medium">{t.auth.language}</legend>
            <div className="flex gap-2">
              {(["en", "ar"] as const).map((option) => (
                <label
                  key={option}
                  className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center text-sm ${
                    language === option
                      ? "border-[var(--brand)] bg-[var(--brand)]/10 font-semibold"
                      : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="language"
                    value={option}
                    checked={language === option}
                    onChange={() => setLanguage(option)}
                    className="sr-only"
                  />
                  {option === "ar" ? t.common.languageAr : t.common.languageEn}
                </label>
              ))}
            </div>
          </fieldset>

          {error && (
            <p role="alert" className="text-sm text-[var(--color-uae-red-muted)]">
              {error}
            </p>
          )}

          <button type="submit" disabled={busy} className="btn btn-primary w-full">
            {busy ? t.auth.creating : t.auth.submitRegister}
          </button>

          <p className="text-center text-sm muted">
            {t.auth.haveAccount}{" "}
            <Link href={`/${locale}/login`} className="font-semibold text-[var(--brand)]">
              {t.nav.login}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
