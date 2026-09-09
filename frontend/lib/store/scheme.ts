"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { safeStorageJson } from "@/lib/store/profile";

export const SCHEMES = ["uae", "gulf", "sand", "royal", "sunset", "teal"] as const;
export type Scheme = (typeof SCHEMES)[number];

/** Swatches for the picker. Indicative of --brand in light mode. */
export const SCHEME_SWATCH: Record<Scheme, string> = {
  uae: "#00732f",
  gulf: "#0b6a8f",
  sand: "#9a7328",
  royal: "#5b3fd6",
  sunset: "#c2410c",
  teal: "#0f766e",
};

interface SchemeState {
  scheme: Scheme;
  setScheme: (scheme: Scheme) => void;
}

/**
 * The accent scheme, orthogonal to light/dark.
 *
 * The key is `masar.scheme` rather than the versioned `masar.v2.` prefix
 * because ThemeScript reads it directly as a plain string before React loads —
 * a JSON-wrapped zustand value would need parsing in the inline script, and
 * that script has to stay tiny and total.
 */
export const useScheme = create<SchemeState>()(
  persist(
    (set) => ({
      scheme: "uae",
      setScheme: (scheme) => {
        set({ scheme });
        if (typeof document !== "undefined") {
          document.documentElement.dataset.scheme = scheme;
        }
        try {
          window.localStorage.setItem("masar.scheme", scheme);
        } catch {
          /* storage can be unavailable; the scheme still applies this session */
        }
      },
    }),
    { name: "masar.v2.scheme", storage: safeStorageJson() },
  ),
);
