"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

import { localiseDigits } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import type { Questionnaire } from "@/lib/types";

/**
 * One statement at a time, answerable entirely from the keyboard.
 *
 * The previous version rendered all thirty items as a scrolling list. It was
 * honest but exhausting, and the length of the page was the first thing a
 * student saw. One card at a time turns the same thirty answers into something
 * that feels like progress.
 *
 * Keyboard model, shown to the user rather than hidden:
 *   ← →         move the highlighted option (mirrored in RTL)
 *   1 … 5       choose that option directly
 *   Enter/Space confirm and advance
 *   Backspace   go back one statement
 *
 * Selecting auto-advances after a short beat. That beat is deliberate: jumping
 * instantly makes it impossible to see what you picked, and impossible to
 * correct a mis-key. It is skipped entirely under reduced motion, where the
 * animation that justified it is not playing.
 *
 * Answers stay keyed by item id, so going back and changing one is just an
 * overwrite — no re-indexing, and a resumed session lands on the first
 * unanswered item rather than at the start.
 */

const ADVANCE_MS = 260;

export default function QuestionnaireFlow({
  questionnaire,
  answers,
  setAnswers,
  legend,
  help,
  complete,
  busy,
  onBack,
  onSubmit,
  submitLabel,
}: {
  questionnaire: Questionnaire;
  answers: Record<string, number>;
  setAnswers: (updater: (current: Record<string, number>) => Record<string, number>) => void;
  legend: string;
  help: string;
  complete: boolean;
  busy: boolean;
  onBack: () => void;
  onSubmit: () => void;
  submitLabel: string;
}) {
  const { locale, t, pick, dir } = useLocale();
  const reduced = useReducedMotion();
  const rtl = dir === "rtl";

  const items = questionnaire.items;
  const scale = questionnaire.scale;
  const total = items.length;

  // Resume on the first unanswered statement.
  const firstUnanswered = Math.max(
    0,
    items.findIndex((item) => answers[item.id] === undefined),
  );
  const [index, setIndex] = useState(
    firstUnanswered === -1 ? total - 1 : firstUnanswered,
  );
  const [direction, setDirection] = useState<1 | -1>(1);
  const [highlight, setHighlight] = useState<number>(0);
  const advanceTimer = useRef<number | null>(null);

  const item = items[index];
  const current = item ? answers[item.id] : undefined;
  const answered = Object.keys(answers).length;

  // Keep the highlight on whatever is already chosen when moving between cards,
  // so arrowing back to a previous answer starts from that answer.
  useEffect(() => {
    const chosen = scale.findIndex((point) => point.value === current);
    setHighlight(chosen >= 0 ? chosen : Math.floor(scale.length / 2));
  }, [index, current, scale]);

  useEffect(() => () => {
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
  }, []);

  const goTo = useCallback(
    (next: number, how: 1 | -1) => {
      if (next < 0 || next >= total) return;
      setDirection(how);
      setIndex(next);
    },
    [total],
  );

  const choose = useCallback(
    (value: number, position: number) => {
      if (!item) return;
      setHighlight(position);
      setAnswers((currentAnswers) => ({ ...currentAnswers, [item.id]: value }));

      if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
      if (index < total - 1) {
        const delay = reduced ? 0 : ADVANCE_MS;
        advanceTimer.current = window.setTimeout(() => goTo(index + 1, 1), delay);
      }
    },
    [item, index, total, setAnswers, goTo, reduced],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // Never hijack typing in a field, and leave modified keys to the browser.
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const forward = rtl ? "ArrowLeft" : "ArrowRight";
      const backward = rtl ? "ArrowRight" : "ArrowLeft";

      if (event.key === forward) {
        event.preventDefault();
        setHighlight((h) => Math.min(scale.length - 1, h + 1));
        return;
      }
      if (event.key === backward) {
        event.preventDefault();
        setHighlight((h) => Math.max(0, h - 1));
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        choose(scale[highlight].value, highlight);
        return;
      }
      if (event.key === "Backspace") {
        event.preventDefault();
        goTo(index - 1, -1);
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        goTo(index + 1, 1);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        goTo(index - 1, -1);
        return;
      }
      const digit = Number(event.key);
      if (Number.isInteger(digit) && digit >= 1 && digit <= scale.length) {
        event.preventDefault();
        choose(scale[digit - 1].value, digit - 1);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choose, goTo, highlight, index, rtl, scale]);

  if (!item) return null;

  const slide = (from: number) => ({
    hidden: { opacity: 0, x: reduced ? 0 : from },
    show: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: reduced ? 0 : -from },
  });
  const offset = (rtl ? -1 : 1) * direction * 42;

  return (
    <form
      className="mt-6"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <fieldset>
        <legend className="text-sm font-bold">{legend}</legend>
        <p className="mt-1 text-xs muted">{help}</p>

        {/* progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-medium ltr-nums">
            <span aria-live="polite">
              {localiseDigits(index + 1, locale)} / {localiseDigits(total, locale)}
            </span>
            <span className="muted">
              {localiseDigits(answered, locale)} / {localiseDigits(total, locale)}{" "}
              {t.wizard.answered}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--surface-3)]">
            <motion.div
              className="h-full rounded-full bg-[var(--brand)]"
              animate={{ width: `${(answered / total) * 100}%` }}
              transition={{ duration: reduced ? 0 : 0.35, ease: "easeOut" }}
              style={{ transformOrigin: rtl ? "right" : "left" }}
            />
          </div>
        </div>

        {/* the statement */}
        <div className="relative mt-5 min-h-[15rem]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={item.id}
              variants={slide(offset)}
              initial="hidden"
              animate="show"
              exit="exit"
              transition={{ duration: reduced ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="card p-6 sm:p-8"
            >
              <p className="text-lg font-semibold leading-relaxed sm:text-xl">
                {pick(item, "text")}
              </p>

              <div
                role="radiogroup"
                aria-label={pick(item, "text")}
                className="mt-6 grid gap-2 sm:grid-cols-5"
              >
                {scale.map((point, position) => {
                  const selected = current === point.value;
                  const focused = highlight === position;
                  return (
                    <button
                      key={point.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={pick(point, "label")}
                      onClick={() => choose(point.value, position)}
                      onMouseEnter={() => setHighlight(position)}
                      className={`relative rounded-xl border p-3 text-center text-xs transition-all ${
                        selected
                          ? "border-[var(--brand)] bg-[var(--brand)] font-semibold text-[var(--brand-ink)]"
                          : focused
                            ? "border-[var(--brand)]/60 bg-[var(--surface-2)]"
                            : "hover:bg-[var(--surface-2)]"
                      }`}
                    >
                      <span className="block text-[10px] opacity-60 ltr-nums">
                        {localiseDigits(position + 1, locale)}
                      </span>
                      <span className="mt-0.5 block leading-snug">{pick(point, "label")}</span>
                    </button>
                  );
                })}
              </div>

              <p className="mt-5 text-[11px] muted">{t.wizard.keyboardHint}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </fieldset>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => (index === 0 ? onBack() : goTo(index - 1, -1))}
        >
          {t.wizard.back}
        </button>

        {index < total - 1 ? (
          <button
            type="button"
            className="btn btn-ghost"
            disabled={current === undefined}
            onClick={() => goTo(index + 1, 1)}
          >
            {t.wizard.next}
          </button>
        ) : (
          <button type="submit" className="btn btn-primary" disabled={!complete || busy}>
            {busy ? t.wizard.saving : submitLabel}
          </button>
        )}

        {/* Jumping straight to the first gap beats hunting for it. */}
        {!complete && answered > 0 && (
          <button
            type="button"
            className="btn btn-ghost text-xs"
            onClick={() => {
              const gap = items.findIndex((row) => answers[row.id] === undefined);
              if (gap >= 0) goTo(gap, gap > index ? 1 : -1);
            }}
          >
            {t.wizard.firstUnanswered}
          </button>
        )}
      </div>
    </form>
  );
}
