/**
 * Reads every one of the story's surfaces' repo bases (host/org/repo/ref)
 * from the epic's comment thread, per specification-agent.md's tightened
 * recording format: one fixed-form line per surface, `Repo base — <surface>:
 * <host>/<org>/<repo>/<ref>`, surrounded by otherwise free prose. Searches
 * comments most-recent-first so a later correction wins over an earlier one.
 *
 * A story may carry more than one `surface:` label (docs/design-ledger.md,
 * 2026-08-08), but only when they all resolve to the same repo and ref —
 * decomposition is supposed to enforce that when the story is created, but
 * this is also where the old `SUPPORTED_SPECIALIST_TYPES` check used to
 * live, and its replacement is this: validating each labeled surface
 * against what the epic actually recorded, rather than against a hardcoded
 * union. That's a strictly better check — it catches a story assigned to a
 * surface the epic never recorded, instead of rejecting a valid surface
 * missing from a fixed list.
 *
 * A missing or mismatched repo base is a real pipeline-setup problem (the
 * Specification Agent should have established it, and Decompose should
 * have kept every multi-surface story same-repo, before this epic's stories
 * ever reached To-Do) — not silently swallowed. Throws
 * `ApplicationFailure.nonRetryable` with a message actionable on its own
 * (dispatchStoryWorkflow's own catch-all posts it verbatim to the story —
 * see post-dispatch-failed.ts; this activity used to post its own comment
 * too, which would have double-posted once that catch-all existed).
 * Non-retryable, not a plain `Error`: Temporal's default retry policy
 * retries a thrown activity for a long time (up to 100 attempts by
 * default), and retrying immediately can't fix a human recording problem —
 * better to fail the workflow once, visibly.
 */

import { ApplicationFailure } from "@temporalio/activity";
import { getIssue, linearApiUrl } from "../tracker.js";
import type { WorkerConfig } from "../worker-config.js";
import type { Surface } from "./types.js";

export interface RepoBase {
  readonly host: string;
  readonly org: string;
  readonly repo: string;
  readonly ref: string;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Rejects a matched line that is the Specification Agent's own format
 * instruction, not a recorded answer — confirmed live (PROJ-58, 2026-08-06):
 * the kickoff question that asks the architect to record a repo base
 * necessarily *shows* the exact format it wants back, e.g. `` `Repo base —
 * frontend: <host>/<org>/<repo>/<ref>` (e.g. `Repo base — frontend:
 * github/example-org/example-app/main`) ``, which a plain "find this pattern
 * anywhere in the comments" scan cannot distinguish from a real answer — it
 * matched the placeholder itself as `host`/`org`/etc. This is a permanent
 * structural hazard, not a one-off: every epic's thread carries this same
 * instructional text forever, since it's baked into Specification's own
 * kickoff prompt. Two independent signals reject it: the placeholder's
 * angle brackets (never valid in a real host/org/repo/ref) and the word
 * "e.g." on the same line (the fabricated example always sits next to it,
 * in this real case on that very same line as the placeholder).
 */
function isTemplateLine(line: string, host: string, org: string, repo: string, ref: string): boolean {
  if (/[<>]/.test(`${host}${org}${repo}${ref}`)) return true;
  if (/\be\.?g\.?\b/i.test(line)) return true;
  return false;
}

export function parseRepoBase(comments: string[], surface: string): RepoBase | null {
  // Excludes the backtick from every segment, not just "/" and whitespace —
  // this agent always writes the recorded line as a backtick-wrapped code
  // span, so a greedy `\S+` on the final (ref) segment previously captured
  // the closing backtick as part of the value (confirmed live: a real
  // ".../dev`" leaked a trailing backtick into `ref`, harmless-looking until
  // it broke a GitHub branch lookup).
  const pattern = new RegExp(
    `Repo base\\s*—\\s*${escapeRegExp(surface)}:\\s*([^/\\s\`]+)/([^/\\s\`]+)/([^/\\s\`]+)/([^\\s\`]+)`,
    "i",
  );

  for (let i = comments.length - 1; i >= 0; i--) {
    const comment = comments[i];
    if (comment === undefined) continue;

    for (const line of comment.split("\n")) {
      const match = pattern.exec(line);
      if (!match) continue;
      const [, host, org, repo, ref] = match;
      if (!host || !org || !repo || !ref) continue;
      if (isTemplateLine(line, host, org, repo, ref)) continue;
      return { host, org, repo, ref };
    }
  }
  return null;
}

/**
 * Finds a line that was plainly an attempt at recording this surface's repo
 * base but didn't match `parseRepoBase`'s strict pattern — loose on purpose
 * (just "repo base" and the surface name, both normalized), since the whole
 * point is to catch typos in the part `parseRepoBase` is strict about (the
 * colon, the dash character, the segment count). Confirmed live: an
 * architect posted `Repo base — management-web — github/org/repo/main` (em
 * dash where the format wants a colon) and the resulting failure comment
 * gave no hint that a line existed at all, let alone what was wrong with it.
 * Returns the raw line so the failure message can quote it back verbatim —
 * seeing your own typo is faster than re-deriving it from a rule.
 */
function findMalformedCandidateLine(comments: string[], surface: string): string | null {
  const surfaceNormalized = normalizeForComparison(surface);
  for (let i = comments.length - 1; i >= 0; i--) {
    const comment = comments[i];
    if (comment === undefined) continue;
    for (const line of comment.split("\n")) {
      const normalized = normalizeForComparison(line);
      if (normalized.includes("repobase") && normalized.includes(surfaceNormalized)) {
        return line.trim();
      }
    }
  }
  return null;
}

function normalizeForComparison(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function formatExample(surface: string): string {
  return `\`Repo base — ${surface}: <host>/<org>/<repo>/<ref>\` (e.g. \`Repo base — ${surface}: github/example-org/example-app/main\`)`;
}

export type ResolveCommonRepoBaseResult =
  | { readonly ok: true; readonly repoBase: RepoBase }
  | { readonly ok: false; readonly reason: string };

function repoBasesEqual(a: RepoBase, b: RepoBase): boolean {
  return a.host === b.host && a.org === b.org && a.repo === b.repo && a.ref === b.ref;
}

function formatRepoBase(base: RepoBase): string {
  return `${base.host}/${base.org}/${base.repo}/${base.ref}`;
}

/**
 * The pure decision at this activity's core, split out so it's testable
 * without mocking `getIssue` — same pattern as `parseRepoBase` itself and
 * `check-dependencies.ts`'s `parseBlockingDependencyIds`. Resolves every
 * surface independently against the same comment set, then requires they
 * all agree: one story, one branch, one PR means one repo base, however
 * many surface labels got it there.
 */
export function resolveCommonRepoBase(comments: string[], surfaces: Surface[]): ResolveCommonRepoBaseResult {
  const resolved = surfaces.map((surface) => ({ surface: surface, base: parseRepoBase(comments, surface) }));

  const missing = resolved.filter((r) => r.base === null).map((r) => r.surface);
  if (missing.length > 0) {
    const guidance = missing
      .map((surface) => {
        const malformed = findMalformedCandidateLine(comments, surface);
        return malformed
          ? `- ${surface}: found \`${malformed}\`, which doesn't match the required format. Expected ${formatExample(surface)}`
          : `- ${surface}: expected ${formatExample(surface)}`;
      })
      .join("\n");

    return {
      ok: false,
      reason: `No recorded repo base found for surface(s): ${missing.join(", ")}. The architect needs to ` +
        `record one (see specification-agent.md's format) before this story can dispatch.\n\n${guidance}`,
    };
  }

  const bases = resolved.map((r) => r.base as RepoBase);
  const first = bases[0];
  if (!first) {
    // Unreachable in practice — story-context.ts never produces an empty
    // surfaces array — but a clear failure beats an undefined dereference.
    return { ok: false, reason: "Story carries no surfaces to resolve a repo base for." };
  }

  const mismatched = resolved.filter((r) => !repoBasesEqual(r.base as RepoBase, first));
  if (mismatched.length > 0) {
    const detail = resolved.map((r) => `${r.surface}: ${formatRepoBase(r.base as RepoBase)}`).join("; ");
    return {
      ok: false,
      reason: `This story's surfaces resolve to different repo bases (${detail}) — they must all resolve to ` +
        `the same repo and ref. Decomposition should not have assigned them together.`,
    };
  }

  return { ok: true, repoBase: first };
}

export function createResolveRepoBaseActivity(config: WorkerConfig) {
  return async function resolveRepoBase(epicId: string, surfaces: Surface[]): Promise<RepoBase> {
    const baseUrl = linearApiUrl();
    const epic = await getIssue(epicId, config.linearAgentApiKey, baseUrl);
    const result = resolveCommonRepoBase(epic.comments, surfaces);

    if (!result.ok) {
      throw ApplicationFailure.nonRetryable(`Epic ${epicId}: ${result.reason}`, "MissingRepoBase");
    }

    return result.repoBase;
  };
}
