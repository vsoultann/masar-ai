"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * The hero headline, typed out in English then Arabic.
 *
 * The full text of the *current* phrase is always in the DOM as far as assistive
 * technology is concerned — the visible characters are a presentational span and
 * the real string sits in a visually-hidden one. A screen reader announcing a
 * headline one character at a time would be unusable.
 *
 * Under reduced motion the first phrase is simply rendered. No typing, no cycle,
 * no timers left running.
 *
 * Layout does not move while it types. Every phrase is stacked in one CSS grid
 * cell -- the invisible ones reserve height, the visible one is drawn on top --
 * so the headline is always as tall as its tallest phrase *at the current
 * width*. Without this the Arabic line wrapping to two lines shoved the
 * paragraph and the buttons below it down and back up on every cycle. A fixed
 * min-height would be a guess; this measures the real thing in both languages
 * and at every breakpoint.
 */
export default function TypedHeadline({
  phrases,
  className = "",
  typeMs = 55,
  holdMs = 2200,
}: {
  phrases: string[];
  className?: string;
  typeMs?: number;
  holdMs?: number;
}) {
  const reduced = useReducedMotion();
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [shown, setShown] = useState(reduced ? phrases[0] : "");
  const [phase, setPhase] = useState<"typing" | "holding" | "deleting">("typing");

  useEffect(() => {
    if (reduced) {
      setShown(phrases[0]);
      return;
    }
    const phrase = phrases[phraseIndex];

    if (phase === "typing") {
      if (shown.length < phrase.length) {
        const timer = window.setTimeout(
          () => setShown(phrase.slice(0, shown.length + 1)),
          typeMs,
        );
        return () => window.clearTimeout(timer);
      }
      const timer = window.setTimeout(() => setPhase("holding"), holdMs);
      return () => window.clearTimeout(timer);
    }

    if (phase === "holding") {
      setPhase("deleting");
      return;
    }

    if (shown.length > 0) {
      const timer = window.setTimeout(() => setShown(shown.slice(0, -1)), typeMs / 2.2);
      return () => window.clearTimeout(timer);
    }
    setPhraseIndex((current) => (current + 1) % phrases.length);
    setPhase("typing");
  }, [shown, phase, phraseIndex, phrases, reduced, typeMs, holdMs]);

  /*
   * Matches the caret's footprint so a spacer wraps -- and sits on a line box
   * of exactly the same height -- as the real line. The height and the nudge
   * have to be copied too: an inline-block of 0.9em raises the line box, and
   * leaving it off the spacer left Arabic wobbling by a pixel as it typed.
   */
  const caretSpacer = !reduced && (
    <span
      className="ms-0.5 inline-block w-[3px] translate-y-[2px] self-stretch"
      style={{ height: "0.9em" }}
      aria-hidden
    />
  );

  return (
    <span className={`grid ${className}`}>
      {phrases.map((phrase) => (
        <span
          key={phrase}
          aria-hidden
          className="invisible col-start-1 row-start-1"
        >
          {phrase}
          {caretSpacer}
        </span>
      ))}

      <span className="col-start-1 row-start-1">
        <span className="sr-only">{phrases[phraseIndex]}</span>
        <span aria-hidden>
          {shown}
          {!reduced && (
            <motion.span
              className="ms-0.5 inline-block w-[3px] translate-y-[2px] self-stretch bg-[var(--brand)]"
              style={{ height: "0.9em" }}
              animate={{ opacity: [1, 1, 0, 0] }}
              transition={{ duration: 1, repeat: Infinity, times: [0, 0.5, 0.5, 1] }}
            />
          )}
        </span>
      </span>
    </span>
  );
}
