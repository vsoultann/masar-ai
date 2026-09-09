"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { safeStorageJson } from "@/lib/store/profile";

/**
 * Mentor settings.
 *
 * The API key is kept in its own store, separate from the profile, so that
 * exporting a profile to share with a teacher or grader cannot carry a
 * credential out with it.
 */
interface MentorState {
  apiKey: string | null;
  setApiKey: (key: string | null) => void;
}

export const useMentorSettings = create<MentorState>()(
  persist(
    (set) => ({
      apiKey: null,
      setApiKey: (apiKey) => set({ apiKey: apiKey?.trim() ? apiKey.trim() : null }),
    }),
    { name: "masar.v2.mentor", storage: safeStorageJson() },
  ),
);
