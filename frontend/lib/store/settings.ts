"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { safeStorageJson } from "@/lib/store/profile";

import type { BackgroundTheme } from "@/components/background/LivingBackground";

/**
 * Client-side preferences.
 *
 * Everything in this app persists to localStorage under a versioned `masar.v2.`
 * prefix. The version is in the key on purpose: when the shape of stored state
 * changes, a v3 key simply misses and falls back to defaults, instead of
 * hydrating a stale object into a component that no longer understands it.
 */

export type BackgroundPreference = BackgroundTheme | "auto";

interface SettingsState {
  background: BackgroundPreference;
  setBackground: (value: BackgroundPreference) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      background: "auto",
      setBackground: (background) => set({ background }),
    }),
    { name: "masar.v2.settings", storage: safeStorageJson() },
  ),
);
