"use client";

import { MotionConfig } from "framer-motion";

/**
 * One place that tells every Framer Motion animation in the app to respect the
 * operating-system reduced-motion setting.
 *
 * `reducedMotion="user"` strips transform and layout animation while leaving
 * opacity, which keeps state changes legible without moving anything.
 */
export default function MotionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
