# Decisions

Choices that are not obvious from reading the code, and the reasoning behind
them. Entries are append-only: a superseded decision is marked, not deleted, so
the record still explains why the code looked the way it did.

---

## v2 — re-targeting to GitHub Pages

### D-01 · The base path differs between development and production

**Decision.** `basePath` is `/masar-ai` when `NODE_ENV=production` and empty in
development.

**Why.** GitHub Pages serves the project from `https://<user>.github.io/masar-ai/`,
so production genuinely needs the prefix. Applying it in development too would
make `http://localhost:3000` a 404, which is a poor first experience for anyone
cloning the repo — and it was a real complaint during this project.

**The risk this creates, and the mitigation.** An asymmetry like this invites the
classic Pages failure: hardcoded `/images/x.jpg` works locally and 404s in
production. Three things guard against it:

1. `lib/paths.ts` exposes `asset()`, and everything under `/public` must go
   through it.
2. `npm run predeploy:check` fails the build on any absolute asset literal that
   is not wrapped in `asset()`. It is wired into `npm run build`, so it cannot
   be forgotten.
3. `npm start` serves the export under the real `/masar-ai` prefix, so the
   production preview reproduces Pages rather than approximating it.

The guard is tested: introducing a violating file makes the check exit 1.

### D-02 · The locale redirect is a static file, not middleware

**Decision.** `middleware.ts` is deleted. `public/index.html` performs the
locale redirect in the browser.

**Why.** Next.js middleware requires a server; `output: 'export'` has none, and
the build fails outright with middleware present. The replacement reads
`localStorage` then `navigator.languages`, so an Arabic speaker still lands on
`/ar/` rather than bouncing through English.

**Why a hand-written file rather than an `app/page.tsx`.** A root page needs a
root layout, and `app/[locale]/layout.tsx` already renders `<html>` with the
per-locale `lang` and `dir`. Introducing a second root layout to serve one
redirect was more machinery than the job deserves. As a plain file in `public/`
it is copied to `out/index.html` verbatim.

Every URL in that file is **relative** (`en/`, not `/en/`), which makes it
correct under both `/` and `/masar-ai/` without knowing the base path — the one
place in the project that genuinely cannot use `asset()`.

### D-03 · Canvas for two background themes, SVG for the third

**Decision.** Desert Dunes and Constellation Network are `<canvas>`. Arabesque
Bloom is SVG with a CSS rotation. The specification asked for animated SVG paths
for the arabesque; the other two are a deliberate substitution.

**Why.** Dunes and Constellation are particle systems — hundreds of moving
points, redrawn every frame. As DOM nodes that is hundreds of style
recalculations per frame; on a canvas it is one draw call loop. Arabesque is the
opposite: a handful of stroked paths doing a slow rotation, where SVG plus a CSS
keyframe costs no JavaScript per frame at all. Each medium does what it is
actually good at.

**Guards.** One `requestAnimationFrame` loop; cancelled outright on
`visibilitychange` so a hidden tab costs nothing; particle count scaled to
viewport area; capped at 30fps when `hardwareConcurrency <= 4`; and under
`prefers-reduced-motion` no canvas is created at all — a static gradient renders
instead, so there is no loop left spinning behind an accessibility setting.

### D-04 · Catalog access is split in two

**Decision.** `lib/data/build.ts` imports the catalog JSON directly and is for
server components only. `lib/data/client.ts` fetches the same files over HTTP
and is for everything else.

**Why.** `generateStaticParams` needs the career ids at build time, which means
importing the JSON. But an import pulls the file into the importing bundle, and
`careers.json` alone is 137 KB — importing it from a client component would put
the entire catalog into the JS bundle and blow the 250 KB budget. Fetching at
runtime keeps it out of the bundle and lets the browser cache the data
separately from the application code.

`client.ts` caches in-flight promises rather than only settled ones, so several
components mounting in the same tick share one request instead of starting
several.

### D-05 · The FastAPI backend stays in the repository

**Decision.** `backend/` is kept, with its 89 tests, but is no longer part of
the deployment path. The joins it used to perform — expanding a career's sector,
skill and initiative ids — moved to `hydrateCareer()` in `lib/data/client.ts`.

**Why.** It is a substantial and working piece of the project's engineering
record, and deleting it would erase evidence of work rather than retire it. It
also remains the honest answer to "how would this scale beyond a static host",
which is a fair question in a defense. Keeping it costs nothing: static export
simply never calls it.

**Superseded:** v1's runtime architecture (Next.js → FastAPI → SQLite). See
`docs/ARCHITECTURE.md` for the current shape.

### D-06 · The migration runs on a branch

**Decision.** v2 is built on `v2-static-pages`. `main` keeps the working v1
application.

**Why.** This migration leaves the tree broken between phases — the ML port
lands before the pages that consume it. `main` stays green and runnable
throughout, so there is never a window where the project cannot be demonstrated.
