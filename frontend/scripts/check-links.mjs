#!/usr/bin/env node
/**
 * Checks every outbound URL in the catalogs.
 *
 * Why this is a script and not part of `validate-data`: it needs the network,
 * and a build that fails because a ministry's web server was slow on a Tuesday
 * is a build nobody trusts. So this runs on demand — `npm run check:links` —
 * and prints a report.
 *
 * What it is actually protecting against is not the 404. It is the *redirect*:
 * a government domain that quietly starts forwarding to a login page, or a
 * ministry that is renamed and 301s to a new one. Both still return 200, and
 * both send a student somewhere useless. That is why the report flags any URL
 * whose final address is not the one the catalog holds, and why it flags a
 * landing page in the wrong language: a student reading the English site who
 * clicks "official page" and lands on an Arabic student portal has been sent
 * to the wrong place, even though nothing errored.
 *
 * Many of these hosts block non-browser clients outright, so a failure here is
 * a prompt to check by hand, not proof the link is dead. Nothing exits non-zero
 * except a genuine 4xx/5xx.
 */

import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DATA = join(process.cwd(), "public", "data");
const read = (name) => JSON.parse(readFileSync(join(DATA, name), "utf8"));

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
  + "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

const targets = [
  ...read("scholarships.json").map((row) => ({
    kind: "scholarship", id: row.id, url: row.website,
  })),
  ...read("universities.json").map((row) => ({
    kind: "university", id: row.id, url: row.website,
  })),
];

const same = (a, b) => a.replace(/\/+$/, "") === b.replace(/\/+$/, "");

/** A landing page that switched language is a link to the wrong page. */
const languageDrift = (from, to) =>
  !/\/ar(\/|$)|[?&]lang=ar/i.test(from) && /\/ar(\/|$)|[?&]lang=ar/i.test(to);

/*
 * curl, not fetch.
 *
 * Node's fetch failed on 51 of 87 of these hosts while curl with the same
 * user-agent got 200s from most of them — older TLS stacks and HTTP/2 quirks
 * on government and university servers. A checker whose default answer is
 * "unreachable" is a checker nobody reads, so it uses the client that works.
 */
function check({ kind, id, url }) {
  return new Promise((resolve) => {
    execFile(
      "curl",
      ["-sL", "-o", "/dev/null", "-w", "%{http_code}|%{url_effective}",
        "--max-time", "20", "--compressed", "-A", UA, url],
      { timeout: 25000 },
      (error, stdout) => {
        const [code, final] = String(stdout || "0|").split("|");
        resolve({
          kind,
          id,
          url,
          status: Number(code) || 0,
          final: final || url,
          error: error ? String(error.message).split("\n")[0] : undefined,
        });
      },
    );
  });
}

const results = [];
// Ten at a time: enough to finish in under a minute, gentle enough that no
// host sees this as a burst.
for (let index = 0; index < targets.length; index += 10) {
  results.push(...await Promise.all(targets.slice(index, index + 10).map(check)));
}

/*
 * 403 and friends are bot protection, not a dead link.
 *
 * dewa.gov.ae, space.gov.ae and visitdubai.com all refuse a scripted client
 * and serve a browser perfectly well. Reporting those as broken -- and exiting
 * non-zero on them -- would mean the check cried wolf on its first run and was
 * never run again.
 */
const BLOCKED = new Set([401, 403, 405, 406, 429, 503]);
const broken = results.filter((row) => row.status >= 400 && !BLOCKED.has(row.status));
const blocked = results.filter((row) => BLOCKED.has(row.status));
const unreachable = results.filter((row) => row.status === 0);
const redirected = results.filter(
  (row) => row.status >= 200 && row.status < 400 && !same(row.url, row.final),
);
const drifted = redirected.filter((row) => languageDrift(row.url, row.final));

const report = (title, rows, detail = true) => {
  if (rows.length === 0) return;
  console.log(`\n${title} (${rows.length})`);
  for (const row of rows) {
    console.log(`  ${row.kind} ${row.id}\n    ${row.url}`
      + (detail ? `\n    -> ${row.final}${row.error ? ` (${row.error})` : ""}` : ""));
  }
};

report("Language drift — English link lands on an Arabic page", drifted);
report("Broken", broken);
report("Redirected (check the destination is still the right page)",
  redirected.filter((row) => !drifted.includes(row)));
report("Blocked a scripted client (bot protection — almost certainly fine in a "
  + "browser)", blocked, false);
report("Unreachable from here — most of these block non-browser clients, "
  + "so check by hand rather than assuming they are dead", unreachable, false);

const ok = results.length - broken.length - blocked.length - unreachable.length
  - redirected.length;
console.log(
  `\nchecked ${results.length} links — ${ok} clean, ${redirected.length} redirected, `
  + `${blocked.length} bot-blocked, ${unreachable.length} unreachable, `
  + `${broken.length} broken`,
);

if (broken.length > 0) process.exit(1);
