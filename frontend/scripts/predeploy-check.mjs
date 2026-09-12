#!/usr/bin/env node
/**
 * Fails the build on the three things that silently break a GitHub Pages
 * deployment but look completely fine in `next dev`.
 *
 *  1. Absolute asset paths. In development the site is served from /, so
 *     "/images/x.jpg" resolves. In production it is served from /masar-ai/,
 *     and that same string 404s. Everything under /public must go through
 *     asset() from lib/paths.ts.
 *  2. Server-only APIs. `output: 'export'` silently has no server, so a route
 *     handler, server action or force-dynamic page either fails the export or,
 *     worse, exports an empty shell.
 *  3. Committed secrets. The repository is public.
 *  4. Bare <a> tags pointing at an app route. next/link applies basePath;
 *     a raw anchor does not, so href="/en/universities/x" resolves to
 *     github.io/en/... instead of github.io/masar-ai/en/... and lands on
 *     GitHub's own "Site not found" page. That is the bug the map popups
 *     shipped with, and it is invisible in `next dev` because basePath is
 *     empty there.
 *
 * Run with --out to additionally scan the built out/ directory for absolute
 * /_next/ references, which is the symptom of a wrong assetPrefix.
 */

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative, extname } from "node:path";

const ROOT = process.cwd();
const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  "out",
  ".git",
  "coverage",
  "scripts",
]);
const CODE_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);

/** Directories that exist under /public and therefore need the base path. */
const PUBLIC_PREFIXES = [
  "/images/",
  "/data/",
  "/model/",
  "/fonts/",
  "/icons/",
  "/media/",
];

const problems = [];

function walk(dir, onFile) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const info = statSync(full);
    if (info.isDirectory()) walk(full, onFile);
    else onFile(full);
  }
}

/** lib/paths.ts is the helper itself; its docs necessarily name raw paths. */
const SELF_EXEMPT = new Set(["lib/paths.ts"]);

/** Comments describe paths all the time; only real code should be flagged. */
function isComment(line) {
  const trimmed = line.trim();
  return (
    trimmed.startsWith("//") ||
    trimmed.startsWith("*") ||
    trimmed.startsWith("/*")
  );
}

function checkSource(file) {
  const ext = extname(file);
  if (!CODE_EXT.has(ext)) return;
  const rel = relative(ROOT, file).split("\\").join("/");
  const text = readFileSync(file, "utf8");
  const lines = text.split("\n");

  lines.forEach((line, index) => {
    const at = `${rel}:${index + 1}`;
    if (isComment(line)) return;

    // 1. Absolute asset paths not wrapped in asset().
    //
    // `asset-ok` is a deliberate, greppable opt-out for the one legitimate
    // case: a literal handed to <SmartImage>, which applies asset() itself
    // because most of its inputs are catalog paths arriving at runtime rather
    // than literals in code. Wrapping such a literal here would double the
    // prefix and produce /masar-ai/masar-ai/images/...
    const optedOut = line.includes("asset-ok");
    if (!optedOut && !SELF_EXEMPT.has(rel)) for (const prefix of PUBLIC_PREFIXES) {
      const quoted = new RegExp(`["'\`]${prefix.replace("/", "\\/")}`);
      if (quoted.test(line) && !line.includes("asset(")) {
        problems.push(
          `${at}  absolute asset path "${prefix}..." -- wrap it in asset() from lib/paths.ts`,
        );
        break;
      }
    }

    // 2. Server-only APIs.
    if (/^\s*["']use server["']/.test(line)) {
      problems.push(`${at}  "use server" is not supported by static export`);
    }
    if (/export\s+const\s+dynamic\s*=\s*["']force-dynamic["']/.test(line)) {
      problems.push(`${at}  force-dynamic cannot be statically exported`);
    }
    if (/from\s+["']next\/headers["']/.test(line)) {
      problems.push(`${at}  next/headers is a server API`);
    }

    // 3. Secrets. Values, not names -- NEXT_PUBLIC_* config is fine.
    if (
      /(sk-ant-[A-Za-z0-9_-]{16,}|gh[ps]_[A-Za-z0-9]{30,}|AKIA[0-9A-Z]{16})/.test(
        line,
      )
    ) {
      problems.push(`${at}  looks like a committed credential`);
    }
  });

  // 4. Internal links on a bare <a>.
  //
  // Comments are stripped first: this file's own prose, and the warning
  // comment in UniversityMap, both name the paths they are warning about.
  // Crude stripping is fine here -- it can only ever cause a missed catch on a
  // pathological line, never a false alarm.
  if (ext === ".tsx" || ext === ".jsx") {
    const code = text
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "");
    // href={`/...`} or href="/..." -- but not "//host" and not href={asset(...)}.
    const anchor = /<a\s[^>]*?href=(?:\{`|["'])\/(?!\/)/g;
    let hit;
    while ((hit = anchor.exec(code)) !== null) {
      const line = code.slice(0, hit.index).split("\n").length;
      problems.push(
        `${rel}:${line}  <a href="/..."> to an app route -- use next/link, which applies basePath`,
      );
    }
  }

  // Route handlers are server-only regardless of contents.
  if (/(^|[\\/])app[\\/].*[\\/]route\.(ts|js)$/.test(rel)) {
    problems.push(`${rel}  route handlers require a server`);
  }
}

walk(ROOT, checkSource);

if (existsSync(join(ROOT, "middleware.ts"))) {
  problems.push("middleware.ts  middleware does not run under output: 'export'");
}

// Optional post-build pass.
if (process.argv.includes("--out")) {
  const out = join(ROOT, "out");
  if (!existsSync(out)) {
    problems.push("out/  not found -- run `next build` first");
  } else {
    if (!existsSync(join(out, ".nojekyll"))) {
      problems.push(
        "out/.nojekyll  missing -- GitHub Pages will drop the _next/ folder",
      );
    }
    if (!existsSync(join(out, "404.html"))) {
      problems.push("out/404.html  missing -- deep links will hard-404");
    }
    const expected = process.env.EXPECTED_BASE_PATH ?? "/masar-ai";
    const index = join(out, "index.html");
    if (existsSync(index)) {
      const html = readFileSync(index, "utf8");
      const bad = html.match(/(src|href)="\/_next\//);
      if (bad) {
        problems.push(
          `out/index.html  references /_next/ without the ${expected} prefix -- assetPrefix is wrong`,
        );
      }
    }
  }
}

if (problems.length > 0) {
  console.error("\npredeploy:check failed\n");
  for (const problem of problems) console.error("  " + problem);
  console.error(`\n${problems.length} problem(s).\n`);
  process.exit(1);
}

console.log("predeploy:check passed");
