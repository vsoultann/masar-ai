"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

import { spring } from "@/lib/motion";

/** Fades in once the visitor is a screen or so down the page. */
export default function BackToTop({ label }: { label: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.button
          type="button"
          initial={{ opacity: 0, scale: 0.8, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0, transition: spring }}
          exit={{ opacity: 0, scale: 0.8, y: 8 }}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label={label}
          className="float-bottom fixed end-6 z-40 grid h-11 w-11 place-items-center rounded-full bg-[var(--brand)] text-[var(--brand-ink)] shadow-lg"
        >
          <ArrowUp size={18} aria-hidden />
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
