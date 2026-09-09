"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import MentorChat from "@/components/MentorChat";
import { useLocale } from "@/lib/locale-context";
import { spring } from "@/lib/motion";

/**
 * The floating mentor drawer, available on every page.
 *
 * Hidden on /mentor itself, where the same conversation is the whole page —
 * two chat surfaces on one screen would be confusing and would keep two
 * independent message histories.
 */
export default function MentorPanel() {
  const { t } = useLocale();
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);

  const onMentorPage = /\/(en|ar)\/mentor(\/|$)/.test(pathname);

  // Escape closes the drawer, which is the behaviour anyone expects from a
  // dialog and costs one listener.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => setOpen(false), [pathname]);

  if (onMentorPage) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t.mentor.title}
        className="float-bottom fixed start-6 z-40 grid h-12 w-12 place-items-center rounded-full bg-[var(--brand)] text-[var(--brand-ink)] shadow-lg transition-transform hover:scale-105"
      >
        <MessageCircle size={20} aria-hidden />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t.mentor.title}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: spring }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            className="fixed bottom-24 start-4 end-4 z-40 flex max-h-[70vh] flex-col rounded-2xl border bg-[var(--surface)] p-4 shadow-2xl sm:end-auto sm:w-[26rem]"
          >
            <div className="mb-1 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold">{t.mentor.title}</h2>
                <p className="text-xs muted">{t.mentor.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t.common.close}
                className="rounded p-1 hover:bg-[var(--surface-2)]"
              >
                <X size={16} aria-hidden />
              </button>
            </div>
            <MentorChat compact />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
