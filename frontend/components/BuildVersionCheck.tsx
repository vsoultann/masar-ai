"use client";

import { useEffect } from "react";

import buildId from "@/public/build-id.json";
import { asset } from "@/lib/paths";

/**
 * Reloads once when the page in the browser is older than the one deployed.
 *
 * Why this exists: GitHub Pages sends `cache-control: max-age=600` on HTML and
 * a repository cannot change that. A browser may therefore serve a page that
 * is ten minutes stale, and an installed iOS web app will serve one that is
 * days stale. Copy that was fixed, pushed, and verified live still reads as
 * broken to the person looking at it — which is exactly what happened, twice,
 * and "hard-refresh" is an instruction rather than a fix.
 *
 * The mechanism is two copies of the same id. `build-id.json` is imported here,
 * so its value is baked into whichever JS bundle the browser is running;
 * `build-id.json` is also fetched at runtime with `cache: "no-store"`. A
 * mismatch means the bundle is older than the deployment, and the page reloads.
 *
 * Three things keep it from becoming a reload loop:
 *
 *  - the fetch is `no-store` *and* cache-busted by a query parameter, so a
 *    proxy cannot answer it with the same stale copy that caused the mismatch;
 *  - a sessionStorage key records the version already reloaded for, so a single
 *    deployment can only ever trigger one reload per tab;
 *  - any failure — offline, blocked storage, malformed JSON — is swallowed and
 *    leaves the page alone. A staleness check must never be the reason a page
 *    does not work.
 */

const RELOADED_KEY = "masar.reloadedFor";

export default function BuildVersionCheck() {
  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const response = await fetch(`${asset("/build-id.json")}?t=${Date.now()}`, {
          cache: "no-store",
        });
        if (!response.ok || cancelled) return;

        const live = (await response.json()) as { id?: string };
        if (!live.id || live.id === buildId.id || cancelled) return;

        // One reload per deployment per tab, whatever else happens.
        let alreadyReloaded: string | null = null;
        try {
          alreadyReloaded = sessionStorage.getItem(RELOADED_KEY);
        } catch {
          // Private windows throw on access; treat it as "not yet reloaded"
          // and rely on the id comparison, which is still correct.
        }
        if (alreadyReloaded === live.id) return;

        try {
          sessionStorage.setItem(RELOADED_KEY, live.id);
        } catch {
          /* see above */
        }
        window.location.reload();
      } catch {
        // Offline, or the file is not there yet on a dev server. Either way the
        // page is fine as it is.
      }
    };

    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
