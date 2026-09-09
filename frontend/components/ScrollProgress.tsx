"use client";

import { motion, useScroll, useSpring } from "framer-motion";

/**
 * The thin progress bar pinned under the header.
 *
 * `transformOrigin` flips in RTL so the bar fills from the right, which is the
 * direction an Arabic reader is travelling through the page.
 */
export default function ScrollProgress({ rtl }: { rtl: boolean }) {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 26,
    restDelta: 0.001,
  });

  return (
    <motion.div
      aria-hidden
      style={{ scaleX, transformOrigin: rtl ? "right" : "left" }}
      className="fixed inset-x-0 top-0 z-50 h-[3px] bg-[var(--brand)]"
    />
  );
}
