#!/usr/bin/env node
/**
 * Serves the exported out/ directory the way GitHub Pages will.
 *
 * `next start` cannot run an exported site, and serving out/ at the filesystem
 * root would hide the one bug this preview exists to catch: assets are built
 * with a /masar-ai prefix, so anything served from / would 404 in a way that
 * production would not, or vice versa. This mounts the export under the same
 * base path Pages uses, so what you see here is what deploys.
 *
 *   node scripts/serve-out.mjs [port]
 */

import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";

const OUT = resolve(process.cwd(), "out");
const BASE = process.env.BASE_PATH ?? "/masar-ai";
const PORT = Number(process.argv[2] ?? 4173);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

if (!existsSync(OUT)) {
  console.error("out/ not found. Run `npm run build` first.");
  process.exit(1);
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  let path = decodeURIComponent(url.pathname);

  // Anything outside the base path gets redirected into it, mirroring the way
  // github.io only ever serves this project under its own sub-path.
  if (!path.startsWith(BASE)) {
    res.writeHead(302, { Location: BASE + (path === "/" ? "/" : path) });
    res.end();
    return;
  }
  path = path.slice(BASE.length) || "/";

  // normalize() collapses any ../ before it can escape the export directory.
  let file = join(OUT, normalize(path).replace(/^(\.\.[/\\])+/, ""));
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file) && existsSync(file + ".html")) file += ".html";

  if (!existsSync(file)) {
    res.writeHead(404, { "Content-Type": TYPES[".html"] });
    createReadStream(join(OUT, "404.html")).pipe(res);
    return;
  }

  res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
});

server.listen(PORT, () => {
  console.log(`Serving out/ at http://localhost:${PORT}${BASE}/`);
});
