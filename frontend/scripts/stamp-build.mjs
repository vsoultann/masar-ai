#!/usr/bin/env node
/**
 * Writes the build id that the staleness check compares against.
 *
 * GitHub Pages serves HTML with `cache-control: max-age=600` and there is no
 * way to change that from a repository — no header config, no service worker
 * here to intercept it. A browser is therefore entitled to show a ten-minute-old
 * page, and an installed iOS web app holds one far longer than that. The
 * symptom is someone reading copy that was fixed and pushed hours ago and
 * reasonably concluding it was never fixed.
 *
 * So the app carries its own build id in two places: baked into the JS bundle
 * at build time, and in this file, which is fetched at runtime with
 * `cache: "no-store"`. If they disagree, the page running in the browser is
 * older than the one deployed, and `BuildVersionCheck` reloads once.
 *
 * The id is the commit SHA where one is available and the build timestamp
 * otherwise, so a local build still produces a changing value.
 */

import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function commitSha() {
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

const id = `${commitSha() ?? "local"}-${Date.now().toString(36)}`;
const dir = join(process.cwd(), "public");
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, "build-id.json"), `${JSON.stringify({ id }, null, 2)}\n`);
console.log(`stamped build id ${id}`);
