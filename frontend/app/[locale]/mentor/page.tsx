"use client";

import { useState } from "react";

import MentorChat from "@/components/MentorChat";
import { SectionHeading } from "@/components/ui";
import { useLocale } from "@/lib/locale-context";
import { useMentorSettings } from "@/lib/store/mentor";

/** The mentor as a full page, plus the bring-your-own-key settings. */
export default function MentorPage() {
  const { t } = useLocale();
  const apiKey = useMentorSettings((state) => state.apiKey);
  const setApiKey = useMentorSettings((state) => state.setApiKey);
  const [draft, setDraft] = useState("");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <header>
        <h1 className="text-2xl font-black sm:text-3xl">{t.mentor.title}</h1>
        <p className="mt-2 muted">{t.mentor.subtitle}</p>
      </header>

      <div className="card mt-6 p-4">
        <MentorChat />
      </div>

      <section className="mt-10">
        <SectionHeading title={t.mentor.settings} />
        <div className="card space-y-3 p-5">
          <label htmlFor="mentor-key" className="block text-sm font-medium">
            {t.mentor.apiKeyLabel}
          </label>
          <input
            id="mentor-key"
            type="password"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={apiKey ? "••••••••••••" : "sk-ant-…"}
            autoComplete="off"
            className="w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm"
          />
          <p className="text-xs muted">{t.mentor.apiKeyHelp}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary text-sm"
              disabled={!draft.trim()}
              onClick={() => {
                setApiKey(draft);
                setDraft("");
              }}
            >
              {t.mentor.apiKeySave}
            </button>
            {apiKey && (
              <button
                type="button"
                className="btn btn-ghost text-sm"
                onClick={() => setApiKey(null)}
              >
                {t.mentor.apiKeyClear}
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
