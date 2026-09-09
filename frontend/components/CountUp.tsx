"use client";

import { animate, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { localiseDigits } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";

/**
 * A number that counts up when it scrolls into view.
 *
 * Renders the final value immediately under reduced motion, and also renders it
 * as the initial server/first-paint value, so the number is never missing or
 * wrong for a reader who does not see the animation.
 */
export default function CountUp({
  value,
  decimals = 0,
  suffix = "",
  duration = 1.1,
  className = "",
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const { locale } = useLocale();
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (reduced || !inView) {
      setDisplay(value);
      return;
    }
    const controls = animate(0, value, {
      duration,
      ease: "easeOut",
      onUpdate: (latest) => setDisplay(latest),
    });
    return () => controls.stop();
  }, [inView, value, duration, reduced]);

  const text = display.toFixed(decimals);

  return (
    <span ref={ref} className={`ltr-nums ${className}`}>
      {localiseDigits(text, locale)}
      {suffix}
    </span>
  );
}
