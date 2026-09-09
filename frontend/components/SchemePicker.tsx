"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Palette } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useLocale } from "@/lib/locale-context";
import { spring } from "@/lib/motion";
import {
  SCHEME_SWATCH, SCHEMES, UI_STYLES, useScheme, type Scheme, type UiStyle,
} from "@/lib/store/scheme";

/** Accent-colour picker. Sits beside the theme toggle in the header. */
export default function SchemePicker() {
  const { t, lookup } = useLocale();
  const scheme = useScheme((state) => state.scheme);
  const setScheme = useScheme((state) => state.setScheme);
  const ui = useScheme((state) => state.ui);
  const setUi = useScheme((state) => state.setUi);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click and on Escape — the two things anyone expects from
  // a popover, and cheap enough that there is no excuse for omitting them.
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={t.nav.colourScheme}
        aria-expanded={open}
        aria-haspopup="true"
        className="grid h-9 w-9 place-items-center rounded-lg border transition-colors hover:bg-[var(--surface-2)]"
      >
        <Palette size={16} aria-hidden />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            aria-label={t.nav.colourScheme}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: spring }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            className="absolute end-0 z-50 mt-2 w-52 rounded-xl border bg-[var(--surface)] p-2 shadow-xl"
          >
            <p className="px-2.5 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide muted">
              {t.nav.colourScheme}
            </p>
            {SCHEMES.map((option) => (
              <button
                key={option}
                type="button"
                role="menuitemradio"
                aria-checked={scheme === option}
                onClick={() => {
                  setScheme(option as Scheme);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-start text-sm transition-colors ${
                  scheme === option ? "bg-[var(--surface-2)] font-semibold" : "hover:bg-[var(--surface-2)]"
                }`}
              >
                <span
                  aria-hidden
                  className="h-4 w-4 shrink-0 rounded-full ring-1 ring-black/10"
                  style={{ background: SCHEME_SWATCH[option] }}
                />
                {lookup(t.schemes, option)}
                {scheme === option && (
                  <span aria-hidden className="ms-auto text-[var(--brand)]">✓</span>
                )}
              </button>
            ))}

            <p className="mt-2 border-t px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide muted">
              {t.nav.uiStyle}
            </p>
            {UI_STYLES.map((option) => (
              <button
                key={option}
                type="button"
                role="menuitemradio"
                aria-checked={ui === option}
                onClick={() => setUi(option as UiStyle)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-start text-sm transition-colors ${
                  ui === option ? "bg-[var(--surface-2)] font-semibold" : "hover:bg-[var(--surface-2)]"
                }`}
              >
                <span
                  aria-hidden
                  className={`h-4 w-4 shrink-0 rounded ${
                    option === "glass"
                      ? "border border-white/60 bg-white/40 backdrop-blur"
                      : option === "minimal"
                        ? "border border-[var(--line)]"
                        : "bg-[var(--brand)]"
                  }`}
                />
                {lookup(t.uiStyles, option)}
                {ui === option && (
                  <span aria-hidden className="ms-auto text-[var(--brand)]">✓</span>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
