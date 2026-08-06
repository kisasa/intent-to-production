/**
 * Reads the target surface's repo base (host/org/repo/ref) from the epic's
 * comment thread, per specification-agent.md's tightened recording format:
 * one fixed-form line per surface, `Repo base — <surface>:
 * <host>/<org>/<repo>/<ref>`, surrounded by otherwise free prose. Searches
 * comments most-recent-first so a later correction wins over an earlier one.
 *
 * A missing repo base is a real pipeline-setup problem (the Specification
 * Agent should have established it before this epic's stories ever reached
 * To-Do) — not silently swallowed. Throws `ApplicationFailure.nonRetryable`
 * with a message actionable on its own (dispatchStoryWorkflow's own
 * catch-all posts it verbatim to the story — see post-dispatch-failed.ts;
 * this activity used to post its own comment too, which would have
 * double-posted once that catch-all existed). Non-retryable, not a plain
 * `Error`: Temporal's default retry policy retries a thrown activity for a
 * long time (up to 100 attempts by default), and retrying immediately can't
 * fix a human recording problem — better to fail the workflow once, visibly.
 */

import { ApplicationFailure } from "@temporalio/activity";
import { getIssue, linearApiUrl } from "../tracker.js";
import type { WorkerConfig } from "../worker-config.js";
import type { SpecialistType } from "./types.js";

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

export function createResolveRepoBaseActivity(config: WorkerConfig) {
  return async function resolveRepoBase(epicId: string, surface: SpecialistType): Promise<RepoBase> {
    const baseUrl = linearApiUrl();
    const epic = await getIssue(epicId, config.linearAgentApiKey, baseUrl);
    const base = parseRepoBase(epic.comments, surface);

    if (!base) {
      throw ApplicationFailure.nonRetryable(
        `No recorded repo base found for surface "${surface}" on epic ${epicId}. The architect needs to ` +
          `record one (see specification-agent.md's format) before this story can dispatch.`,
        "MissingRepoBase",
      );
    }

    return base;
  };
}
