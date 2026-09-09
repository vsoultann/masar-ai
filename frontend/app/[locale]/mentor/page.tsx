"use client";

import MentorChat from "@/components/MentorChat";
import { useLocale } from "@/lib/locale-context";

/** The mentor as a full page. */
export default function MentorPage() {
  const { t } = useLocale();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <header>
        <h1 className="text-2xl font-black sm:text-3xl">{t.mentor.title}</h1>
        <p className="mt-2 muted">{t.mentor.subtitle}</p>
      </header>

      <div className="card mt-6 p-4">
        <MentorChat />
      </div>

      <p className="mt-4 text-xs muted">{t.mentor.offlineMode}</p>
    </div>
  );
}
