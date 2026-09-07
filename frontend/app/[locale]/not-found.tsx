"use client";

import Link from "next/link";

import { useLocale } from "@/lib/locale-context";

export default function NotFound() {
  const { locale, t } = useLocale();
  return (
    <div className="mx-auto grid max-w-lg place-items-center px-4 py-24 text-center sm:px-6">
      <p className="text-6xl font-black text-[var(--brand)] ltr-nums">404</p>
      <h1 className="mt-4 text-xl font-bold">{t.common.notFound}</h1>
      <p className="mt-2 text-sm muted">{t.common.notFoundBody}</p>
      <Link href={`/${locale}`} className="btn btn-primary mt-6">
        {t.common.backHome}
      </Link>
    </div>
  );
}
