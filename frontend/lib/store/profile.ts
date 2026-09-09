"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { Profile } from "@/lib/types";

/**
 * The student profile, held entirely on the device.
 *
 * v2 has no server and therefore no account. "Signing in" creates a local
 * profile in localStorage under a versioned key. This is a real trade-off and
 * the UI says so plainly rather than dressing it up as an account: the profile
 * lives in one browser, and clearing site data destroys it.
 *
 * Export and import exist because of that. A grader marking this on a different
 * machine, or a student moving from a school computer to a phone, needs a way
 * to carry a profile across — so the whole thing round-trips through a JSON
 * file. That is also the honest answer to "what happens when I clear my
 * browser": you keep a copy.
 *
 * Nothing here is a security boundary. The admin flag unlocks a catalog
 * inspection view; it guards nothing, because on a static site there is nothing
 * to guard — every byte the app can read is already public. Pretending
 * otherwise with a password prompt would be security theatre.
 */

const STORAGE_KEY = "masar.v2.profile";
const EXPORT_FORMAT = "masar.profile.v2";

/** Documented in the user manual; unlocks the catalog inspection view. */
export const ADMIN_CODE = "masar-admin";

/**
 * localStorage, but never throwing.
 *
 * It is genuinely absent or hostile in several real situations: server
 * rendering, Safari private browsing (where writes throw a quota error rather
 * than failing quietly), browsers configured to block site data, and the test
 * environment. zustand's default storage assumes it exists, and an exception
 * during rehydration takes the whole app down.
 *
 * Falling back to an in-memory map keeps the app fully usable for the session;
 * only persistence across reloads is lost, which is the correct degradation.
 */
function safeStorage(): Storage {
  const memory = new Map<string, string>();
  const fallback: Storage = {
    get length() {
      return memory.size;
    },
    clear: () => memory.clear(),
    getItem: (key) => memory.get(key) ?? null,
    key: (index) => [...memory.keys()][index] ?? null,
    removeItem: (key) => {
      memory.delete(key);
    },
    setItem: (key, value) => {
      memory.set(key, value);
    },
  };

  try {
    if (typeof window === "undefined" || !window.localStorage) return fallback;
    // Probe rather than trust: the object can exist and still throw on write.
    const probe = "__masar_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return fallback;
  }
}

function newId(): string {
  // crypto.randomUUID is unavailable in older Safari and in some embedded
  // webviews, so fall back rather than throw during profile creation.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function emptyProfile(fullName: string): Profile {
  const now = new Date().toISOString();
  return {
    id: newId(),
    version: 2,
    fullName,
    emirate: null,
    city: null,
    coordinates: null,
    locationSource: null,
    school: null,
    gradeLevel: null,
    track: null,
    grades: {},
    emsat: {},
    riasec: {},
    bigfive: {},
    riasecAnswers: {},
    bigfiveAnswers: {},
    completedSteps: 0,
    savedCareers: [],
    savedUniversities: [],
    role: "student",
    createdAt: now,
    updatedAt: now,
  };
}

interface ProfileState {
  profile: Profile | null;
  /** False until the persisted store has rehydrated; guards SSR mismatch. */
  hydrated: boolean;

  markHydrated: () => void;
  create: (fullName: string) => void;
  update: (patch: Partial<Profile>) => void;
  clear: () => void;
  toggleSavedCareer: (id: string) => void;
  toggleSavedUniversity: (id: string) => void;
  unlockAdmin: (code: string) => boolean;

  exportProfile: () => string;
  importProfile: (json: string) => { ok: true } | { ok: false; error: string };
}

export const useProfile = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: null,
      hydrated: false,

      markHydrated: () => set({ hydrated: true }),

      create: (fullName) => set({ profile: emptyProfile(fullName) }),

      update: (patch) =>
        set((state) =>
          state.profile
            ? {
                profile: {
                  ...state.profile,
                  ...patch,
                  updatedAt: new Date().toISOString(),
                },
              }
            : state,
        ),

      clear: () => set({ profile: null }),

      toggleSavedCareer: (id) =>
        set((state) => {
          if (!state.profile) return state;
          const saved = state.profile.savedCareers.includes(id)
            ? state.profile.savedCareers.filter((entry) => entry !== id)
            : [...state.profile.savedCareers, id];
          return { profile: { ...state.profile, savedCareers: saved } };
        }),

      toggleSavedUniversity: (id) =>
        set((state) => {
          if (!state.profile) return state;
          const saved = state.profile.savedUniversities.includes(id)
            ? state.profile.savedUniversities.filter((entry) => entry !== id)
            : [...state.profile.savedUniversities, id];
          return { profile: { ...state.profile, savedUniversities: saved } };
        }),

      unlockAdmin: (code) => {
        if (code.trim() !== ADMIN_CODE) return false;
        const profile = get().profile;
        if (profile) set({ profile: { ...profile, role: "admin" } });
        return true;
      },

      exportProfile: () =>
        JSON.stringify(
          { format: EXPORT_FORMAT, exportedAt: new Date().toISOString(), profile: get().profile },
          null,
          2,
        ),

      /**
       * Imports a profile file.
       *
       * Validates rather than trusts: the file may be hand-edited, truncated,
       * or from a different app entirely, and a malformed object written
       * straight into the store would break every page that reads it with no
       * clue where the bad data came from.
       */
      importProfile: (json) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(json);
        } catch {
          return { ok: false, error: "notJson" };
        }
        if (typeof parsed !== "object" || parsed === null) {
          return { ok: false, error: "notProfile" };
        }
        const envelope = parsed as { format?: string; profile?: unknown };
        if (envelope.format !== EXPORT_FORMAT) {
          return { ok: false, error: "wrongFormat" };
        }
        const candidate = envelope.profile as Partial<Profile> | undefined;
        if (!candidate || typeof candidate.fullName !== "string") {
          return { ok: false, error: "notProfile" };
        }
        // Merge onto a fresh profile so a file missing newer fields still
        // produces a complete object rather than undefined holes.
        const base = emptyProfile(candidate.fullName);
        set({
          profile: {
            ...base,
            ...candidate,
            id: candidate.id ?? base.id,
            version: 2,
            updatedAt: new Date().toISOString(),
          },
        });
        return { ok: true };
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(safeStorage),
      // Only the profile is persisted; `hydrated` is runtime state and must
      // start false on every load so components can tell "no profile yet" from
      // "not read from storage yet". Rendering the signed-in view before
      // rehydration would flash the wrong UI and mismatch on hydration.
      partialize: (state) => ({ profile: state.profile }) as Partial<ProfileState>,
      onRehydrateStorage: () => (state) => state?.markHydrated(),
    },
  ),
);

/** Shared by the other persisted stores so they degrade the same way. */
export function safeStorageJson() {
  return createJSONStorage(safeStorage);
}

export function isComplete(profile: Profile | null): boolean {
  return !!profile && profile.completedSteps >= 4;
}
