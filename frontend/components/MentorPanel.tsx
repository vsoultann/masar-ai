"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLocale } from "@/lib/locale-context";
import type { ChatMessage, ChatReply } from "@/lib/types";

/**
 * The mentor lives in a floating panel rather than its own page so a student
 * can ask a question while looking at the chart that prompted it.
 */
export default function MentorPanel() {
  const { locale, t, dir } = useLocale();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<string>("offline");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !user) return;
    api
      .get<ChatMessage[]>("/api/chat/history")
      .then(setMessages)
      .catch(() => undefined);
    api
      .get<{ suggestions: string[] }>(`/api/chat/suggestions?language=${locale}`, false)
      .then((body) => setSuggestions(body.suggestions))
      .catch(() => undefined);
  }, [open, user, locale]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, busy]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Escape closes the panel, which is the behaviour a keyboard user expects
  // from anything that overlays the page.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setDraft("");
    setError(null);
    setBusy(true);
    const optimistic: ChatMessage = {
      id: Date.now(),
      role: "user",
      content: message,
      language: locale,
      mode,
      created_at: new Date().toISOString(),
    };
    setMessages((current) => [...current, optimistic]);
    try {
      const reply = await api.post<ChatReply>("/api/chat", { message, language: locale });
      setMode(reply.mode);
      setSuggestions(reply.suggestions);
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: reply.reply,
          language: reply.language,
          mode: reply.mode,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.localised(locale) : t.common.error);
    } finally {
      setBusy(false);
    }
  }

  async function clear() {
    await api.del("/api/chat/history").catch(() => undefined);
    setMessages([]);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t.chat.open}
        className="btn btn-primary fixed bottom-5 end-5 z-40 !rounded-full !px-5 !py-3 shadow-lg"
      >
        <span aria-hidden="true">✦</span>
        <span className="hidden sm:inline">{t.chat.title}</span>
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label={t.chat.title}
      aria-modal="false"
      dir={dir}
      className="fixed bottom-0 end-0 z-40 flex h-[min(600px,100dvh)] w-full flex-col border bg-[var(--surface)] shadow-2xl sm:bottom-5 sm:end-5 sm:h-[560px] sm:w-[400px] sm:rounded-2xl"
    >
      <div className="flex items-start justify-between gap-2 border-b p-4">
        <div>
          <h2 className="text-sm font-bold">{t.chat.title}</h2>
          <p className="mt-0.5 text-xs muted">
            {mode === "anthropic" ? t.chat.modeApi : t.chat.modeOffline}
          </p>
        </div>
        <div className="flex gap-1">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clear}
              className="btn btn-ghost !px-2 !py-1 text-xs"
            >
              {t.chat.clear}
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t.chat.close}
            className="btn btn-ghost !px-2.5 !py-1"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
      </div>

      {!user ? (
        <div className="grid flex-1 place-items-center p-6 text-center">
          <div>
            <p className="text-sm muted">{t.chat.loginPrompt}</p>
            <Link href={`/${locale}/login`} className="btn btn-primary mt-4">
              {t.nav.login}
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm muted">{t.chat.empty}</p>
                <div className="flex flex-col gap-2">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => send(suggestion)}
                      className="card px-3 py-2 text-start text-xs hover:bg-[var(--surface-3)]"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <p
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    message.role === "user"
                      ? "bg-[var(--brand)] text-[var(--brand-ink)]"
                      : "bg-[var(--surface-3)]"
                  }`}
                >
                  {message.content}
                </p>
              </div>
            ))}

            {busy && <p className="text-xs muted">{t.chat.thinking}</p>}
            {error && (
              <p role="alert" className="text-xs text-[var(--color-uae-red-muted)]">
                {error}
              </p>
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void send(draft);
            }}
            className="flex gap-2 border-t p-3"
          >
            <label htmlFor="mentor-input" className="sr-only">
              {t.chat.placeholder}
            </label>
            <input
              id="mentor-input"
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={t.chat.placeholder}
              className="field"
              autoComplete="off"
            />
            <button type="submit" disabled={busy || !draft.trim()} className="btn btn-primary">
              {t.chat.send}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
