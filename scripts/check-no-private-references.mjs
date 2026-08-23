#!/usr/bin/env node
/**
 * Fails if the repository references a private artifact — a tracker team or
 * issue key, a client organization or repository, a person, or a named deployed
 * environment. See CLAUDE.md, "No Private References".
 *
 * This is a pattern check, not a proof. It catches the shapes this repository
 * has actually leaked. When you find a new one, add a rule here rather than
 * fixing the single instance quietly: the rule was violated within an hour of
 * being written down, which is why it is enforced by a script and not by
 * memory.
 *
 * Node rather than a shell one-liner because two of the checks need a negative
 * lookahead (allow the `PROJ-` placeholder, reject every other issue-key shape)
 * and a real list of non-tracker false positives (`UTF-8`, `SHA-256`, ...).
 * `git grep -E` has no lookahead and git is not guaranteed to be built with
 * PCRE.
 *
 * Usage: node scripts/check-no-private-references.mjs
 * Exits 0 when clean, 1 with every offending line otherwise.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * This file necessarily contains every pattern it searches for, so it is the
 * one exempt path. Nothing else is exempt — there is no "internal only"
 * directory in an open-source repository.
 */
const SELF = "scripts/check-no-private-references.mjs";

/** Machine-written files, exempt from the shape heuristic only. */
const GENERATED = /(^|\/)package-lock\.json$/;

/**
 * Token shapes that look like an issue key but are not: encodings, hash and
 * cipher sizes, standards references. Matched case-sensitively against the
 * whole token, so `UTF-8` passes and `PROJ-8` does not.
 */
const NOT_TRACKER_KEYS = new Set([
  "UTF-8",
  "UTF-16",
  "UTF-32",
  "SHA-1",
  "SHA-256",
  "SHA-512",
  "MD-5",
  "AES-128",
  "AES-256",
  "RSA-2048",
  "HTTP-1",
  "HTTP-2",
  "HTTP-3",
  "ISO-8601",
  "ISO-3166",
  "ISO-4217",
  "RFC-1123",
  "RFC-3339",
  "RFC-7231",
  "IPV-4",
  "IPV-6",
  "AWS-4",
  "EC-2",
  "PKCS-1",
  "PKCS-8",
  "BASE-64",
  "CVE-2021",
  "CVE-2022",
  "CVE-2023",
  "CVE-2024",
  "CVE-2025",
  "CVE-2026",
]);

/** The approved placeholder issue-key prefix (CLAUDE.md's table). */
const PLACEHOLDER_KEY = /^PROJ-\d+$/;

const RULES = [
  {
    label: "tracker issue keys (use PROJ-<n> instead)",
    pattern: /\b(?:LET|PROJ|AIP|TARJAY|MGMT)-\d+\b/g,
  },
  {
    /**
     * The catch-all for key shapes not yet seen. Skips generated lock files:
     * their SPDX license identifiers (`BSD-3-Clause`, `MPL-2.0`, `CC-BY-4.0`)
     * are indistinguishable from an issue key by shape alone, and nothing in a
     * lock file is authored here — the named rules above still scan them, which
     * is what would catch a private package or registry.
     */
    label: "possible tracker issue key (only PROJ-<n> is allowed)",
    pattern: /\b[A-Z]{2,8}-\d{1,5}\b/g,
    ignore: (token) => NOT_TRACKER_KEYS.has(token) || PLACEHOLDER_KEY.test(token),
    skipGenerated: true,
  },
  {
    label: "client or engagement org / repo names",
    pattern:
      /Streamline[- ]?Payments|example-org|example-app|example-app|(?:Le|Team)[ -]?Tar[gj]|Targét|Example Payments|example-payments|Management\.[Ww]eb|example-web|PayNow|VirtualTerminal|virtualterminal/g,
  },
  {
    label: "people — names, emails, GitHub logins, tracker user ids",
    pattern:
      /example-login|example-login|example-login|Marroqu|the designer|V[aá]zquez|the developer|cvazquez|@kisasa\.io|00000000-0000-4000-8000-000000000001/g,
  },
  {
    /**
     * Bare first names. Added after a scrub that removed every full name and
     * email still left 68 first-name references in the design ledger — the
     * named-person rule above matched none of them, because attribution in
     * prose is almost always first-name-only ("the architect's own framing"
     * started life as a first name). Use the role, not the person.
     */
    label: "people — bare first names (use the role instead)",
    pattern: /\b(?:the architect|the designer|Jes[uú]s|the developer|the developer)\b/g,
  },
  {
    /**
     * Any `kisasa-`-prefixed resource name, not just the two seen first. The
     * narrow version of this rule missed `example-temporal-${env}` sitting four
     * lines from a name it did catch — which is the argument for the broad
     * shape over an enumeration.
     */
    label: "named deployed environments",
    pattern: /kisasa-[a-z]+|abc12/g,
  },
  {
    /**
     * Authorship credit in `README.md` and the project's own branding are
     * deliberate and allowed. A repo coordinate, email address, ARN or
     * namespace built from the same word is not.
     */
    label: "kisasa used as a coordinate rather than as authorship",
    pattern: /(?:github|gitlab)\/kisasa|kisasa\/[a-z]|["']kisasa["']/g,
  },
  {
    /**
     * The org name baked into a code identifier or filename. Added after the
     * first full sweep missed `BaseStack` and `stacks/base-stack.ts` — the
     * base class every infrastructure stack extends — because every other rule
     * looked for the word in a coordinate, an email or an ARN, never in
     * PascalCase or a kebab-case filename.
     */
    label: "org name used as a code identifier or filename",
    pattern: /Kisasa[A-Z]\w*|kisasa-[a-z]+\.ts/g,
  },
];

function trackedFiles() {
  const out = execFileSync("git", ["ls-files", "-z"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return out.split("\0").filter((path) => path.length > 0 && path !== SELF);
}

function isProbablyBinary(contents) {
  return contents.includes("\u0000");
}

function findings() {
  const found = [];

  for (const path of trackedFiles()) {
    let contents;
    try {
      contents = readFileSync(join(REPO_ROOT, path), "utf8");
    } catch {
      continue;
    }
    if (isProbablyBinary(contents)) continue;

    const generated = GENERATED.test(path);
    const lines = contents.split("\n");
    for (const rule of RULES) {
      if (rule.skipGenerated === true && generated) continue;
      lines.forEach((line, index) => {
        const matches = line.match(rule.pattern);
        if (matches === null) return;
        const offending = rule.ignore === undefined ? matches : matches.filter((m) => !rule.ignore(m));
        if (offending.length === 0) return;
        found.push({
          label: rule.label,
          path: path,
          line: index + 1,
          text: line.trim().slice(0, 160),
          tokens: [...new Set(offending)],
        });
      });
    }
  }

  return found;
}

const found = findings();

if (found.length === 0) {
  process.stdout.write("No private references found.\n");
  process.exit(0);
}

const byLabel = new Map();
for (const finding of found) {
  const bucket = byLabel.get(finding.label) ?? [];
  bucket.push(finding);
  byLabel.set(finding.label, bucket);
}

for (const [label, bucket] of byLabel) {
  process.stdout.write(`\n== ${label} — ${bucket.length} ==\n`);
  for (const finding of bucket) {
    process.stdout.write(`${finding.path}:${finding.line}: [${finding.tokens.join(", ")}] ${finding.text}\n`);
  }
}

process.stdout.write(
  `\n${found.length} private reference(s) found. See CLAUDE.md, "No Private References",\n` +
    "for the approved placeholders. Keep the observation, drop the anchor.\n",
);
process.exit(1);
