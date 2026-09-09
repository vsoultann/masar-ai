import type { Transition, Variants } from "framer-motion";

/**
 * One motion vocabulary for the whole app.
 *
 * Two rules run through everything here:
 *
 *  1. Direction is a parameter, never a constant. In RTL a "slide in from the
 *     next step" has to come from the left, not the right, or the wizard feels
 *     like it is going backwards. Helpers that move horizontally take a `dir`.
 *  2. Distances stay small (8-16px). Large travel reads as sluggish once it is
 *     attached to real content rather than a demo card.
 *
 * Reduced motion is handled globally by MotionConfig in the layout, which drops
 * transforms and leaves opacity, so nothing here needs its own guard.
 */

/** Standard easing: quick out of the gate, soft landing. */
export const EASE = [0.22, 1, 0.36, 1] as const;
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export const DURATION = {
  fast: 0.18,
  base: 0.28,
  slow: 0.45,
  reveal: 0.6,
} as const;

export const spring: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 30,
  mass: 0.8,
};

export const softSpring: Transition = {
  type: "spring",
  stiffness: 200,
  damping: 26,
};

/** Page transition: fade plus a 12px rise. */
export const pageVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.base, ease: EASE },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: DURATION.fast, ease: EASE },
  },
};

/**
 * Scroll reveal. Apply to a parent with `whileInView="show"` and give children
 * `revealItem` so they cascade instead of arriving as one block.
 */
export const revealContainer = (stagger = 0.07, delay = 0): Variants => ({
  hidden: {},
  show: {
    transition: { staggerChildren: stagger, delayChildren: delay },
  },
});

export const revealItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.reveal, ease: EASE_OUT },
  },
};

/** Shared viewport config so every reveal triggers at the same point. */
export const viewportOnce = { once: true, amount: 0.25 } as const;

/** Card hover: lift plus shadow bloom. Press-down on tap. */
export const cardHover = {
  whileHover: { y: -4, transition: { duration: DURATION.fast, ease: EASE } },
  whileTap: { scale: 0.985 },
} as const;

/** Horizontal slide, mirrored for RTL. `dir` is 1 forward, -1 backward. */
export function slideVariants(dir: 1 | -1, rtl: boolean): Variants {
  const sign = rtl ? -dir : dir;
  const distance = 48;
  return {
    hidden: { opacity: 0, x: sign * distance },
    show: {
      opacity: 1,
      x: 0,
      transition: { duration: DURATION.base, ease: EASE },
    },
    exit: {
      opacity: 0,
      x: -sign * distance,
      transition: { duration: DURATION.fast, ease: EASE },
    },
  };
}

/** Message bubbles and toasts: spring in from slightly below. */
export const popIn: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: spring },
};

/** Likert option fill and other "selected" states. */
export const selectPulse: Variants = {
  rest: { scale: 1 },
  selected: { scale: [1, 1.06, 1], transition: { duration: 0.32, ease: EASE } },
};

/** Timeline connector that draws itself as the roadmap scrolls into view. */
export const drawLine: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  show: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: 1.1, ease: "easeInOut" },
  },
};

/** Map markers dropping in with a stagger. */
export const markerDrop: Variants = {
  hidden: { opacity: 0, y: -18, scale: 0.7 },
  show: { opacity: 1, y: 0, scale: 1, transition: softSpring },
};
