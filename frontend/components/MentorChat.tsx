"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Chip } from "@/components/ui";
import { useLocale } from "@/lib/locale-context";
import { answer as offlineAnswer, type Citation } from "@/lib/mentor/engine";
import { loadModel } from "@/lib/ml/inference";
import { popIn } from "@/lib/motion";
import { estimateSkills } from "@/lib/scoring";
import { isComplete, useProfile } from "@/lib/store/profile";

interface Message {
  id: string;
  role: "user" | "mentor";
  text: string;
  citations?: Citation[];
}

/**
 * The mentor conversation.
 *
 * Answers come from a retrieval engine over the catalogs already loaded in the
 * page — no network call, no key, no per-question cost, and identical
 * behaviour for every visitor. Every answer cites the catalog entries it drew
 * on, so a student can click through and check it rather than trust it.
 */
export default function MentorChat({ compact = false }: { compact?: boolean }) {
  const { locale, t } = useLocale();
  const profile = useProfile((state) => state.profile);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  const send = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || busy) return;

    setMessages((current) => [
      ...current,
      { id: `u-${Date.now()}`, role: "user", text: trimmed },
    ]);
    setInput("");
    setBusy(true);

    try {
      // Skill estimates are only needed for gap questions, but computing them
      // is cheap and local, so they are always available to the engine.
      let estimates: Record<string, number> | null = null;

      if (profile && isComplete(profile)) {
        const bundle = await loadModel();
        const featureRow: Record<string, number> = {
          ...profile.grades,
          ...Object.fromEntries(
            Object.entries(profile.riasec).map(([k, v]) => [`riasec_${k}`, v]),
          ),
          ...Object.fromEntries(
            Object.entries(profile.bigfive).map(([k, v]) => [`big5_${k}`, v]),
          ),
        };
        estimates = estimateSkills(
          featureRow,
          bundle.skillMap.weights,
          bundle.skillMap.invertedFeatures,
        );
      }

      const result = await offlineAnswer(trimmed, locale, profile, estimates);

      setMessages((current) => [
        ...current,
        {
          id: `m-${Date.now()}`,
          role: "mentor",
          text: result.text,
          citations: result.citations,
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        { id: `m-${Date.now()}`, role: "mentor", text: t.mentor.noAnswer },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const quickReplies = [
    t.mentor.quickWhatIs,
    t.mentor.quickWhere,
    t.mentor.quickWeakest,
    t.mentor.quickCompare,
  ];

  return (
    <div className="flex h-full flex-col">
      <p className="text-xs muted">{t.mentor.offlineMode}</p>

      <div
        className={`mt-3 flex-1 space-y-3 overflow-y-auto ${compact ? "max-h-80" : "min-h-[40vh]"}`}
        role="log"
        aria-live="polite"
      >
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              variants={popIn}
              initial="hidden"
              animate="show"
              className={message.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  message.role === "user"
                    ? "bg-[var(--brand)] text-[var(--brand-ink)]"
                    : "bg-[var(--surface-2)]"
                }`}
              >
                {message.text}
                {message.citations && message.citations.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {message.citations.map((citation) => (
                      <Link
                        key={`${citation.kind}-${citation.id}`}
                        href={
                          citation.kind === "university"
                            ? `/${locale}/universities/${citation.id}`
                            : citation.kind === "career"
                              ? `/${locale}/careers/${citation.id}`
                              : `/${locale}/courses`
                        }
                      >
                        <Chip tone="accent">{citation.label}</Chip>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {busy && (
          <motion.div variants={popIn} initial="hidden" animate="show" className="flex">
            <div className="flex items-center gap-1 rounded-2xl bg-[var(--surface-2)] px-3.5 py-3">
              <span className="sr-only">{t.mentor.thinking}</span>
              {[0, 1, 2].map((index) => (
                <motion.span
                  key={index}
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full bg-[var(--ink-3)]"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.1, repeat: Infinity, delay: index * 0.18 }}
                />
              ))}
            </div>
          </motion.div>
        )}
        <div ref={endRef} />
      </div>

      {messages.length === 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {quickReplies.map((reply) => (
            <button
              key={reply}
              type="button"
              onClick={() => void send(reply)}
              className="rounded-full border px-3 py-1 text-xs transition-colors hover:bg-[var(--surface-2)]"
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      <form
        className="mt-2 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void send(input);
        }}
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={t.mentor.placeholder}
          aria-label={t.mentor.placeholder}
          className="flex-1 rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm"
        />
        <button type="submit" className="btn btn-primary text-sm" disabled={busy || !input.trim()}>
          {t.mentor.send}
        </button>
      </form>
    </div>
  );
}
