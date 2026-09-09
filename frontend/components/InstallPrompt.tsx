"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Share, SquarePlus, X } from "lucide-react";
import { useEffect, useState } from "react";

import Logo from "@/components/Logo";
import { useLocale } from "@/lib/locale-context";
import { spring } from "@/lib/motion";

/**
 * "Add to Home Screen" for iOS.
 *
 * Safari on iOS implements no `beforeinstallprompt` event and no programmatic
 * install, so a real install button is impossible — the only thing that works
 * is telling the user where the button is. This shows the two-step Share ▸ Add
 * to Home Screen instruction, and nothing else.
 *
 * It is deliberately quiet about it:
 *  - only on iOS Safari, because the instruction is wrong everywhere else;
 *  - never when already running standalone, which is the whole point;
 *  - not on first paint — it waits until the visitor has been on the page a
 *    few seconds, since asking someone to install an app they have not looked
 *    at yet is how banners get dismissed reflexively;
 *  - dismissal is remembered, so it asks once rather than on every visit.
 *
 * Android and desktop Chrome get the browser's own install affordance, which
 * is better than anything shown here, so no banner is rendered for them.
 */

const DISMISS_KEY = "masar.install.dismissed";
const DELAY_MS = 6000;

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // iPadOS 13+ reports as Macintosh, so touch support is the distinguishing
  // signal there rather than the platform string.
  const iOS =
    /iPad|iPhone|iPod/.test(ua)
    || (/Macintosh/.test(ua) && typeof document !== "undefined" && "ontouchend" in document);
  const webkit = /WebKit/.test(ua);
  const otherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return iOS && webkit && !otherBrowser;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches
    // Safari's own non-standard flag, still the only reliable one on iOS.
    || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export default function InstallPrompt() {
  const { t } = useLocale();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isIosSafari() || isStandalone()) return;
    try {
      if (window.localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      /* storage unavailable: fall through and show it this session only */
    }
    const timer = window.setTimeout(() => setShow(true), DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setShow(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* nothing to remember it with; it will ask again next visit */
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          role="dialog"
          aria-label={t.install.title}
          initial={{ y: 90, opacity: 0 }}
          animate={{ y: 0, opacity: 1, transition: spring }}
          exit={{ y: 90, opacity: 0 }}
          className="pin-bottom fixed inset-x-3 bottom-0 z-50 rounded-2xl border bg-[var(--surface)] p-4 shadow-2xl sm:inset-x-auto sm:end-4 sm:w-96"
        >
          <div className="flex items-start gap-3">
            <Logo size={40} />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold">{t.install.title}</h2>
              <p className="mt-1 text-xs leading-relaxed muted">{t.install.body}</p>

              <ol className="mt-3 space-y-1.5 text-xs">
                <li className="flex items-center gap-2">
                  <Share size={15} aria-hidden className="shrink-0 text-[var(--brand)]" />
                  {t.install.step1}
                </li>
                <li className="flex items-center gap-2">
                  <SquarePlus size={15} aria-hidden className="shrink-0 text-[var(--brand)]" />
                  {t.install.step2}
                </li>
              </ol>
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label={t.common.close}
              className="rounded p-1 hover:bg-[var(--surface-2)]"
            >
              <X size={16} aria-hidden />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
